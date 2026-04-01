const http = require("http");
const tls = require("tls");
const PORT = 8889;

/* ─── MIME Helpers ─── */

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

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function decodeBody(body, encoding) {
  const enc = (encoding || "").toLowerCase().trim();
  if (enc.includes("base64")) return decodeB64(body);
  if (enc.includes("quoted-printable")) return decodeQP(body);
  return body;
}

function parsePartHeaders(str) {
  const h = {};
  let k = "";
  for (const line of str.split(/\r?\n/)) {
    if (/^\s/.test(line) && k) h[k] += " " + line.trim();
    else { const m = line.match(/^([\w-]+):\s*(.*)/); if (m) { k = m[1].toLowerCase(); h[k] = m[2]; } }
  }
  return h;
}

function getFilename(headers) {
  const cd = headers["content-disposition"] || "";
  let m = cd.match(/filename\*\s*=\s*[^']*'[^']*'([^;\s]+)/i);
  if (m) try { return decodeURIComponent(m[1]); } catch { return m[1]; }
  m = cd.match(/filename\s*=\s*"?([^";\r\n]+)"?/i);
  if (m) return decodeHeader(m[1].trim());
  const ct = headers["content-type"] || "";
  m = ct.match(/name\s*=\s*"?([^";\r\n]+)"?/i);
  if (m) return decodeHeader(m[1].trim());
  return null;
}

/* ─── Recursive MIME Parser ─── */

function parseMimePart(raw) {
  let si = raw.indexOf("\r\n\r\n");
  if (si === -1) {
    si = raw.indexOf("\n\n");
    if (si === -1) return { headers: parsePartHeaders(raw), body: "", parts: [] };
    return { headers: parsePartHeaders(raw.substring(0, si)), body: raw.substring(si + 2), parts: [] };
  }
  const headers = parsePartHeaders(raw.substring(0, si));
  const body = raw.substring(si + 4);
  const ct = headers["content-type"] || "";
  const bm = ct.match(/boundary="?([^";\s]+)"?/);

  if (bm) {
    const boundary = bm[1];
    const sections = body.split("--" + boundary);
    const parts = [];
    for (let i = 1; i < sections.length; i++) {
      if (sections[i].trimStart().startsWith("--")) break;
      parts.push(parseMimePart(sections[i].replace(/^\r?\n/, "")));
    }
    return { headers, body: "", parts };
  }
  return { headers, body, parts: [] };
}

function extractContent(part) {
  let text = "", html = "";
  const attachments = [];

  if (part.parts.length > 0) {
    for (const sub of part.parts) {
      const r = extractContent(sub);
      if (!text && r.text) text = r.text;
      if (!html && r.html) html = r.html;
      attachments.push(...r.attachments);
    }
  } else {
    const ct = (part.headers["content-type"] || "text/plain").toLowerCase();
    const cte = (part.headers["content-transfer-encoding"] || "").toLowerCase();
    const cd = (part.headers["content-disposition"] || "").toLowerCase();
    const cid = (part.headers["content-id"] || "").replace(/[<>]/g, "");
    const filename = getFilename(part.headers);
    const body = (part.body || "").replace(/\r?\n$/, "");

    const isAttach = cd.includes("attachment");
    const isFileByName = filename && !ct.startsWith("text/plain") && !ct.startsWith("text/html");
    const isNonText = !ct.startsWith("text/");
    const hasInlineMedia = (cd.includes("inline") || !!cid) && isNonText;

    if (isAttach || isFileByName) {
      attachments.push({
        filename: filename || "attachment", contentType: ct.split(";")[0].trim(),
        encoding: cte, data: body, contentId: cid, inline: false,
        size: cte.includes("base64") ? Math.floor(body.replace(/\s/g, "").length * 3 / 4) : body.length,
      });
    } else if (hasInlineMedia) {
      attachments.push({
        filename: filename || "inline", contentType: ct.split(";")[0].trim(),
        encoding: cte, data: body, contentId: cid, inline: true,
        size: cte.includes("base64") ? Math.floor(body.replace(/\s/g, "").length * 3 / 4) : body.length,
      });
    } else if (ct.startsWith("text/html")) {
      html = decodeBody(body, cte);
    } else if (ct.startsWith("text/plain")) {
      text = decodeBody(body, cte);
    } else if (body.length > 0 && isNonText) {
      attachments.push({
        filename: filename || "file", contentType: ct.split(";")[0].trim(),
        encoding: cte, data: body, contentId: cid, inline: false,
        size: cte.includes("base64") ? Math.floor(body.replace(/\s/g, "").length * 3 / 4) : body.length,
      });
    }
  }
  return { text, html, attachments };
}

