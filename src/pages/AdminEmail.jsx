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
  ChevronDown, Star, Reply, Check, MoreVertical, Share2, Paperclip, Download,
  Bold, Italic, Underline, List, ListOrdered, Link2, Image, Plus, Volume2, GripVertical,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const EMAIL_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-proxy`;

/* ─── Folder Config ─── */

const FOLDER_CONFIG = {
  "ALL":           { label: "All Mail", icon: Mail,            order: -1, color: "text-indigo-500" },
  "INBOX":         { label: "Inbox",    icon: Inbox,           order: 0, color: "text-blue-500" },
  "INBOX.Sent":    { label: "Sent",     icon: Send,            order: 1, color: "text-emerald-500" },
  "Sent":          { label: "Sent",     icon: Send,            order: 1, color: "text-emerald-500" },
  "INBOX.Drafts":  { label: "Drafts",   icon: FileText,        order: 2, color: "text-amber-500" },
  "Drafts":        { label: "Drafts",   icon: FileText,        order: 2, color: "text-amber-500" },
  "INBOX.Junk":    { label: "Junk",     icon: AlertTriangle,   order: 3, color: "text-orange-500" },
  "Junk":          { label: "Junk",     icon: AlertTriangle,   order: 3, color: "text-orange-500" },
  "INBOX.spam":    { label: "Spam",     icon: AlertTriangle,   order: 3, color: "text-orange-500" },
  "Spam":          { label: "Spam",     icon: AlertTriangle,   order: 3, color: "text-orange-500" },
  "INBOX.Trash":   { label: "Trash",    icon: Trash2,          order: 4, color: "text-red-500" },
  "Trash":         { label: "Trash",    icon: Trash2,          order: 4, color: "text-red-500" },
  "INBOX.Archive": { label: "Archive",  icon: Archive,         order: 5, color: "text-purple-500" },
  "Archive":       { label: "Archive",  icon: Archive,         order: 5, color: "text-purple-500" },
};

function getFolderInfo(name) {
  return FOLDER_CONFIG[name] || { label: name.replace(/^INBOX\./, ""), icon: Folder, order: 99, color: "text-muted-foreground" };
}

/* ─── Utils ─── */

function decodeSubject(raw) {
  if (!raw) return "(Tanpa Subjek)";
  try {
    let s = raw.replace(/=\?UTF-8\?B\?([^?]+)\?=/gi, (_, b64) => atob(b64));
    s = s.replace(/=\?UTF-8\?Q\?([^?]+)\?=/gi, (_, qp) =>
      qp.replace(/=([0-9A-F]{2})/gi, (__, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/_/g, " ")
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
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} mnt`;
    if (hours < 24 && d.toDateString() === now.toDateString()) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function getInitial(name) { return (name || "?")[0].toUpperCase(); }

