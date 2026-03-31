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

  if (bm) {
    const textMatch = raw.match(/Content-Type:\s*text\/plain[^\r\n]*\r?\n(?:[\w-]+:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\)?\s*$)/i);
    if (textMatch) {
      let t = textMatch[1].trim();
      const beforeText = raw.substring(0, raw.indexOf(textMatch[0]) + 200).toLowerCase();
      if (beforeText.includes("quoted-printable")) t = decodeQP(t);
      else if (beforeText.includes("base64")) t = decodeB64(t);
      textContent = t;
    }

    const htmlMatch = raw.match(/Content-Type:\s*text\/html[^\r\n]*\r?\n(?:[\w-]+:[^\r\n]*\r?\n)*\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\)?\s*$)/i);
    if (htmlMatch) {
      let hh = htmlMatch[1].trim();
      const beforeHtml = raw.substring(0, raw.indexOf(htmlMatch[0]) + 200).toLowerCase();
      if (beforeHtml.includes("quoted-printable")) hh = decodeQP(hh);
      else if (beforeHtml.includes("base64")) hh = decodeB64(hh);
      htmlContent = hh;
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

/* ─── Helper: parse FETCH blocks into message array ─── */

function parseFetchBlocks(raw) {
  const msgs = [];
  const blocks = raw.split(/\* (\d+) FETCH/);
  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i]), b = blocks[i + 1] || "";
    const uid = parseInt(b.match(/UID (\d+)/)?.[1] || "0");
    const rawFrom = b.match(/From:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
    const rawSubject = b.match(/Subject:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
    const sender = parseSender(rawFrom);
    msgs.push({
      num, uid,
      from: sender.name,
      fromEmail: sender.email,
      subject: decodeHeader(rawSubject) || "(Tanpa Subjek)",
      date: b.match(/Date:\s*(.+)/i)?.[1]?.trim() || "",
      seen: (b.match(/FLAGS \(([^)]*)\)/)?.[1] || "").includes("\\Seen"),
    });
  }
  return msgs;
}

/* ─── Handlers ─── */

async function handleTest(p) {
  const imap = await imapConnect(p.imap_server || "mail.fajarmitra.co.id", p.imap_port || 993, p.email, p.password);
  await imap.cmd("LOGOUT"); imap.close();
  return { success: true };
}

async function handleFolders(p) {
  const imap = await imapConnect(p.imap_server || "mail.fajarmitra.co.id", p.imap_port || 993, p.email, p.password);
  try {
    const r = await imap.cmd('LIST "" "*"');
    const folders = [];
    for (const line of r.split("\r\n")) {
      const m = line.match(/\* LIST \(([^)]*)\) "([^"]*)" (.+)/);
      if (m) {
        if (m[1].includes("\\Noselect")) continue;
        let name = m[3].replace(/^"(.*)"$/, "$1");
        try {
          const st = await imap.cmd(`STATUS "${name}" (MESSAGES UNSEEN)`);
          const total = parseInt(st.match(/MESSAGES (\d+)/)?.[1] || "0");
          const unseen = parseInt(st.match(/UNSEEN (\d+)/)?.[1] || "0");
          folders.push({ name, total, unseen });
        } catch {
          folders.push({ name, total: 0, unseen: 0 });
        }
      }
    }
    await imap.cmd("LOGOUT"); imap.close();
    return { folders };
  } catch (e) { imap.close(); throw e; }
}

async function handleInbox(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    const sel = await imap.cmd(`SELECT "${folder}"`);
    const total = parseInt(sel.match(/(\d+) EXISTS/)?.[1] || "0");
    if (!total) { await imap.cmd("LOGOUT"); imap.close(); return { messages: [], total: 0 }; }
    const pp = p.perPage || 20, pg = p.page || 1;
    const end = Math.max(1, total - (pg - 1) * pp);
    const start = Math.max(1, end - pp + 1);
    const f = await imap.cmd(`FETCH ${start}:${end} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
    const msgs = parseFetchBlocks(f);
    msgs.reverse();
    await imap.cmd("LOGOUT"); imap.close();
    return { messages: msgs, total, page: pg, perPage: pp };
  } catch (e) { imap.close(); throw e; }
}

async function handleRead(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const cmd = p.uid ? `UID FETCH ${p.uid} (BODY[])` : `FETCH ${p.msgNum} (BODY[])`;
    const r = await imap.cmd(cmd);
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

async function handleSearch(p) {
  const folder = p.folder || "INBOX";
  const query = (p.query || "").replace(/"/g, '\\"');
  if (!query) return { messages: [], total: 0 };
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const r = await imap.cmd(`UID SEARCH TEXT "${query}"`);
    const match = r.match(/\* SEARCH([\d\s]*)/);
    const uids = match && match[1].trim() ? match[1].trim().split(/\s+/).map(Number).reverse() : [];
    if (!uids.length) { await imap.cmd("LOGOUT"); imap.close(); return { messages: [], total: 0 }; }

    const pp = p.perPage || 20, pg = p.page || 1;
    const si = (pg - 1) * pp;
    const pageUids = uids.slice(si, si + pp);
    if (!pageUids.length) { await imap.cmd("LOGOUT"); imap.close(); return { messages: [], total: uids.length, page: pg, perPage: pp }; }

    const f = await imap.cmd(`UID FETCH ${pageUids.join(",")} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
    const msgs = parseFetchBlocks(f);
    msgs.sort((a, b) => b.uid - a.uid);
    await imap.cmd("LOGOUT"); imap.close();
    return { messages: msgs, total: uids.length, page: pg, perPage: pp };
  } catch (e) { imap.close(); throw e; }
}

async function handleDelete(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    // If not in Trash, move to Trash first
    if (!folder.toLowerCase().includes("trash")) {
      for (const trash of ["INBOX.Trash", "Trash"]) {
        const r = await imap.cmd(`UID COPY ${p.uid} "${trash}"`);
        if (r.match(/^A\d+ OK/m)) break;
      }
    }
    await imap.cmd(`UID STORE ${p.uid} +FLAGS (\\Deleted)`);
    await imap.cmd("EXPUNGE");
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

async function handleMark(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const flag = p.seen ? "+FLAGS (\\Seen)" : "-FLAGS (\\Seen)";
    await imap.cmd(`UID STORE ${p.uid} ${flag}`);
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

async function handleMove(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    let r = await imap.cmd(`UID COPY ${p.uid} "${p.destination}"`);
    if (r.match(/^A\d+ NO/m)) {
      await imap.cmd(`CREATE "${p.destination}"`);
      await imap.cmd(`UID COPY ${p.uid} "${p.destination}"`);
    }
    await imap.cmd(`UID STORE ${p.uid} +FLAGS (\\Deleted)`);
    await imap.cmd("EXPUNGE");
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

/* ─── HTTP Server ─── */

const handlers = {
  test: handleTest, folders: handleFolders, inbox: handleInbox,
  read: handleRead, send: handleSend, search: handleSearch,
  delete: handleDelete, mark: handleMark, move: handleMove,
};

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
      if (!handlers[action]) { res.writeHead(400); return res.end(JSON.stringify({ error: "Unknown action: " + action })); }
      const result = await handlers[action](rest);
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
