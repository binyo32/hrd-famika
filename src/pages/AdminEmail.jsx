import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Send, Inbox, RefreshCw, ArrowLeft, Loader2,
  Eye, EyeOff, CheckCircle, XCircle, PenSquare, X, LogOut, Search,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const EMAIL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-proxy`;

/* ─── Utils ─── */

function decodeSubject(raw) {
  if (!raw) return "(Tanpa Subjek)";
  try {
    // Decode =?UTF-8?B?...?= (Base64)
    let s = raw.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_, b64) => atob(b64));
    // Decode =?UTF-8?Q?...?= (Quoted-Printable)
    s = s.replace(/=\?UTF-8\?Q\?([^?]+)\?=/gi, (_, qp) =>
      qp.replace(/=([0-9A-F]{2})/gi, (__, hex) => String.fromCharCode(parseInt(hex, 16)))
         .replace(/_/g, " ")
    );
    return s || "(Tanpa Subjek)";
  } catch { return raw; }
}

function parseSender(from) {
  if (!from) return { name: "Unknown", email: "" };
  const match = from.match(/"?([^"<]+)"?\s*<?([^>]*)>?/);
  if (match) return { name: match[1].trim(), email: match[2]?.trim() || "" };
  return { name: from, email: from };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function getInitial(name) {
  return (name || "?")[0].toUpperCase();
}

const COLORS = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500"];
function getColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function parseEmailBody(raw) {
  if (!raw) return { text: "", html: "" };

  // Find boundary for multipart
  const boundaryMatch = raw.match(/boundary="?([^"\r\n]+)"?/i);

  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split("--" + boundary);
    let textPart = "";
    let htmlPart = "";

    for (const part of parts) {
      if (part.includes("Content-Type: text/plain")) {
        const bodyStart = part.indexOf("\r\n\r\n");
        if (bodyStart > -1) textPart = part.substring(bodyStart + 4).trim();
      }
      if (part.includes("Content-Type: text/html")) {
        const bodyStart = part.indexOf("\r\n\r\n");
        if (bodyStart > -1) htmlPart = part.substring(bodyStart + 4).trim();
      }
    }

    // Decode quoted-printable if needed
    if (textPart.includes("Content-Transfer-Encoding: quoted-printable") || textPart.includes("=\r\n")) {
      textPart = textPart.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }
    if (htmlPart.includes("=\r\n") || htmlPart.includes("=3D")) {
      htmlPart = htmlPart.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }

    return { text: textPart, html: htmlPart };
  }

  // Simple email - no multipart
  const headerEnd = raw.indexOf("\r\n\r\n");
  const body = headerEnd > -1 ? raw.substring(headerEnd + 4) : raw;

  // Check if HTML
  if (body.includes("<html") || body.includes("<HTML") || body.includes("<div") || body.includes("<p>")) {
    return { text: "", html: body };
  }

  return { text: body, html: "" };
}

function parseHeaders(raw) {
  if (!raw) return {};
  const headers = {};
  const headerSection = raw.split("\r\n\r\n")[0] || "";
  const lines = headerSection.split("\r\n");
  let currentKey = "";
  for (const line of lines) {
    const match = line.match(/^([\w-]+):\s*(.+)/);
    if (match) {
      currentKey = match[1].toLowerCase();
      headers[currentKey] = match[2].trim();
    } else if (currentKey && line.startsWith(" ")) {
      headers[currentKey] += " " + line.trim();
    }
  }
  return headers;
}

/* ─── API Hook ─── */

function useEmailApi() {
  return useCallback(async (action, params = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(EMAIL_FN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ action, ...params }),
    });
    return await res.json();
  }, []);
}

/* ─── Setup Form ─── */

function EmailSetup({ onDone, api }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const r = await api("test", { email, password, imap_server: "mail.fajarmitra.co.id", imap_port: 993 });
    setTestResult(r.success ? "ok" : "fail");
    setTesting(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await api("save-config", { email, password });
    setSaving(false);
    onDone();
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card className="p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Hubungkan Email</h2>
          <p className="text-sm text-muted-foreground">Masukkan email perusahaan untuk mulai</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <Input placeholder="nama@fajarmitra.co.id" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <Input type={showPw ? "text" : "password"} placeholder="Password email" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">Server: mail.fajarmitra.co.id | IMAP: 993 (SSL)</p>

        <AnimatePresence>
          {testResult && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center justify-center gap-2 text-sm py-2 rounded-lg ${testResult === "ok" ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-red-600 bg-red-50 dark:bg-red-950/30"}`}>
              {testResult === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult === "ok" ? "Koneksi berhasil!" : "Gagal. Cek email & password."}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={!email || !password || testing} className="flex-1">
            {testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Test Koneksi
          </Button>
          <Button onClick={handleSave} disabled={!email || !password || testResult !== "ok" || saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Hubungkan
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Compose ─── */

function ComposeDialog({ onClose, onSend, sending, replyTo }) {
  const [to, setTo] = useState(replyTo?.email || "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
  const [body, setBody] = useState("");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-card rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-lg sm:mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Email Baru</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-2">
          <Input placeholder="Kepada" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm" />
          <Input placeholder="Subjek" value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm" />
          <Textarea placeholder="Tulis email..." rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="resize-none text-sm" />
        </div>
        <div className="flex justify-between items-center px-4 py-3 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" onClick={() => onSend({ to, subject, body })} disabled={!to || !subject || !body || sending}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Kirim
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Email Viewer ─── */

function EmailViewer({ data, onBack, onReply }) {
  const { text = "", html = "", subject = "", from: rawFrom = "", to = "", date = "" } = data || {};
  const sender = parseSender(rawFrom);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(`<html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, sans-serif; font-size: 14px; line-height: 1.6; color: #333; margin: 16px; }
        img { max-width: 100%; height: auto; }
        a { color: #2563eb; }
      </style></head><body>${html}</body></html>`);
      doc.close();
      // Auto-resize iframe
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.style.height = doc.body.scrollHeight + 40 + "px";
        }
      }, 300);
    }
  }, [html]);

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Button>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-5 space-y-4 border-b">
          <h2 className="text-lg font-semibold">{subject || "(Tanpa Subjek)"}</h2>
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-full ${getColor(sender.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {getInitial(sender.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{sender.name}</p>
                <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {sender.email}{to ? ` → ${to}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {html ? (
            <iframe ref={iframeRef} className="w-full border-0 min-h-[200px]" sandbox="allow-same-origin" title="email" />
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{text || "(Tidak ada isi)"}</pre>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onReply({ email: sender.email, subject })} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Balas
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Main ─── */

export default function AdminEmail() {
  const api = useEmailApi();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [readingMsg, setReadingMsg] = useState(null);
  const [readData, setReadData] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => { const r = await api("get-config"); setConfig(r.config); setLoading(false); })();
  }, [api]);

  const loadInbox = useCallback(async (pg = 1) => {
    setLoadingInbox(true); setPage(pg);
    const r = await api("inbox", { page: pg, perPage: 20 });
    setInbox(r); setLoadingInbox(false);
  }, [api]);

  useEffect(() => { if (config) loadInbox(); }, [config, loadInbox]);

  const readEmail = async (msgNum) => {
    setReadingMsg(msgNum);
    const r = await api("read", { msgNum });
    setReadData(r.parsed);
    setReadingMsg(null);
  };

  const handleSend = async ({ to, subject, body }) => {
    setSending(true);
    await api("send", { to, subject, body });
    setSending(false); setShowCompose(false); setReplyTo(null);
    loadInbox(page);
  };

  const handleReply = (info) => { setReplyTo(info); setShowCompose(true); };

  const handleDisconnect = async () => { await api("delete-config"); setConfig(null); setInbox(null); };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div></Layout>;
  if (!config) return <Layout><EmailSetup onDone={() => window.location.reload()} api={api} /></Layout>;

  // Reading email
  if (readData) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <EmailViewer data={readData} onBack={() => setReadData(null)} onReply={handleReply} />
        </div>
      </Layout>
    );
  }

  const totalPages = inbox ? Math.ceil(inbox.total / 20) : 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Inbox</h1>
              <p className="text-xs text-muted-foreground">{config.email} {inbox ? `· ${inbox.total} email` : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => loadInbox(page)} disabled={loadingInbox} className="h-9 w-9">
              <RefreshCw className={`h-4 w-4 ${loadingInbox ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => { setReplyTo(null); setShowCompose(true); }}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <PenSquare className="h-3.5 w-3.5" /> Tulis
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-9 w-9 text-muted-foreground" title="Putuskan email">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Inbox List */}
        <Card className="overflow-hidden">
          {loadingInbox && !inbox ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Memuat inbox...</span>
            </div>
          ) : !inbox?.messages?.length ? (
            <div className="text-center py-16">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Inbox kosong</p>
            </div>
          ) : (
            <>
              {inbox.messages.map((msg, i) => {
                const subject = decodeSubject(msg.subject);
                const sender = parseSender(msg.from);
                const isReading = readingMsg === msg.num;

                return (
                  <button
                    key={msg.num || i}
                    onClick={() => readEmail(msg.num)}
                    disabled={isReading}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${!msg.seen ? "bg-primary/[0.03]" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-full ${getColor(sender.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitial(sender.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!msg.seen ? "font-semibold" : "text-muted-foreground"}`}>
                          {sender.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(msg.date)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!msg.seen ? "font-medium" : "text-muted-foreground"}`}>
                        {subject}
                      </p>
                    </div>

                    {/* Unread dot / loading */}
                    {isReading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                    ) : !msg.seen ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
                    ) : null}
                  </button>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => loadInbox(page - 1)}>
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Sebelumnya
                  </Button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => loadInbox(page + 1)}>
                    Selanjutnya <ArrowLeft className="h-3.5 w-3.5 ml-1 rotate-180" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <AnimatePresence>
        {showCompose && <ComposeDialog onClose={() => { setShowCompose(false); setReplyTo(null); }} onSend={handleSend} sending={sending} replyTo={replyTo} />}
      </AnimatePresence>
    </Layout>
  );
}