const AVATAR_GRADIENTS = [
  "from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600", "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600", "from-pink-500 to-pink-600", "from-teal-500 to-teal-600",
  "from-indigo-500 to-indigo-600", "from-rose-500 to-rose-600", "from-cyan-500 to-cyan-600",
];
function getGradient(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function formatSize(bytes) {
  if (!bytes || bytes < 1) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileIcon(contentType) {
  if (!contentType) return "📎";
  if (contentType.startsWith("image/")) return "🖼️";
  if (contentType.includes("pdf")) return "📄";
  if (contentType.includes("word") || contentType.includes("document")) return "📝";
  if (contentType.includes("sheet") || contentType.includes("excel")) return "📊";
  if (contentType.includes("zip") || contentType.includes("rar") || contentType.includes("archive")) return "📦";
  if (contentType.startsWith("video/")) return "🎬";
  if (contentType.startsWith("audio/")) return "🎵";
  return "📎";
}

/* ─── Notification Sound ─── */

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(830, ctx.currentTime);
    osc.frequency.setValueAtTime(990, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(830, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function showDesktopNotification(count) {
  if ("Notification" in window && Notification.permission === "granted") {
    const n = new Notification("Famika Mail", {
      body: `${count} email baru diterima`,
      icon: "/favicon.ico",
      silent: true,
    });
    setTimeout(() => n.close(), 5000);
  }
  playNotificationSound();
}

function htmlToPlainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
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

/* ─── Toast System ─── */

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-sm font-medium ${
              t.type === "success" ? "bg-emerald-500/95 text-white" :
              t.type === "error" ? "bg-red-500/95 text-white" :
              "bg-blue-500/95 text-white"
            }`}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
            {t.type === "error" && <XCircle className="h-4 w-4 flex-shrink-0" />}
            {t.type === "info" && <Bell className="h-4 w-4 flex-shrink-0" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Skeleton Loading ─── */

function EmailSkeleton({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="px-4 py-3.5 flex items-center gap-3 border-b border-border/30" style={{ animationDelay: `${i * 80}ms` }}>
      <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse" />
      <div className="flex-1 space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="h-3.5 rounded-md bg-muted/60 animate-pulse" style={{ width: `${80 + Math.random() * 60}px` }} />
          <div className="h-3 w-10 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="h-3 rounded-md bg-muted/40 animate-pulse" style={{ width: `${140 + Math.random() * 120}px` }} />
      </div>
    </div>
  ));
}

/* ─── Send Success Animation ─── */

function SendSuccessOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center bg-card/98 backdrop-blur-sm z-10 rounded-xl overflow-hidden"
    >
      {/* Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.8, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: 1,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
          }}
          transition={{ duration: 1, delay: 0.2 + i * 0.05, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"][i % 5] }}
        />
      ))}

      {/* Paper plane flying */}
      <motion.div
        initial={{ scale: 0.3, opacity: 1, y: 20, rotate: 0 }}
        animate={{ scale: 1.8, opacity: 0, y: -120, x: 60, rotate: -25 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="absolute"
      >
        <Send className="h-8 w-8 text-blue-500" />
      </motion.div>

      {/* Success check */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 20 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 15 }}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30"
        >
          <Check className="h-8 w-8 text-white" strokeWidth={3} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
        >
          Email berhasil dikirim!
        </motion.p>
      </motion.div>
    </motion.div>
  );
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
    try {
      const r = await api("test", { email, password, imap_server: "mail.fajarmitra.co.id", imap_port: 993 });
      setTestResult(r.success ? "ok" : "fail");
    } catch { setTestResult("fail"); }
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="p-6 space-y-5 shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/25"
            >
              <Mail className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-xl font-bold">Hubungkan Email</h2>
            <p className="text-sm text-muted-foreground">Masukkan email perusahaan untuk mulai</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input placeholder="nama@fajarmitra.co.id" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} placeholder="Password email" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">Server: mail.fajarmitra.co.id | IMAP: 993 (SSL)</p>

          <AnimatePresence>
            {testResult && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={`flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl ${testResult === "ok" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-red-600 bg-red-50 dark:bg-red-950/30"}`}>
                {testResult === "ok" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {testResult === "ok" ? "Koneksi berhasil!" : "Gagal. Cek email & password."}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={!email || !password || testing} className="flex-1 h-10">
              {testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Test Koneksi
            </Button>
            <Button onClick={handleSave} disabled={!email || !password || testResult !== "ok" || saving}
              className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Hubungkan
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

/* ─── Compose Dialog ─── */

function ContactAutocomplete({ value, onChange, placeholder, contacts }) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Parse what's after the last comma to use as search query
  const parts = value.split(",");
  const lastPart = (parts[parts.length - 1] || "").trim();

  const filtered = lastPart.length >= 2
    ? contacts.filter((c) =>
        c.name?.toLowerCase().includes(lastPart.toLowerCase()) ||
        c.email?.toLowerCase().includes(lastPart.toLowerCase())
      ).slice(0, 6)
    : [];

  const selectContact = (email) => {
    const before = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
    before.push(email);
    onChange(before.join(", ") + (before.length ? "" : ""));
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="text-sm h-9"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl z-30 py-1 max-h-48 overflow-y-auto">
          {filtered.map((c, i) => (
            <button key={i} onMouseDown={() => selectContact(c.email)}
              className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-sm">
              <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${getGradient(c.name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                {getInitial(c.name)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-xs truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposeDialog({ onClose, onSend, sending, sendSuccess, replyTo, forwardData, contacts }) {
  const [to, setTo] = useState(replyTo?.email || "");
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject?.replace(/^Re:\s*/i, "")}` :
    forwardData ? `Fwd: ${forwardData.subject}` : ""
  );
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [files, setFiles] = useState([]);
  const [draggingOver, setDraggingOver] = useState(false);
  const dragCountRef = useRef(0);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Set initial content for forward
  useEffect(() => {
    if (editorRef.current && forwardData) {
      editorRef.current.innerHTML = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;color:#666">---------- Forwarded message ----------<br>From: ${forwardData.from}<br>Date: ${forwardData.date}<br>Subject: ${forwardData.subject}<br><br>${forwardData.body.replace(/\n/g, "<br>")}</div>`;
    }
  }, [forwardData]);

  const execCmd = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const handleLink = () => {
    const url = prompt("URL:");
    if (url) execCmd("createLink", url);
  };

  const handleImage = () => {
    const url = prompt("URL gambar:");
    if (url) execCmd("insertImage", url);
  };

  const addFiles = (fileList) => {
    for (const file of fileList) {
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} terlalu besar (max 10MB)`); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => [...prev, {
          filename: file.name, contentType: file.type || "application/octet-stream",
          size: file.size, data: reader.result.split(",")[1],
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => { addFiles(e.target.files); e.target.value = ""; };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDraggingOver(false); dragCountRef.current = 0;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCountRef.current++; setDraggingOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCountRef.current--; if (dragCountRef.current <= 0) { setDraggingOver(false); dragCountRef.current = 0; } };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    const htmlContent = editorRef.current?.innerHTML || "";
    const plainText = htmlToPlainText(htmlContent);
    if (!to || !subject || (!plainText.trim() && !htmlContent.trim())) return;
    onSend({
      to, subject, body: plainText, html: htmlContent,
      cc: cc || undefined, bcc: bcc || undefined,
      attachments: files.length ? files : undefined,
    });
  };

  const TB = [
    { icon: Bold, cmd: () => execCmd("bold"), tip: "Bold" },
    { icon: Italic, cmd: () => execCmd("italic"), tip: "Italic" },
    { icon: Underline, cmd: () => execCmd("underline"), tip: "Underline" },
    null, // separator
    { icon: List, cmd: () => execCmd("insertUnorderedList"), tip: "Bullet list" },
    { icon: ListOrdered, cmd: () => execCmd("insertOrderedList"), tip: "Numbered list" },
    null,
    { icon: Link2, cmd: handleLink, tip: "Link" },
    { icon: Image, cmd: handleImage, tip: "Gambar dari URL" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ y: "100%", opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
        {sendSuccess && <SendSuccessOverlay />}

        {/* Drag & drop overlay */}
        <AnimatePresence>
          {draggingOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary rounded-2xl flex flex-col items-center justify-center pointer-events-none">
              <motion.div initial={{ scale: 0.8, y: 10 }} animate={{ scale: 1, y: 0 }}
                className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-3">
                <Paperclip className="h-8 w-8 text-primary" />
              </motion.div>
              <p className="text-sm font-semibold text-primary">Drop file di sini</p>
              <p className="text-xs text-primary/60 mt-1">Maks 10MB per file</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <PenSquare className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm">{replyTo ? "Balas Email" : forwardData ? "Teruskan Email" : "Email Baru"}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Recipients */}
        <div className="px-4 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8">To</span>
            <ContactAutocomplete value={to} onChange={setTo} placeholder="Kepada" contacts={contacts} />
            {!showCcBcc && (
              <button onClick={() => setShowCcBcc(true)} className="text-xs text-primary hover:text-primary/80 font-medium whitespace-nowrap px-2">Cc/Bcc</button>
            )}
          </div>
          <AnimatePresence>
            {showCcBcc && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">Cc</span>
                  <ContactAutocomplete value={cc} onChange={setCc} placeholder="Cc" contacts={contacts} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">Bcc</span>
                  <ContactAutocomplete value={bcc} onChange={setBcc} placeholder="Bcc" contacts={contacts} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8"></span>
            <Input placeholder="Subjek" value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm h-9 flex-1" />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b border-t mt-2">
          {TB.map((t, i) => t === null ? (
            <div key={i} className="w-px h-5 bg-border mx-1" />
          ) : (
            <button key={i} onClick={t.cmd} title={t.tip}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={() => fileInputRef.current?.click()} title="Lampirkan file"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
        </div>

        {/* Rich Text Editor */}
        <div className="px-4 max-h-[40vh] overflow-y-auto">
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            className="min-h-[180px] py-3 text-sm leading-relaxed outline-none focus:outline-none [&_a]:text-blue-500 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
            data-placeholder="Tulis email..."
            style={{ minHeight: "180px" }}
          />
        </div>

        {/* Attached Files */}
        {files.length > 0 && (
          <div className="px-4 py-2 border-t flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 text-xs">
                <span>{getFileIcon(f.contentType)}</span>
                <span className="truncate max-w-[120px] font-medium">{f.filename}</span>
                <span className="text-muted-foreground">{formatSize(f.size)}</span>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-red-500 ml-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t bg-muted/20">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">Batal</Button>
          </div>
          <Button size="sm" onClick={handleSubmit}
            disabled={!to || !subject || sending || sendSuccess}
            className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 px-6">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sending ? "Mengirim..." : "Kirim"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Email Viewer ─── */

function AttachmentPreview({ att, onClose, onDownload }) {
  const isImage = att.contentType?.startsWith("image/");
  const isPdf = att.contentType?.includes("pdf");
  const isText = att.contentType?.startsWith("text/") || att.filename?.match(/\.(txt|csv|json|xml|html|css|js|log)$/i);
  const dataUrl = att.data ? `data:${att.contentType};base64,${att.data}` : null;

  let textContent = "";
  if (isText && att.data) {
    try { textContent = atob(att.data); } catch {}
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">{getFileIcon(att.contentType)}</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{att.filename}</p>
              <p className="text-[11px] text-muted-foreground">{formatSize(att.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onDownload} className="gap-1.5 rounded-lg">
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 min-h-[300px]">
          {isImage && dataUrl ? (
            <img src={dataUrl} alt={att.filename} className="max-w-full max-h-[75vh] object-contain p-4" />
          ) : isPdf && dataUrl ? (
            <iframe src={dataUrl} className="w-full h-[75vh] border-0" title={att.filename} />
          ) : isText && textContent ? (
            <pre className="w-full h-full p-5 text-sm leading-relaxed font-mono overflow-auto whitespace-pre-wrap">{textContent}</pre>
          ) : (
            <div className="text-center py-16 px-8">
              <div className="text-5xl mb-4">{getFileIcon(att.contentType)}</div>
              <p className="text-sm font-medium mb-1">{att.filename}</p>
              <p className="text-xs text-muted-foreground mb-4">{formatSize(att.size)} &middot; {att.contentType}</p>
              <p className="text-xs text-muted-foreground mb-4">Preview tidak tersedia untuk tipe file ini</p>
              <Button size="sm" onClick={onDownload} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
                <Download className="h-3.5 w-3.5" /> Download File
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmailViewer({ data, onBack, onReply, onForward, onDelete, onMarkUnread, onArchive, onDownloadAttachment, folderLabel, isTrash }) {
  const { text = "", html = "", subject = "", from: rawFrom = "", to = "", cc = "", date = "", attachments = [] } = data || {};
  const fileAttachments = attachments.filter(a => !a.inline);
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [previewAtt, setPreviewAtt] = useState(null);
  const sender = parseSender(rawFrom);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(`<html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.7; color: #374151; margin: 20px; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        a { color: #2563eb; text-decoration: none; } a:hover { text-decoration: underline; }
        table { border-collapse: collapse; } td, th { padding: 4px 8px; }
        blockquote { border-left: 3px solid #e5e7eb; margin: 12px 0; padding: 4px 16px; color: #6b7280; }
      </style></head><body>${html}</body></html>`);
      doc.close();
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.style.height = doc.body.scrollHeight + 40 + "px";
      }, 300);
    }
  }, [html]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 hover:bg-muted/80">
          <ArrowLeft className="h-4 w-4" /> {folderLabel || "Inbox"}
        </Button>
      </div>

      <Card className="overflow-hidden shadow-lg border-0 bg-card/90 backdrop-blur-sm">
        {/* Subject + Star */}
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-xl font-bold leading-tight">{subject || "(Tanpa Subjek)"}</h2>
        </div>

        {/* Sender info */}
        <div className="px-5 py-3 flex items-start gap-3.5">
          <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${getGradient(sender.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
            {getInitial(sender.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{sender.name}</p>
              <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{sender.email}</p>
            {to && <p className="text-xs text-muted-foreground mt-0.5">Kepada: {to}</p>}
            {cc && <p className="text-xs text-muted-foreground">Cc: {cc}</p>}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t" />

        {/* Body */}
        <div className="p-5">
          {data._loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-3.5 bg-muted/60 rounded w-[90%]" />
              <div className="h-3.5 bg-muted/60 rounded w-full" />
              <div className="h-3.5 bg-muted/60 rounded w-[75%]" />
              <div className="h-3.5 bg-muted/40 rounded w-[60%]" />
              <div className="h-3.5 bg-muted/40 rounded w-[85%]" />
            </div>
          ) : html ? (
            <iframe ref={iframeRef} className="w-full border-0 min-h-[200px]" sandbox="allow-same-origin" title="email" />
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground/80">{text || "(Tidak ada isi)"}</pre>
          )}
        </div>

        {/* Attachments */}
        {fileAttachments.length > 0 && !data._loading && (
          <div className="px-5 py-4 border-t bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {fileAttachments.length} Lampiran
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {fileAttachments.map((att) => {
                const isImage = att.contentType?.startsWith("image/") && att.data;
                const thumbUrl = isImage ? `data:${att.contentType};base64,${att.data}` : null;
                return (
                  <div key={att.index} className="rounded-xl border border-border/60 overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group bg-card">
                    {/* Thumbnail / icon - click to preview */}
                    <button onClick={() => setPreviewAtt(att)}
                      className="w-full aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={att.filename} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <span className="text-3xl block mb-1">{getFileIcon(att.contentType)}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{att.contentType?.split("/")[1]?.split(";")[0] || "file"}</span>
                        </div>
                      )}
                    </button>
                    {/* Info + download */}
                    <div className="px-2.5 py-2 flex items-center gap-1.5">
                      <div className="flex-1 min-w-0" onClick={() => setPreviewAtt(att)} role="button">
                        <p className="text-xs font-medium truncate">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">{formatSize(att.size)}</p>
                      </div>
                      <button
                        onClick={async (e) => { e.stopPropagation(); setDownloadingIdx(att.index); await onDownloadAttachment(att.index, att.filename, att.contentType); setDownloadingIdx(null); }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                        title="Download">
                        {downloadingIdx === att.index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachment preview modal */}
        <AnimatePresence>
          {previewAtt && (
            <AttachmentPreview
              att={previewAtt}
              onClose={() => setPreviewAtt(null)}
              onDownload={async () => {
                await onDownloadAttachment(previewAtt.index, previewAtt.filename, previewAtt.contentType);
                setPreviewAtt(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t bg-muted/20 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onReply({ email: sender.email, subject })} className="gap-1.5 rounded-lg shadow-sm">
            <Reply className="h-3.5 w-3.5" /> Balas
          </Button>
          <Button variant="outline" size="sm" onClick={() => onForward({
            subject, from: `${sender.name} <${sender.email}>`, date, body: text || ""
          })} className="gap-1.5 rounded-lg shadow-sm">
            <Share2 className="h-3.5 w-3.5" /> Teruskan
          </Button>
          {!isTrash && (
            <Button variant="outline" size="sm" onClick={onArchive} className="gap-1.5 rounded-lg shadow-sm">
              <Archive className="h-3.5 w-3.5" /> Arsipkan
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onMarkUnread} className="gap-1.5 rounded-lg shadow-sm">
            <MailOpen className="h-3.5 w-3.5" /> Tandai belum dibaca
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 rounded-lg shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800/40">
            <Trash2 className="h-3.5 w-3.5" /> {isTrash ? "Hapus Permanen" : "Hapus"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/* ─── Folder Sidebar ─── */

const DEFAULT_FOLDERS = [
  { name: "ALL", total: 0, unseen: 0 },
  { name: "INBOX", total: 0, unseen: 0 },
  { name: "INBOX.Sent", total: 0, unseen: 0 },
  { name: "INBOX.Drafts", total: 0, unseen: 0 },
  { name: "INBOX.spam", total: 0, unseen: 0 },
  { name: "INBOX.Trash", total: 0, unseen: 0 },
  { name: "INBOX.Archive", total: 0, unseen: 0 },
];

function FolderSidebar({ folders, activeFolder, onSelect, config, dragOverFolder, onDragOver, onDragLeave, onDrop }) {
  const displayFolders = folders.length > 0 ? folders : DEFAULT_FOLDERS;
  const sorted = [...displayFolders].sort((a, b) => getFolderInfo(a.name).order - getFolderInfo(b.name).order);
  const totalUnread = displayFolders.reduce((sum, f) => sum + (f.name === "INBOX" ? f.unseen : 0), 0);

  return (
    <div className="space-y-4">
      {/* Email info card */}
      <div className="rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4 text-white shadow-lg shadow-blue-500/20">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Mail className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Famika Mail</span>
        </div>
        <p className="text-xs text-white/80 truncate">{config?.email}</p>
        {totalUnread > 0 && (
          <p className="text-xs text-white/70 mt-1">{totalUnread} belum dibaca</p>
        )}
      </div>

      {/* Folder list */}
      <nav className="space-y-0.5">
        {sorted.map((f) => {
          const info = getFolderInfo(f.name);
          const Icon = info.icon;
          const active = f.name === activeFolder;
          return (
            <motion.button
              key={f.name}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(f.name)}
              onDragOver={(e) => { e.preventDefault(); onDragOver?.(f.name); }}
              onDragLeave={() => onDragLeave?.()}
              onDrop={(e) => { e.preventDefault(); onDrop?.(e, f.name); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                dragOverFolder === f.name
                  ? "bg-primary/20 text-primary ring-2 ring-primary/40 font-semibold"
                  : active
                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? info.color : ""}`} />
              <span className="flex-1 text-left truncate">{info.label}</span>
              {f.unseen > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center ${
                    active ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                  }`}
                >
                  {f.unseen}
                </motion.span>
              )}
              {f.unseen === 0 && f.total > 0 && (
                <span className="text-[11px] text-muted-foreground/50">{f.total}</span>
              )}
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}

/* ─── Mobile Folder Dropdown ─── */

function MobileFolderSelect({ folders, activeFolder, onSelect }) {
  const [open, setOpen] = useState(false);
  const info = getFolderInfo(activeFolder);
  const Icon = info.icon;
  const sorted = [...folders].sort((a, b) => getFolderInfo(a.name).order - getFolderInfo(b.name).order);
  const activeData = folders.find(f => f.name === activeFolder);

  return (
    <div className="relative md:hidden">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/50 text-sm w-full border border-border/50 transition-all hover:bg-muted/80">
        <Icon className={`h-4 w-4 ${info.color}`} />
        <span className="flex-1 text-left font-medium">{info.label}</span>
        {activeData?.unseen > 0 && (
          <span className="text-[11px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{activeData.unseen}</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-card border rounded-xl shadow-xl z-20 py-1.5 overflow-hidden">
              {sorted.map((f) => {
                const fi = getFolderInfo(f.name);
                const FIcon = fi.icon;
                return (
                  <button key={f.name} onClick={() => { onSelect(f.name); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                      f.name === activeFolder ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                    }`}>
                    <FIcon className={`h-4 w-4 ${f.name === activeFolder ? fi.color : ""}`} />
                    <span className="flex-1 text-left">{fi.label}</span>
                    {f.unseen > 0 && <span className="text-[11px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{f.unseen}</span>}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Batch Action Bar ─── */

function BatchActionBar({ count, onMarkRead, onMarkUnread, onDelete, onSelectAll, allSelected, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b overflow-hidden"
    >
      <button onClick={onSelectAll} className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
        allSelected ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary"
      }`}>
        {allSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
      <span className="text-sm font-medium text-primary">{count} dipilih</span>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={onMarkRead} className="h-7 text-xs gap-1">
        <MailOpen className="h-3.5 w-3.5" /> Dibaca
      </Button>
      <Button size="sm" variant="ghost" onClick={onMarkUnread} className="h-7 text-xs gap-1">
        <Mail className="h-3.5 w-3.5" /> Belum dibaca
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
        <Trash2 className="h-3.5 w-3.5" /> Hapus
      </Button>
      <button onClick={onClear} className="ml-1 text-muted-foreground hover:text-foreground p-1 rounded"><X className="h-3.5 w-3.5" /></button>
    </motion.div>
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
  const [forwardData, setForwardData] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("INBOX");
  const [folders, setFolders] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [newMailCount, setNewMailCount] = useState(0);
  const [selectedUids, setSelectedUids] = useState(new Set());
  const [deletingUids, setDeletingUids] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const prevTotalRef = useRef(0);
  const loadParamsRef = useRef({ folder: "INBOX", searchQuery: "", page: 1 });

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => { loadParamsRef.current = { folder, searchQuery, page }; }, [folder, searchQuery, page]);

  // Load config
  useEffect(() => {
    (async () => { const r = await api("get-config"); setConfig(r.config); setLoading(false); })();
  }, [api]);

  const loadFolders = useCallback(async () => {
    try { const r = await api("folders"); if (r.folders) setFolders(r.folders); } catch {}
  }, [api]);

  // Update browser tab title with unread count
  useEffect(() => {
    const inboxUnseen = folders.find((f) => f.name === "INBOX")?.unseen || 0;
    const totalUnseen = folders.reduce((sum, f) => sum + (f.unseen || 0), 0);
    const count = totalUnseen || inboxUnseen;
    document.title = count > 0 ? `(${count}) Email - HRD Famika` : "Email - HRD Famika";
    return () => { document.title = "HRD Famika"; };
  }, [folders]);

  const loadInbox = useCallback(async (pg = 1, silent = false) => {
    if (!silent) setLoadingInbox(true);
    // Don't clear inbox on folder switch - keep old data visible while loading
    setPage(pg);
    try {
      let r;
      if (searchQuery) r = await api("search", { query: searchQuery, folder, page: pg, perPage: 20 });
      else r = await api("inbox", { folder, page: pg, perPage: 20 });
      if (silent && r.total > prevTotalRef.current && prevTotalRef.current > 0) {
        const n = r.total - prevTotalRef.current;
        setNewMailCount(n);
        showToast(`${n} email baru diterima`, "info");
        showDesktopNotification(n);
      }
      prevTotalRef.current = r.total || 0;
      setInbox(r);
      setLastRefresh(new Date());
    } catch {}
    if (!silent) setLoadingInbox(false);
  }, [api, folder, searchQuery, showToast]);

  useEffect(() => { if (config) { loadFolders(); loadInbox(); } }, [config]); // eslint-disable-line

  // Request notification permission + load contacts (employees + inbox senders)
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    (async () => {
      try {
        // 1) Employees
        const { data: empData } = await supabase.from("employees").select("name, email").not("email", "is", null).neq("email", "").order("name").limit(500);
        const contactMap = new Map();
        (empData || []).forEach((c) => { if (c.email) contactMap.set(c.email.toLowerCase(), { name: c.name, email: c.email }); });

        // 2) Collect senders from inbox (recent emails)
        try {
          const r = await api("inbox", { folder: "INBOX", page: 1, perPage: 50 });
          (r.messages || []).forEach((m) => {
            if (m.fromEmail && !contactMap.has(m.fromEmail.toLowerCase())) {
              contactMap.set(m.fromEmail.toLowerCase(), { name: m.from || m.fromEmail, email: m.fromEmail });
            }
          });
        } catch {}

        setContacts(Array.from(contactMap.values()));
      } catch {}
    })();
  }, [api]);
  useEffect(() => { if (config) { prevTotalRef.current = 0; setNewMailCount(0); setSelectedUids(new Set()); loadInbox(1); } }, [folder, searchQuery]); // eslint-disable-line

  // Auto-refresh 30s
  useEffect(() => {
    if (!config || readData) return;
    const id = setInterval(async () => {
      const { folder: f, searchQuery: q, page: p } = loadParamsRef.current;
      try {
        let r;
        if (q) r = await api("search", { query: q, folder: f, page: p, perPage: 20 });
        else r = await api("inbox", { folder: f, page: p, perPage: 20 });
        if (r.total > prevTotalRef.current && prevTotalRef.current > 0) {
          const n = r.total - prevTotalRef.current;
          setNewMailCount(n);
          showToast(`${n} email baru diterima`, "info");
        showDesktopNotification(n);
        }
        prevTotalRef.current = r.total || 0;
        setInbox(r);
        setLastRefresh(new Date());
        // Refresh folder counts so tab title updates
        try { const fr = await api("folders"); if (fr.folders) setFolders(fr.folders); } catch {}
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [config, readData, api, showToast]);

  const readEmail = async (msg) => {
    // Instantly show viewer with metadata from inbox list
    setReadMeta({ uid: msg.uid, folder });
    setReadData({
      subject: decodeSubject(msg.subject),
      from: msg.from || "",
      to: "",
      cc: "",
      date: msg.date || "",
      text: "",
      html: "",
      attachments: [],
      _loading: true,
    });
    // Load full email in background
    const r = await api("read", { uid: msg.uid, msgNum: msg.num, folder });
    if (r.parsed) setReadData(r.parsed);
    else setReadData((prev) => prev ? { ...prev, _loading: false, text: "(Gagal memuat email)" } : prev);
  };

  const downloadAttachment = async (index, filename, contentType) => {
    try {
      // Try to get data from readData first (included in read response)
      const att = readData?.attachments?.find(a => a.index === index);
      let b64 = att?.data;
      // Fallback: fetch from server
      if (!b64) {
        const r = await api("attachment", { uid: readMeta?.uid, index, folder: readMeta?.folder });
        b64 = r.data;
      }
      if (b64) {
        const byteChars = atob(b64);
        const byteArrays = [];
        for (let off = 0; off < byteChars.length; off += 1024) {
          const slice = byteChars.slice(off, off + 1024);
          const bytes = new Uint8Array(slice.length);
          for (let i = 0; i < slice.length; i++) bytes[i] = slice.charCodeAt(i);
          byteArrays.push(bytes);
        }
        const blob = new Blob(byteArrays, { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        showToast(`${filename} diunduh`);
      } else {
        showToast("Gagal mengunduh lampiran", "error");
      }
    } catch { showToast("Gagal mengunduh lampiran", "error"); }
  };

  const handleSend = async (data) => {
    setSending(true);
    try {
      await api("send", data);
      setSending(false);
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setShowCompose(false);
        setReplyTo(null);
        setForwardData(null);
        loadInbox(page);
      }, 1800);
    } catch {
      setSending(false);
      showToast("Gagal mengirim email", "error");
    }
  };

  const deleteEmail = async (uid) => {
    setDeletingUids((prev) => new Set([...prev, uid]));
    try {
      await api("delete", { uid, folder });
      showToast(folder.toLowerCase().includes("trash") ? "Email dihapus permanen" : "Email dipindahkan ke Trash");
    } catch { showToast("Gagal menghapus", "error"); }
    setTimeout(() => {
      setDeletingUids(new Set());
      if (readData) { setReadData(null); setReadMeta(null); }
      loadInbox(page);
      loadFolders();
    }, 350);
  };

  const batchDelete = async () => {
    const uids = [...selectedUids];
    setDeletingUids(new Set(uids));
    try {
      await api("delete", { uids, folder });
      showToast(`${uids.length} email dihapus`);
    } catch { showToast("Gagal menghapus", "error"); }
    setTimeout(() => {
      setDeletingUids(new Set());
      setSelectedUids(new Set());
      loadInbox(page);
      loadFolders();
    }, 350);
  };

  const markEmail = async (uid, seen) => {
    await api("mark", { uid, seen, folder });
    setInbox((prev) => prev ? { ...prev, messages: prev.messages.map((m) => m.uid === uid ? { ...m, seen } : m) } : prev);
  };

  const batchMark = async (seen) => {
    const uids = [...selectedUids];
    await api("mark", { uids, seen, folder });
    setInbox((prev) => prev ? { ...prev, messages: prev.messages.map((m) => uids.includes(m.uid) ? { ...m, seen } : m) } : prev);
    setSelectedUids(new Set());
    showToast(seen ? "Ditandai sudah dibaca" : "Ditandai belum dibaca");
  };

  const toggleStar = async (uid, flagged) => {
    await api("star", { uid, flagged, folder });
    setInbox((prev) => prev ? { ...prev, messages: prev.messages.map((m) => m.uid === uid ? { ...m, flagged } : m) } : prev);
  };

  const archiveEmail = async (uid) => {
    try {
      await api("move", { uid, folder, destination: "INBOX.Archive" });
      showToast("Email diarsipkan");
      if (readData) { setReadData(null); setReadMeta(null); }
      loadInbox(page);
      loadFolders();
    } catch { showToast("Gagal mengarsipkan", "error"); }
  };

  const toggleSelect = (uid) => {
    setSelectedUids((prev) => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  };

  const selectAll = () => {
    if (inbox && selectedUids.size === inbox.messages.length) setSelectedUids(new Set());
    else if (inbox) setSelectedUids(new Set(inbox.messages.map((m) => m.uid)));
  };

  const switchFolder = (f) => {
    setFolder(f); setPage(1); setSearchQuery(""); setSearchInput(""); setReadData(null); setReadMeta(null);
    setNewMailCount(0); setSelectedUids(new Set()); prevTotalRef.current = 0;
  };

  const handleSearch = (e) => { e.preventDefault(); if (searchInput.trim()) { setSearchQuery(searchInput.trim()); setPage(1); } };
  const clearSearch = () => { setSearchQuery(""); setSearchInput(""); setPage(1); };
  const handleReply = (info) => { setReplyTo(info); setForwardData(null); setShowCompose(true); };
  const handleForward = (data) => { setForwardData(data); setReplyTo(null); setShowCompose(true); };
  const handleDisconnect = async () => { await api("delete-config"); setConfig(null); setInbox(null); setFolders([]); };
  const handleRefresh = () => { setNewMailCount(0); loadFolders(); loadInbox(page); };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </motion.div>
      </div>
    </Layout>
  );
  if (!config) return <Layout><EmailSetup onDone={() => window.location.reload()} api={api} /></Layout>;

  const folderInfo = getFolderInfo(folder);
  const totalPages = inbox ? Math.ceil(inbox.total / 20) : 0;
  const isTrash = folder.toLowerCase().includes("trash");

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex gap-3 lg:gap-4">
        {/* ── Desktop Sidebar ── */}
        <aside className="hidden md:block w-52 flex-shrink-0 space-y-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => { setReplyTo(null); setForwardData(null); setShowCompose(true); }}
              className="w-full gap-2.5 h-11 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 shadow-lg shadow-blue-500/25 rounded-xl text-sm font-semibold"
            >
              <PenSquare className="h-4 w-4" /> Tulis Email
            </Button>
          </motion.div>
          <FolderSidebar folders={folders} activeFolder={folder} onSelect={switchFolder} config={config}
            dragOverFolder={dragOverFolder}
            onDragOver={(name) => setDragOverFolder(name)}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e, destFolder) => {
              try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                if (data.uid && destFolder !== folder) {
                  api("move", { uid: data.uid, folder, destination: destFolder }).then(() => {
                    showToast(`Email dipindahkan ke ${getFolderInfo(destFolder).label}`);
                    loadInbox(page); loadFolders();
                  });
                }
              } catch {}
              setDragOverFolder(null);
            }}
          />
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {readData ? (
            <EmailViewer
              data={readData}
              folderLabel={folderInfo.label}
              isTrash={isTrash}
              onBack={() => { setReadData(null); setReadMeta(null); }}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={() => readMeta && deleteEmail(readMeta.uid)}
              onMarkUnread={() => { if (readMeta) { markEmail(readMeta.uid, false); setReadData(null); setReadMeta(null); } }}
              onArchive={() => readMeta && archiveEmail(readMeta.uid)}
              onDownloadAttachment={downloadAttachment}
            />
          ) : (
            <>
              {/* ── Header ── */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20"
                  >
                    <Mail className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-xl font-bold">{folderInfo.label}</h1>
                    <p className="text-xs text-muted-foreground">{config.email} {inbox ? `\u00B7 ${inbox.total} email` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.div whileTap={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                    <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loadingInbox} className="h-9 w-9 rounded-lg">
                      <RefreshCw className={`h-4 w-4 ${loadingInbox ? "animate-spin" : ""}`} />
                    </Button>
                  </motion.div>
                  <Button size="sm" onClick={() => { setReplyTo(null); setForwardData(null); setShowCompose(true); }}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 shadow-md rounded-lg md:hidden">
                    <PenSquare className="h-3.5 w-3.5" /> Tulis
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDisconnect} className="h-9 w-9 rounded-lg text-muted-foreground" title="Putuskan email">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ── Mobile Folder ── */}
              <MobileFolderSelect folders={folders} activeFolder={folder} onSelect={switchFolder} />

              {/* ── Search ── */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari email..." className="pl-10 pr-10 h-10 text-sm rounded-xl border-border/60 bg-muted/30 focus:bg-card" />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              {/* ── Search Indicator ── */}
              <AnimatePresence>
                {searchQuery && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground px-1 overflow-hidden">
                    <Search className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Hasil pencarian &ldquo;{searchQuery}&rdquo; {inbox ? `\u00B7 ${inbox.total} ditemukan` : ""}</span>
                    <button onClick={clearSearch} className="text-primary hover:underline text-xs font-medium ml-1">Hapus</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── New Mail Notification ── */}
              <AnimatePresence>
                {newMailCount > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -10, height: 0 }}
                    className="overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/40 px-4 py-2.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5 text-sm">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                          <Bell className="h-4 w-4 text-blue-500" />
                        </motion.div>
                        <span className="font-medium text-blue-700 dark:text-blue-300">{newMailCount} email baru</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                        onClick={() => { setNewMailCount(0); loadInbox(1); }}>
                        Muat
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Email List ── */}
              <Card className="overflow-hidden shadow-md border-0 bg-card/90 backdrop-blur-sm rounded-xl">
                {/* Batch action bar */}
                <AnimatePresence>
                  {selectedUids.size > 0 && (
                    <BatchActionBar
                      count={selectedUids.size}
                      allSelected={inbox && selectedUids.size === inbox.messages.length}
                      onSelectAll={selectAll}
                      onMarkRead={() => batchMark(true)}
                      onMarkUnread={() => batchMark(false)}
                      onDelete={batchDelete}
                      onClear={() => setSelectedUids(new Set())}
                    />
                  )}
                </AnimatePresence>

                {loadingInbox && !inbox ? (
                  <EmailSkeleton />
                ) : !inbox?.messages?.length ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      {searchQuery ? <Search className="h-8 w-8 text-muted-foreground/30" /> : <Inbox className="h-8 w-8 text-muted-foreground/30" />}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {searchQuery ? "Tidak ada hasil" : `${folderInfo.label} kosong`}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {searchQuery ? "Coba kata kunci lain" : "Email yang masuk akan muncul di sini"}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <div>
                      {inbox.messages.map((msg, i) => {
                        const subject = decodeSubject(msg.subject);
                        const sender = parseSender(msg.from);
                        const isReading = readingMsg === (msg.uid || msg.num);
                        const isDeleting = deletingUids.has(msg.uid);
                        const isSelected = selectedUids.has(msg.uid);

                        return (
                          <div
                            key={msg.uid || msg.num || i}
                            className={`transition-all duration-300 ${isDeleting ? "opacity-0 -translate-x-12 max-h-0 overflow-hidden" : ""}`}
                          >
                            <div
                              draggable
                              onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ uid: msg.uid })); e.dataTransfer.effectAllowed = "move"; }}
                              onClick={() => !isReading && !isDeleting && readEmail(msg)}
                              className={`group relative flex items-center gap-3 px-4 py-3.5 border-b border-border/30 transition-all cursor-pointer
                                ${!msg.seen ? "bg-primary/[0.03]" : ""}
                                ${isSelected ? "bg-primary/[0.08]" : "hover:bg-muted/60"}
                              `}
                            >
                              {/* Avatar / Checkbox */}
                              <div className="relative h-10 w-10 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelect(msg.uid); }}>
                                {/* Avatar */}
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getGradient(sender.name)} flex items-center justify-center text-white text-xs font-bold shadow-sm transition-all duration-200 ${
                                  isSelected ? "scale-0 opacity-0" : "group-hover:scale-0 group-hover:opacity-0"
                                }`}>
                                  {getInitial(sender.name)}
                                </div>
                                {/* Checkbox */}
                                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                                  isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                }`}>
                                  <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                                    isSelected ? "bg-primary border-primary shadow-md shadow-primary/30" : "border-muted-foreground/40 hover:border-primary bg-card"
                                  }`}>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                  </div>
                                </div>
                              </div>

                              {/* Star */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleStar(msg.uid, !msg.flagged); }}
                                className={`flex-shrink-0 transition-all ${msg.flagged ? "text-amber-400 scale-110" : "text-muted-foreground/25 hover:text-amber-400"}`}
                              >
                                <Star className={`h-4 w-4 ${msg.flagged ? "fill-current" : ""}`} />
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-sm truncate ${!msg.seen ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                    {sender.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground/70 flex-shrink-0 tabular-nums">
                                    {formatDate(msg.date)}
                                  </span>
                                </div>
                                <p className={`text-sm truncate ${!msg.seen ? "font-medium text-foreground/90" : "text-muted-foreground/70"}`}>
                                  {subject}
                                </p>
                              </div>

                              {/* Hover actions */}
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); archiveEmail(msg.uid); }}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors" title="Arsipkan">
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); markEmail(msg.uid, !msg.seen); }}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
                                  title={msg.seen ? "Tandai belum dibaca" : "Tandai sudah dibaca"}>
                                  {msg.seen ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteEmail(msg.uid); }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground/50 hover:text-red-500 transition-colors" title="Hapus">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Unread dot (shown when not hovering) */}
                              <div className="flex-shrink-0 group-hover:hidden w-5 flex justify-center">
                                {isReading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : !msg.seen ? (
                                  <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t border-border/30">
                        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => loadInbox(page - 1)} className="gap-1 rounded-lg">
                          <ArrowLeft className="h-3.5 w-3.5" /> Sebelumnya
                        </Button>
                        <span className="text-xs text-muted-foreground font-medium tabular-nums">{page} / {totalPages}</span>
                        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => loadInbox(page + 1)} className="gap-1 rounded-lg">
                          Selanjutnya <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                        </Button>
                      </div>
                    )}

                    {/* Last refresh */}
                    {lastRefresh && (
                      <div className="text-[11px] text-muted-foreground/50 text-center py-2 bg-muted/10">
                        Diperbarui {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} &middot; Auto-refresh 30s
                      </div>
                    )}
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && (
          <ComposeDialog
            onClose={() => { if (!sendSuccess) { setShowCompose(false); setReplyTo(null); setForwardData(null); } }}
            onSend={handleSend}
            sending={sending}
            sendSuccess={sendSuccess}
            replyTo={replyTo}
            forwardData={forwardData}
            contacts={contacts}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </Layout>
  );
}
