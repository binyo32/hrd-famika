const http = require("http");
const tls = require("tls");
const PORT = 8889;

/* ─── MIME Decoder ─── */

function decodeQP(str) {
  return str.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeB64(str) {
  try { return Buffer.from(str.replace(/\s/g, ""), "base64").toString("utf-8"); } catch { return str; }
}

function decodeHeader(raw) {
  if (!raw) return "";
  return raw.replace(/\r?\n\s+/g, " ").replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, cs, enc, data) => {
    if (enc.toUpperCase() === "B") return Buffer.from(data, "base64").toString("utf-8");
    if (enc.toUpperCase() === "Q") return data.replace(/=([0-9A-Fa-f]{2})/g, (__, h) => String.fromCharCode(parseInt(h, 16))).replace(/_/g, " ");
    return data;
  });
}

function parseSender(from) {
  const d = decodeHeader(from || "");
  const m = d.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
  return m ? { name: m[1].trim(), email: (m[2] || "").trim() } : { name: d, email: d };
}

function parseEmail(raw) {
  if (!raw) return { text: "", html: "", subject: "", from: "", to: "", date: "" };
  const si = raw.indexOf("\r\n\r\n");
  if (si === -1) return { text: raw, html: "", subject: "", from: "", to: "", date: "" };

  const hdr = raw.substring(0, si);
  const body = raw.substring(si + 4);

  // Parse headers (handle multi-line)
  const h = {};
  let ck = "";
  for (const line of hdr.split(/\r?\n/)) {
    if (/^\s/.test(line) && ck) { h[ck] += " " + line.trim(); }
    else { const m = line.match(/^([\w-]+):\s*(.*)/); if (m) { ck = m[1].toLowerCase(); h[ck] = m[2]; } }
  }

  const ct = h["content-type"] || "text/plain";
  const cte = (h["content-transfer-encoding"] || "").toLowerCase();
  const bm = ct.match(/boundary="?([^";\s]+)"?/);

  let textContent = "", htmlContent = "";

  // Simple approach: find ALL text/plain and text/html sections by regex
  if (bm) {
    // Find text/plain content
    const textMatch = raw.match(/Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:[\w-]+:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\)?\s*$)/i);
    if (textMatch) {
      let t = textMatch[1].trim();
      // Check if it was QP or base64
      const beforeText = raw.substring(0, raw.indexOf(textMatch[0]) + 200).toLowerCase();
      if (beforeText.includes("quoted-printable")) t = decodeQP(t);
      else if (beforeText.includes("base64")) t = decodeB64(t);
      textContent = t;
    }

    // Find text/html content
    const htmlMatch = raw.match(/Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[\w-]+:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\)?\s*$)/i);
    if (htmlMatch) {
      let h = htmlMatch[1].trim();
      const beforeHtml = raw.substring(0, raw.indexOf(htmlMatch[0]) + 200).toLowerCase();
      if (beforeHtml.includes("quoted-printable")) h = decodeQP(h);
      else if (beforeHtml.includes("base64")) h = decodeB64(h);
      htmlContent = h;
    }
  } else {
    let b = body;
    if (cte.includes("quoted-printable")) b = decodeQP(b);
    else if (cte.includes("base64")) b = decodeB64(b);
    if (ct.includes("text/html") || b.includes("<html") || b.includes("<HTML")) htmlContent = b;
    else textContent = b;
  }

  return {
    text: textContent, html: htmlContent,
    subject: decodeHeader(h.subject || ""),
    from: decodeHeader(h.from || ""),
    to: decodeHeader(h.to || ""),
    date: h.date || "",
  };
}

/* ─── IMAP ─── */

function imapConnect(server, port, email, password) {
  return new Promise((resolve, reject) => {
    const conn = tls.connect(port, server, { rejectUnauthorized: false });
    let tag = 0, dataHandler = null;
    conn.on("data", (d) => { if (dataHandler) dataHandler(d.toString()); });
    conn.on("error", reject);
    conn.on("secureConnect", () => {
      dataHandler = () => {
        dataHandler = null;
        const cmd = (c) => new Promise((res) => {
          tag++; let buf = ""; const t = `A${tag}`;
          dataHandler = (ch) => { buf += ch; if (buf.match(new RegExp(`^${t} (OK|NO|BAD)`, "m"))) { dataHandler = null; res(buf); } };
          conn.write(`${t} ${c}\r\n`);
          setTimeout(() => { if (dataHandler) { dataHandler = null; res(buf); } }, 15000);
        });
        cmd(`LOGIN ${email} ${password}`).then((r) => {
          if (r.match(/^A\d+ (NO|BAD)/m)) { conn.destroy(); reject(new Error("Login failed")); }
          else resolve({ cmd, close: () => conn.destroy() });
        });
      };
    });
    setTimeout(() => reject(new Error("Timeout")), 20000);
  });
}