function parseEmail(raw) {
  if (!raw) return { text: "", html: "", subject: "", from: "", to: "", cc: "", date: "", attachments: [] };

  const root = parseMimePart(raw);
  const content = extractContent(root);

  // Replace CID references in HTML with inline data URIs
  let html = content.html;
  if (html && content.attachments.length) {
    for (const att of content.attachments) {
      if (att.contentId && att.data) {
        const clean = att.data.replace(/\s/g, "");
        const b64 = att.encoding.includes("base64") ? clean : Buffer.from(clean).toString("base64");
        html = html.replace(new RegExp(`cid:${escapeRegex(att.contentId)}`, "gi"), `data:${att.contentType};base64,${b64}`);
      }
    }
  }

  const attachments = content.attachments.map((a, i) => ({
    index: i, filename: a.filename, contentType: a.contentType, size: a.size, inline: a.inline,
    data: a.data ? (a.encoding.includes("base64") ? a.data.replace(/\s/g, "") : Buffer.from(a.data).toString("base64")) : null,
  }));

  return {
    text: content.text, html,
    subject: decodeHeader(root.headers.subject || ""),
    from: decodeHeader(root.headers.from || ""),
    to: decodeHeader(root.headers.to || ""),
    cc: decodeHeader(root.headers.cc || ""),
    date: root.headers.date || "",
    attachments,
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
          setTimeout(() => { if (dataHandler) { dataHandler = null; res(buf); } }, 45000);
        });
        // IMAP APPEND: 2-step (send cmd → wait "+" → send literal data → wait OK)
        const append = (folder, flags, message) => new Promise((res) => {
          tag++; const t = `A${tag}`;
          const msgBuf = Buffer.from(message, "utf-8");
          let phase = 0, buf = "";
          dataHandler = (ch) => {
            buf += ch;
            if (phase === 0 && buf.includes("+")) {
              phase = 1; buf = "";
              conn.write(msgBuf); conn.write(Buffer.from("\r\n"));
            } else if (phase === 1 && buf.match(new RegExp(`^${t} (OK|NO|BAD)`, "m"))) {
              dataHandler = null; res(buf);
            }
          };
          conn.write(`${t} APPEND "${folder}" (${flags}) {${msgBuf.length}}\r\n`);
          setTimeout(() => { if (dataHandler) { dataHandler = null; res(buf); } }, 15000);
        });
        cmd(`LOGIN ${email} ${password}`).then((r) => {
          if (r.match(/^A\d+ (NO|BAD)/m)) { conn.destroy(); reject(new Error("Login failed")); }
          else resolve({ cmd, append, close: () => conn.destroy() });
        });
      };
    });
    setTimeout(() => reject(new Error("Timeout")), 20000);
  });
}

/* ─── Helper: parse FETCH blocks ─── */

function parseFetchBlocks(raw) {
  const msgs = [];
  const blocks = raw.split(/\* (\d+) FETCH/);
  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i]), b = blocks[i + 1] || "";
    const uid = parseInt(b.match(/UID (\d+)/)?.[1] || "0");
    const flags = b.match(/FLAGS \(([^)]*)\)/)?.[1] || "";
    const rawFrom = b.match(/From:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
    const rawSubject = b.match(/Subject:\s*([\s\S]*?)(?=\r?\n[\w-]+:|\r?\n\))/i)?.[1]?.replace(/\r?\n\s+/g, " ").trim() || "";
    const sender = parseSender(rawFrom);
    msgs.push({
      num, uid,
      from: sender.name, fromEmail: sender.email,
      subject: decodeHeader(rawSubject) || "(Tanpa Subjek)",
      date: b.match(/Date:\s*(.+)/i)?.[1]?.trim() || "",
      seen: flags.includes("\\Seen"),
      flagged: flags.includes("\\Flagged"),
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
        } catch { folders.push({ name, total: 0, unseen: 0 }); }
      }
    }
    // Add "ALL" virtual folder with totals
    const allTotal = folders.reduce((s, f) => s + f.total, 0);
    const allUnseen = folders.reduce((s, f) => s + f.unseen, 0);
    folders.unshift({ name: "ALL", total: allTotal, unseen: allUnseen });

    await imap.cmd("LOGOUT"); imap.close();
    return { folders };
  } catch (e) { imap.close(); throw e; }
}

