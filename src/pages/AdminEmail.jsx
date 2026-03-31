import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Send, Inbox, RefreshCw, Settings, ArrowLeft, Loader2, Trash2,
  Eye, EyeOff, CheckCircle, XCircle, PenSquare, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const EMAIL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-proxy`;

function useEmailApi() {
  const call = useCallback(async (action, params = {}) => {
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
  return call;
}

// ─── Setup Form ───
function EmailSetup({ onDone, api }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
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
    <div className="max-w-md mx-auto mt-12">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Konfigurasi Email</h2>
            <p className="text-xs text-muted-foreground">Hubungkan email perusahaan kamu</p>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            placeholder="nama@fajarmitra.co.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Password email"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          Server: mail.fajarmitra.co.id | IMAP: 993 | SMTP: 465 (SSL)
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 text-sm ${testResult === "ok" ? "text-green-500" : "text-destructive"}`}>
            {testResult === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {testResult === "ok" ? "Koneksi berhasil!" : "Koneksi gagal. Cek email & password."}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} disabled={!email || !password || testing} className="flex-1">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Koneksi
          </Button>
          <Button
            onClick={handleSave}
            disabled={!email || !password || testResult !== "ok" || saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simpan & Hubungkan
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Compose ───
function ComposeDialog({ onClose, onSend, sending }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card rounded-xl shadow-xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold flex items-center gap-2">
            <PenSquare className="h-4 w-4" /> Tulis Email
          </h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Input placeholder="Kepada (email)" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Subjek" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="Isi email..." rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="resize-none" />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            onClick={() => onSend({ to, subject, body })}
            disabled={!to || !subject || !body || sending}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Email Reader ───
function EmailReader({ raw, onBack }) {
  // Basic parsing of raw email
  const headers = {};
  const lines = (raw || "").split("\n");
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") { bodyStart = i + 1; break; }
    const match = lines[i].match(/^([\w-]+):\s*(.+)/);
    if (match) headers[match[1].toLowerCase()] = match[2].trim();
  }
  const emailBody = lines.slice(bodyStart).join("\n").trim();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-bold">{headers.subject || "(Tanpa Subjek)"}</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Dari:</strong> {headers.from || "-"}</p>
          <p><strong>Kepada:</strong> {headers.to || "-"}</p>
          <p><strong>Tanggal:</strong> {headers.date || "-"}</p>
        </div>
        <hr />
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{emailBody}</pre>
      </Card>
    </div>
  );
}

// ─── Main ───
export default function AdminEmail() {
  const { user } = useAuth();
  const api = useEmailApi();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState(null);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [readingMsg, setReadingMsg] = useState(null);
  const [readData, setReadData] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  // Load config
  useEffect(() => {
    (async () => {
      const r = await api("get-config");
      setConfig(r.config);
      setLoading(false);
    })();
  }, [api]);

  // Load inbox
  const loadInbox = useCallback(async (pg = 1) => {
    setLoadingInbox(true);
    setPage(pg);
    const r = await api("inbox", { page: pg, perPage: 20 });
    setInbox(r);
    setLoadingInbox(false);
  }, [api]);

  useEffect(() => {
    if (config) loadInbox();
  }, [config, loadInbox]);

  // Read email
  const readEmail = async (msgNum) => {
    setReadingMsg(msgNum);
    const r = await api("read", { msgNum });
    setReadData(r);
  };

  // Send email
  const handleSend = async ({ to, subject, body }) => {
    setSending(true);
    await api("send", { to, subject, body });
    setSending(false);
    setShowCompose(false);
    loadInbox(page);
  };

  // Disconnect
  const handleDisconnect = async () => {
    await api("delete-config");
    setConfig(null);
    setInbox(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Layout>
    );
  }

  // No config → show setup
  if (!config) {
    return (
      <Layout>
        <EmailSetup onDone={() => window.location.reload()} api={api} />
      </Layout>
    );
  }

  // Reading a specific email
  if (readData) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-4">
          <EmailReader raw={readData.raw} onBack={() => { setReadData(null); setReadingMsg(null); }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Email
            </h1>
            <p className="text-sm text-muted-foreground">{config.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadInbox(page)} disabled={loadingInbox}>
              <RefreshCw className={`h-4 w-4 ${loadingInbox ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCompose(true)} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
              <PenSquare className="h-4 w-4" /> Tulis
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Inbox */}
        <Card>
          {loadingInbox && !inbox ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat inbox...
            </div>
          ) : !inbox?.messages?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Inbox kosong</p>
            </div>
          ) : (
            <div className="divide-y">
              {inbox.messages.map((msg, i) => {
                // Decode subject if encoded
                let subject = msg.subject;
                try {
                  if (subject.includes("=?UTF-8?B?")) {
                    subject = subject.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b64) => atob(b64));
                  }
                } catch {}

                // Parse from
                let from = msg.from;
                const nameMatch = from.match(/"?([^"<]+)"?\s*</);
                if (nameMatch) from = nameMatch[1].trim();

                return (
                  <button
                    key={i}
                    onClick={() => readEmail(msg.num)}
                    disabled={readingMsg === msg.num}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                      !msg.seen ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${!msg.seen ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!msg.seen ? "font-semibold" : ""}`}>{from}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {msg.date ? new Date(msg.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!msg.seen ? "font-medium" : "text-muted-foreground"}`}>{subject}</p>
                    </div>
                    {readingMsg === msg.num && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {inbox && inbox.total > 20 && (
            <div className="flex items-center justify-between p-3 border-t">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => loadInbox(page - 1)}>Sebelumnya</Button>
              <span className="text-xs text-muted-foreground">Halaman {page} dari {Math.ceil(inbox.total / 20)}</span>
              <Button variant="ghost" size="sm" disabled={page >= Math.ceil(inbox.total / 20)} onClick={() => loadInbox(page + 1)}>Selanjutnya</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Compose dialog */}
      <AnimatePresence>
        {showCompose && (
          <ComposeDialog onClose={() => setShowCompose(false)} onSend={handleSend} sending={sending} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