async function handleTest(p) {
  const imap = await imapConnect(p.imap_server || "mail.fajarmitra.co.id", p.imap_port || 993, p.email, p.password);
  await imap.cmd("LOGOUT"); imap.close();
  return { success: true };
}

async function handleInbox(p) {
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    const sel = await imap.cmd("SELECT INBOX");
    const total = parseInt(sel.match(/(\d+) EXISTS/)?.[1] || "0");
    if (!total) { await imap.cmd("LOGOUT"); imap.close(); return { messages: [], total: 0 }; }
    const pp = p.perPage || 20, pg = p.page || 1;
    const end = Math.max(1, total - (pg - 1) * pp);
    const start = Math.max(1, end - pp + 1);
    const f = await imap.cmd(`FETCH ${start}:${end} (FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
    const msgs = [];
    const blocks = f.split(/\* (\d+) FETCH/);
    for (let i = 1; i < blocks.length; i += 2) {
      const num = parseInt(blocks[i]), b = blocks[i + 1] || "";
      const rawFrom = b.match(/From:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
      const rawSubject = b.match(/Subject:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
      const sender = parseSender(rawFrom);
      msgs.push({
        num,
        from: sender.name,
        fromEmail: sender.email,
        subject: decodeHeader(rawSubject) || "(Tanpa Subjek)",
        date: b.match(/Date:\s*(.+)/i)?.[1]?.trim() || "",
        seen: (b.match(/FLAGS \(([^)]*)\)/)?.[1] || "").includes("\\Seen"),
      });
    }
    msgs.reverse();
    await imap.cmd("LOGOUT"); imap.close();
    return { messages: msgs, total, page: pg, perPage: pp };
  } catch (e) { imap.close(); throw e; }
}

async function handleRead(p) {
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd("SELECT INBOX");
    const r = await imap.cmd(`FETCH ${p.msgNum} (BODY[])`);
    await imap.cmd("LOGOUT"); imap.close();
    const s = r.indexOf("\r\n") + 2, e = r.lastIndexOf("\r\n)");
    const rawEmail = r.substring(s, e > s ? e : undefined);
    return { parsed: parseEmail(rawEmail) };
  } catch (e) { imap.close(); throw e; }
}

async function handleSend(p) {
  return new Promise((resolve, reject) => {
    const conn = tls.connect(p.smtp_port, p.smtp_server, { rejectUnauthorized: false }, () => {
      const send = (c) => new Promise((res) => { conn.write(c + "\r\n"); conn.once("data", (d) => res(d.toString())); setTimeout(() => res(""), 5000); });
      (async () => {
        try {
          await new Promise(r => conn.once("data", () => r()));
          await send("EHLO famika"); await send("AUTH LOGIN");
          await send(Buffer.from(p.email).toString("base64"));
          const a = await send(Buffer.from(p.password).toString("base64"));
          if (!a.includes("235")) throw new Error("SMTP auth failed");
          await send(`MAIL FROM:<${p.email}>`); await send(`RCPT TO:<${p.to}>`); await send("DATA");
          const msg = `From: ${p.email}\r\nTo: ${p.to}\r\nSubject: ${p.subject}\r\nContent-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0\r\nDate: ${new Date().toUTCString()}\r\n\r\n${p.body}\r\n.`;
          const r = await send(msg); await send("QUIT"); conn.destroy();
          resolve({ success: r.includes("250") });
        } catch (e) { conn.destroy(); reject(e); }
      })();
    });
    conn.on("error", reject);
  });
}

/* ─── HTTP Server ─── */

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  if (req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ status: "ok" })); }
  let body = "";
  req.on("data", (c) => body += c);
  req.on("end", async () => {
    try {
      const { action, ...rest } = JSON.parse(body);
      let result;
      if (action === "test") result = await handleTest(rest);
      else if (action === "inbox") result = await handleInbox(rest);
      else if (action === "read") result = await handleRead(rest);
      else if (action === "send") result = await handleSend(rest);
      else { res.writeHead(400); return res.end(JSON.stringify({ error: "Unknown action" })); }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error("Error:", e.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => console.log(`Email proxy running on port ${PORT}`));