async function handleInbox(p) {
  const folder = p.folder || "INBOX";

  // ALL MAIL: fetch from all folders, merge and sort by date
  if (folder === "ALL") {
    const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
    try {
      const lr = await imap.cmd('LIST "" "*"');
      const folderNames = [];
      for (const line of lr.split("\r\n")) {
        const m = line.match(/\* LIST \(([^)]*)\) "([^"]*)" (.+)/);
        if (m && !m[1].includes("\\Noselect")) folderNames.push(m[3].replace(/^"(.*)"$/, "$1"));
      }
      let allMsgs = [];
      for (const fn of folderNames) {
        try {
          const sel = await imap.cmd(`SELECT "${fn}"`);
          const total = parseInt(sel.match(/(\d+) EXISTS/)?.[1] || "0");
          if (!total) continue;
          const end = total, start = Math.max(1, total - 19); // last 20 per folder
          const f = await imap.cmd(`FETCH ${start}:${end} (UID FLAGS BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE)])`);
          const msgs = parseFetchBlocks(f);
          msgs.forEach(m => { m.folder = fn; });
          allMsgs.push(...msgs);
        } catch {}
      }
      await imap.cmd("LOGOUT"); imap.close();
      // Sort by date descending
      allMsgs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const pp = p.perPage || 20, pg = p.page || 1;
      const start = (pg - 1) * pp;
      return { messages: allMsgs.slice(start, start + pp), total: allMsgs.length, page: pg, perPage: pp };
    } catch (e) { imap.close(); throw e; }
  }

  // Single folder
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

async function handleAttachment(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const r = await imap.cmd(`UID FETCH ${p.uid} (BODY[])`);
    await imap.cmd("LOGOUT"); imap.close();
    const s = r.indexOf("\r\n") + 2, e = r.lastIndexOf("\r\n)");
    const rawEmail = r.substring(s, e > s ? e : undefined);

    const root = parseMimePart(rawEmail);
    const content = extractContent(root);
    const att = content.attachments[p.index];
    if (!att) return { error: "Attachment not found" };

    const clean = att.data.replace(/\s/g, "");
    const b64 = att.encoding.includes("base64") ? clean : Buffer.from(clean).toString("base64");
    return { filename: att.filename, contentType: att.contentType, data: b64 };
  } catch (e) { imap.close(); throw e; }
}

