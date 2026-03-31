const http = require("http");
const tls = require("tls");
const PORT = 8889;

function imapConnect(server, port, email, password) {
  return new Promise((resolve, reject) => {
    const conn = tls.connect(port, server, { rejectUnauthorized: false });
    let tag = 0;
    let dataHandler = null;

    conn.on("data", (d) => { if (dataHandler) dataHandler(d.toString()); });
    conn.on("error", reject);

    conn.on("secureConnect", () => {
      // Wait for greeting
      dataHandler = () => {
        dataHandler = null;
        // Now send login
        const cmd = (command) => new Promise((res) => {
          tag++;
          let buf = "";
          const t = `A${tag}`;
          dataHandler = (chunk) => {
            buf += chunk;
            if (buf.includes(`${t} OK`) || buf.includes(`${t} NO`) || buf.includes(`${t} BAD`)) {
              dataHandler = null;
              res(buf);
            }
          };
          conn.write(`${t} ${command}\r\n`);
          setTimeout(() => { if (dataHandler) { dataHandler = null; res(buf); } }, 10000);
        });

        cmd(`LOGIN ${email} ${password}`).then((r) => {
          if (r.match(/^Ad+ NO/m) || r.match(/^Ad+ BAD/m)) {
            conn.destroy();
            reject(new Error("Login failed: " + r.substring(0, 100)));
          } else {
            resolve({ cmd, close: () => conn.destroy() });
          }
        });
      };
    });

    setTimeout(() => reject(new Error("Timeout")), 15000);
  });
}

async function handleTest(p) {
  const imap = await imapConnect(p.imap_server || "mail.fajarmitra.co.id", p.imap_port || 993, p.email, p.password);
  await imap.cmd("LOGOUT");
  imap.close();
  return { success: true };
}

async function handleInbox(p) {
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    const sel = await imap.cmd("SELECT INBOX");
    const total = parseInt(sel.match(/(\d+) EXISTS/)?.[1] || "0");
    if (!total) { await imap.cmd("LOGOUT"); imap.close(); return { messages: [], total: 0, page: p.page||1, perPage: p.perPage||20 }; }
    const pp = p.perPage || 20;
    const pg = p.page || 1;
    const end = Math.max(1, total - (pg - 1) * pp);
    const start = Math.max(1, end - pp + 1);
    const f = await imap.cmd(`FETCH ${start}:${end} (FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
    const msgs = [];
    const blocks = f.split(/\* (\d+) FETCH/);
    for (let i = 1; i < blocks.length; i += 2) {
      const num = parseInt(blocks[i]);
      const b = blocks[i + 1] || "";
      msgs.push({
        num,
        from: b.match(/From:\s*(.+)/i)?.[1]?.trim() || "",
        to: b.match(/To:\s*(.+)/i)?.[1]?.trim() || "",
        subject: b.match(/Subject:\s*(.+)/i)?.[1]?.trim() || "(Tanpa Subjek)",
        date: b.match(/Date:\s*(.+)/i)?.[1]?.trim() || "",
        seen: (b.match(/FLAGS \(([^)]*)\)/)?.[1] || "").includes("\Seen"),
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
    const s = r.indexOf("\r\n") + 2;
    const e = r.lastIndexOf("\r\n)");
    return { raw: r.substring(s, e > s ? e : undefined) };
  } catch (e) { imap.close(); throw e; }
}

async function handleSend(p) {
  return new Promise((resolve, reject) => {
    const conn = tls.connect(p.smtp_port, p.smtp_server, { rejectUnauthorized: false }, () => {
      const send = (cmd) => new Promise((res) => {
        conn.write(cmd + "\r\n");
        conn.once("data", (d) => res(d.toString()));
        setTimeout(() => res(""), 5000);
      });
      (async () => {
        try {
          await new Promise(r => conn.once("data", () => r()));
          await send("EHLO famika");
          await send("AUTH LOGIN");
          await send(Buffer.from(p.email).toString("base64"));
          const a = await send(Buffer.from(p.password).toString("base64"));
          if (!a.includes("235")) throw new Error("SMTP auth failed");
          await send(`MAIL FROM:<${p.email}>`);
          await send(`RCPT TO:<${p.to}>`);
          await send("DATA");
          const msg = `From: ${p.email}\r\nTo: ${p.to}\r\nSubject: ${p.subject}\r\nContent-Type: text/plain; charset=UTF-8\r\nDate: ${new Date().toUTCString()}\r\n\r\n${p.body}\r\n.`;
          const r = await send(msg);
          await send("QUIT"); conn.destroy();
          resolve({ success: r.includes("250") });
        } catch (e) { conn.destroy(); reject(e); }
      })();
    });
    conn.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  if (req.method === "GET") { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({status:"ok"})); }

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
      else { res.writeHead(400); return res.end(JSON.stringify({error:"Unknown action"})); }
      res.writeHead(200, {"Content-Type":"application/json"});
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error("Error:", e.message);
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({error: e.message}));
    }
  });
});

server.listen(PORT, () => console.log(`Email proxy running on port ${PORT}`));
