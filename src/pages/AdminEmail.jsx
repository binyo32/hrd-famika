import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Send, Inbox, RefreshCw, ArrowLeft, Loader2,
  Eye, EyeOff, CheckCircle, XCircle, PenSquare, X, LogOut, Search,
  Trash2, MailOpen, Archive, FileText, AlertTriangle, Bell, Folder,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const EMAIL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-proxy`;

/* ─── Folder Config ─── */

const FOLDER_CONFIG = {
  "INBOX":         { label: "Inbox",    icon: Inbox,           order: 0 },
  "INBOX.Sent":    { label: "Sent",     icon: Send,            order: 1 },
  "Sent":          { label: "Sent",     icon: Send,            order: 1 },
  "INBOX.Drafts":  { label: "Drafts",   icon: FileText,        order: 2 },
  "Drafts":        { label: "Drafts",   icon: FileText,        order: 2 },
  "INBOX.Junk":    { label: "Junk",     icon: AlertTriangle,   order: 3 },
  "Junk":          { label: "Junk",     icon: AlertTriangle,   order: 3 },
  "INBOX.spam":    { label: "Spam",     icon: AlertTriangle,   order: 3 },
  "Spam":          { label: "Spam",     icon: AlertTriangle,   order: 3 },
  "INBOX.Trash":   { label: "Trash",    icon: Trash2,          order: 4 },
  "Trash":         { label: "Trash",    icon: Trash2,          order: 4 },
  "INBOX.Archive": { label: "Archive",  icon: Archive,         order: 5 },
  "Archive":       { label: "Archive",  icon: Archive,         order: 5 },
};

function getFolderInfo(name) {
  return FOLDER_CONFIG[name] || { label: name.replace(/^INBOX\./, ""), icon: Folder, order: 99 };
}

/* ─── Utils ─── */

function decodeSubject(raw) {
  if (!raw) return "(Tanpa Subjek)";
  try {
    let s = raw.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_, b64) => atob(b64));
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

function EmailViewer({ data, onBack, onReply, onDelete, onMarkUnread, folderLabel }) {
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
        <ArrowLeft className="h-4 w-4" /> {folderLabel || "Inbox"}
      </Button>

      <Card className="overflow-hidden">
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
                {sender.email}{to ? ` \u2192 ${to}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {html ? (
            <iframe ref={iframeRef} className="w-full border-0 min-h-[200px]" sandbox="allow-same-origin" title="email" />
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{text || "(Tidak ada isi)"}</pre>
          )}
        </div>

        <div className="px-5 py-3 border-t flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onReply({ email: sender.email, subject })} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Balas
          </Button>
          <Button variant="outline" size="sm" onClick={onMarkUnread} className="gap-1.5">
            <MailOpen className="h-3.5 w-3.5" /> Tandai belum dibaca
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ─── Folder Sidebar ─── */