function buildMimeMessage(p) {
  const date = new Date().toUTCString();
  const hasAttachments = p.attachments && p.attachments.length > 0;
  const isHtml = p.html;
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  let msg = `From: ${p.email}\r\nTo: ${p.to}\r\n`;
  if (p.cc) msg += `Cc: ${p.cc}\r\n`;
  msg += `Subject: ${p.subject}\r\nMIME-Version: 1.0\r\nDate: ${date}\r\n`;

  if (!hasAttachments && !isHtml) {
    // Plain text only
    msg += `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    msg += Buffer.from(p.body, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
  } else if (!hasAttachments && isHtml) {
    // HTML + plain text fallback (multipart/alternative)
    msg += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
    msg += `--${altBoundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    msg += Buffer.from(p.body, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
    msg += `\r\n--${altBoundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    msg += Buffer.from(p.html, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
    msg += `\r\n--${altBoundary}--`;
  } else {
    // With attachments (multipart/mixed)
    msg += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    // Body part
    if (isHtml) {
      msg += `--${boundary}\r\nContent-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
      msg += `--${altBoundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      msg += Buffer.from(p.body, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
      msg += `\r\n--${altBoundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      msg += Buffer.from(p.html, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
      msg += `\r\n--${altBoundary}--`;
    } else {
      msg += `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      msg += Buffer.from(p.body, "utf-8").toString("base64").match(/.{1,76}/g).join("\r\n");
    }
    // Attachment parts
    for (const att of p.attachments) {
      const ct = att.contentType || "application/octet-stream";
      const fn = att.filename || "file";
      const data = att.data; // already base64
      msg += `\r\n--${boundary}\r\nContent-Type: ${ct}; name="${fn}"\r\nContent-Disposition: attachment; filename="${fn}"\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
      msg += data.match(/.{1,76}/g).join("\r\n");
    }
    msg += `\r\n--${boundary}--`;
  }
  return msg;
}

async function handleSend(p) {
  const rawMsg = buildMimeMessage(p);

  // 1) Send via SMTP
  await new Promise((resolve, reject) => {
    const conn = tls.connect(p.smtp_port, p.smtp_server, { rejectUnauthorized: false }, () => {
      const send = (c) => new Promise((res) => { conn.write(c + "\r\n"); conn.once("data", (d) => res(d.toString())); setTimeout(() => res(""), 5000); });
      (async () => {
        try {
          await new Promise(r => conn.once("data", () => r()));
          await send("EHLO famika"); await send("AUTH LOGIN");
          await send(Buffer.from(p.email).toString("base64"));
          const a = await send(Buffer.from(p.password).toString("base64"));
          if (!a.includes("235")) throw new Error("SMTP auth failed");
          await send(`MAIL FROM:<${p.email}>`);
          await send(`RCPT TO:<${p.to}>`);
          if (p.cc) for (const addr of p.cc.split(",").map(s => s.trim()).filter(Boolean)) await send(`RCPT TO:<${addr}>`);
          if (p.bcc) for (const addr of p.bcc.split(",").map(s => s.trim()).filter(Boolean)) await send(`RCPT TO:<${addr}>`);
          await send("DATA");
          const r = await send(rawMsg + "\r\n."); await send("QUIT"); conn.destroy();
          if (!r.includes("250")) throw new Error("SMTP send failed");
          resolve();
        } catch (e) { conn.destroy(); reject(e); }
      })();
    });
    conn.on("error", reject);
  });

  // 2) Save copy to Sent folder via IMAP APPEND
  try {
    const imap = await imapConnect(p.imap_server || "mail.fajarmitra.co.id", p.imap_port || 993, p.email, p.password);
    for (const sent of ["INBOX.Sent", "Sent"]) {
      const r = await imap.append(sent, "\\Seen", rawMsg);
      if (r.match(/^A\d+ OK/m)) break;
    }
    await imap.cmd("LOGOUT"); imap.close();
  } catch (e) {
    console.error("Failed to save to Sent:", e.message);
  }

  return { success: true };
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
  const uids = p.uids || (p.uid ? [p.uid] : []);
  if (!uids.length) return { success: false };
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const uidStr = uids.join(",");
    if (!folder.toLowerCase().includes("trash")) {
      for (const trash of ["INBOX.Trash", "Trash"]) {
        const r = await imap.cmd(`UID COPY ${uidStr} "${trash}"`);
        if (r.match(/^A\d+ OK/m)) break;
      }
    }
    await imap.cmd(`UID STORE ${uidStr} +FLAGS (\\Deleted)`);
    await imap.cmd("EXPUNGE");
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

async function handleMark(p) {
  const folder = p.folder || "INBOX";
  const uids = p.uids || (p.uid ? [p.uid] : []);
  if (!uids.length) return { success: false };
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const flag = p.seen ? "+FLAGS (\\Seen)" : "-FLAGS (\\Seen)";
    await imap.cmd(`UID STORE ${uids.join(",")} ${flag}`);
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

async function handleStar(p) {
  const folder = p.folder || "INBOX";
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const flag = p.flagged ? "+FLAGS (\\Flagged)" : "-FLAGS (\\Flagged)";
    await imap.cmd(`UID STORE ${p.uid} ${flag}`);
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

async function handleMove(p) {
  const folder = p.folder || "INBOX";
  const uids = p.uids || (p.uid ? [p.uid] : []);
  if (!uids.length) return { success: false };
  const imap = await imapConnect(p.imap_server, p.imap_port, p.email, p.password);
  try {
    await imap.cmd(`SELECT "${folder}"`);
    const uidStr = uids.join(",");
    let r = await imap.cmd(`UID COPY ${uidStr} "${p.destination}"`);
    if (r.match(/^A\d+ NO/m)) {
      await imap.cmd(`CREATE "${p.destination}"`);
      await imap.cmd(`UID COPY ${uidStr} "${p.destination}"`);
    }
    await imap.cmd(`UID STORE ${uidStr} +FLAGS (\\Deleted)`);
    await imap.cmd("EXPUNGE");
    await imap.cmd("LOGOUT"); imap.close();
    return { success: true };
  } catch (e) { imap.close(); throw e; }
}

/* ─── HTTP Server ─── */

const handlers = {
  test: handleTest, folders: handleFolders, inbox: handleInbox,
  read: handleRead, send: handleSend, search: handleSearch,
  delete: handleDelete, mark: handleMark, star: handleStar, move: handleMove,
  attachment: handleAttachment,
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