function FolderSidebar({ folders, activeFolder, onSelect }) {
  const sorted = [...folders].sort((a, b) => (getFolderInfo(a.name).order) - (getFolderInfo(b.name).order));

  return (
    <nav className="space-y-0.5">
      {sorted.map((f) => {
        const info = getFolderInfo(f.name);
        const Icon = info.icon;
        const active = f.name === activeFolder;
        return (
          <button
            key={f.name}
            onClick={() => onSelect(f.name)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{info.label}</span>
            {f.unseen > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                active ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {f.unseen}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Mobile Folder Dropdown ─── */

function MobileFolderSelect({ folders, activeFolder, onSelect }) {
  const [open, setOpen] = useState(false);
  const info = getFolderInfo(activeFolder);
  const Icon = info.icon;
  const sorted = [...folders].sort((a, b) => (getFolderInfo(a.name).order) - (getFolderInfo(b.name).order));
  const activeData = folders.find(f => f.name === activeFolder);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm w-full"
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left font-medium">{info.label}</span>
        {activeData?.unseen > 0 && (
          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">{activeData.unseen}</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-20 py-1"
          >
            {sorted.map((f) => {
              const fi = getFolderInfo(f.name);
              const FIcon = fi.icon;
              return (
                <button
                  key={f.name}
                  onClick={() => { onSelect(f.name); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    f.name === activeFolder ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  <FIcon className="h-4 w-4" />
                  <span className="flex-1 text-left">{fi.label}</span>
                  {f.unseen > 0 && (
                    <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">{f.unseen}</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
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
  const [readMeta, setReadMeta] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  // New states
  const [folder, setFolder] = useState("INBOX");
  const [folders, setFolders] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [newMailCount, setNewMailCount] = useState(0);
  const prevTotalRef = useRef(0);
  const loadParamsRef = useRef({ folder: "INBOX", searchQuery: "", page: 1 });

  // Keep ref in sync
  useEffect(() => {
    loadParamsRef.current = { folder, searchQuery, page };
  }, [folder, searchQuery, page]);

  // Load config
  useEffect(() => {
    (async () => { const r = await api("get-config"); setConfig(r.config); setLoading(false); })();
  }, [api]);

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const r = await api("folders");
      if (r.folders) setFolders(r.folders);
    } catch {}
  }, [api]);

  // Load inbox
  const loadInbox = useCallback(async (pg = 1, silent = false) => {
    if (!silent) setLoadingInbox(true);
    setPage(pg);
    try {
      let r;
      if (searchQuery) {
        r = await api("search", { query: searchQuery, folder, page: pg, perPage: 20 });
      } else {
        r = await api("inbox", { folder, page: pg, perPage: 20 });
      }
      // Detect new mail on silent refresh
      if (silent && r.total > prevTotalRef.current && prevTotalRef.current > 0) {
        setNewMailCount(r.total - prevTotalRef.current);
      }
      prevTotalRef.current = r.total || 0;
      setInbox(r);
      setLastRefresh(new Date());
    } catch {}
    if (!silent) setLoadingInbox(false);
  }, [api, folder, searchQuery]);

  // Initial load
  useEffect(() => {
    if (config) { loadFolders(); loadInbox(); }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when folder or search changes
  useEffect(() => {
    if (config) {
      prevTotalRef.current = 0;
      setNewMailCount(0);
      loadInbox(1);
    }
  }, [folder, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!config || readData) return;
    const id = setInterval(async () => {
      const { folder: f, searchQuery: q, page: p } = loadParamsRef.current;
      try {
        let r;
        if (q) {
          r = await api("search", { query: q, folder: f, page: p, perPage: 20 });
        } else {
          r = await api("inbox", { folder: f, page: p, perPage: 20 });
        }
        if (r.total > prevTotalRef.current && prevTotalRef.current > 0) {
          setNewMailCount(r.total - prevTotalRef.current);
        }
        prevTotalRef.current = r.total || 0;
        setInbox(r);
        setLastRefresh(new Date());
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [config, readData, api]);

  // Read email
  const readEmail = async (msg) => {
    setReadingMsg(msg.uid || msg.num);
    const r = await api("read", { uid: msg.uid, msgNum: msg.num, folder });
    setReadData(r.parsed);
    setReadMeta({ uid: msg.uid, folder });
    setReadingMsg(null);
  };

  // Send email
  const handleSend = async ({ to, subject, body }) => {
    setSending(true);
    await api("send", { to, subject, body });
    setSending(false); setShowCompose(false); setReplyTo(null);
    loadInbox(page);
  };

  // Delete email
  const deleteEmail = async (uid) => {
    await api("delete", { uid, folder });
    if (readData) { setReadData(null); setReadMeta(null); }
    loadInbox(page);
    loadFolders();
  };

  // Mark read/unread
  const markEmail = async (uid, seen) => {
    await api("mark", { uid, seen, folder });
    setInbox((prev) => prev ? {
      ...prev,
      messages: prev.messages.map((m) => m.uid === uid ? { ...m, seen } : m),
    } : prev);
  };

  // Switch folder
  const switchFolder = (f) => {
    setFolder(f);
    setPage(1);
    setSearchQuery("");
    setSearchInput("");
    setReadData(null);
    setReadMeta(null);
    setNewMailCount(0);
    prevTotalRef.current = 0;
  };

  // Search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchInput("");
    setPage(1);
  };

  // Reply
  const handleReply = (info) => { setReplyTo(info); setShowCompose(true); };

  // Disconnect
  const handleDisconnect = async () => { await api("delete-config"); setConfig(null); setInbox(null); setFolders([]); };

  // Manual refresh
  const handleRefresh = () => {
    setNewMailCount(0);
    loadFolders();
    loadInbox(page);
  };

  // Loading
  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div></Layout>;
  if (!config) return <Layout><EmailSetup onDone={() => window.location.reload()} api={api} /></Layout>;

  const folderInfo = getFolderInfo(folder);
  const totalPages = inbox ? Math.ceil(inbox.total / 20) : 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex gap-4">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-48 flex-shrink-0 space-y-4">
          <Button size="sm" onClick={() => { setReplyTo(null); setShowCompose(true); }}
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <PenSquare className="h-3.5 w-3.5" /> Tulis Email
          </Button>
          <FolderSidebar folders={folders} activeFolder={folder} onSelect={switchFolder} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {readData ? (
            /* ─── Email Viewer ─── */
            <EmailViewer
              data={readData}
              folderLabel={folderInfo.label}
              onBack={() => { setReadData(null); setReadMeta(null); }}
              onReply={handleReply}
              onDelete={() => readMeta && deleteEmail(readMeta.uid)}
              onMarkUnread={() => {
                if (readMeta) { markEmail(readMeta.uid, false); setReadData(null); setReadMeta(null); }
              }}
            />
          ) : (
            <>
              {/* ─── Header ─── */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{folderInfo.label}</h1>
                    <p className="text-xs text-muted-foreground">{config.email} {inbox ? `\u00B7 ${inbox.total} email` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loadingInbox} className="h-9 w-9">
                    <RefreshCw className={`h-4 w-4 ${loadingInbox ? "animate-spin" : ""}`} />
                  </Button>
                  <Button size="sm" onClick={() => { setReplyTo(null); setShowCompose(true); }}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 md:hidden">
                    <PenSquare className="h-3.5 w-3.5" /> Tulis
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-9 w-9 text-muted-foreground" title="Putuskan email">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ─── Mobile Folder Select ─── */}
              <MobileFolderSelect folders={folders} activeFolder={folder} onSelect={switchFolder} />

              {/* ─── Search Bar ─── */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari email..."
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              {/* ─── Search indicator ─── */}
              {searchQuery && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                  <Search className="h-3.5 w-3.5" />
                  <span>Hasil pencarian &ldquo;{searchQuery}&rdquo; {inbox ? `\u00B7 ${inbox.total} ditemukan` : ""}</span>
                  <button onClick={clearSearch} className="text-primary hover:underline text-xs ml-1">Hapus</button>
                </div>
              )}

              {/* ─── New Mail Notification ─── */}
              <AnimatePresence>
                {newMailCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-2.5 rounded-lg flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span>{newMailCount} email baru diterima</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      onClick={() => { setNewMailCount(0); loadInbox(1); }}>
                      Muat
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Email List ─── */}
              <Card className="overflow-hidden">
                {loadingInbox && !inbox ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Memuat {folderInfo.label.toLowerCase()}...</span>
                  </div>
                ) : !inbox?.messages?.length ? (
                  <div className="text-center py-16">
                    <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "Tidak ada hasil" : `${folderInfo.label} kosong`}
                    </p>
                  </div>
                ) : (
                  <>
                    {inbox.messages.map((msg, i) => {
                      const subject = decodeSubject(msg.subject);
                      const sender = parseSender(msg.from);
                      const isReading = readingMsg === (msg.uid || msg.num);

                      return (
                        <div
                          key={msg.uid || msg.num || i}
                          onClick={() => !isReading && readEmail(msg)}
                          className={`group w-full text-left px-4 py-3 flex items-center gap-3 border-b border-border/50 transition-colors cursor-pointer hover:bg-muted/50 ${!msg.seen ? "bg-primary/[0.03]" : ""}`}
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

                          {/* Actions (hover) */}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); markEmail(msg.uid, !msg.seen); }}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              title={msg.seen ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                            >
                              {msg.seen ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteEmail(msg.uid); }}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Unread dot / loading (visible when actions hidden) */}
                          <div className="flex-shrink-0 group-hover:hidden">
                            {isReading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : !msg.seen ? (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination + Last updated */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                      {totalPages > 1 ? (
                        <>
                          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => loadInbox(page - 1)}>
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Sebelumnya
                          </Button>
                          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => loadInbox(page + 1)}>
                            Selanjutnya <ArrowLeft className="h-3.5 w-3.5 ml-1 rotate-180" />
                          </Button>
                        </>
                      ) : (
                        <div className="w-full" />
                      )}
                    </div>
                    {lastRefresh && (
                      <div className="text-[11px] text-muted-foreground/60 text-center py-1.5 bg-muted/20">
                        Diperbarui {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        {" \u00B7 "}Auto-refresh 30 detik
                      </div>
                    )}
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCompose && <ComposeDialog onClose={() => { setShowCompose(false); setReplyTo(null); }} onSend={handleSend} sending={sending} replyTo={replyTo} />}
      </AnimatePresence>
    </Layout>
  );
}
