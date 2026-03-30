import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bot,
  Send,
  User,
  Trash2,
  Loader2,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const SUPA_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const GREETING = "Halo! Saya AI Assistant HRD Famika. Ada yang bisa saya bantu?";

/* ───────────── Markdown Renderer ───────────── */

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-3 mb-1">{renderInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-3 mb-1">{renderInline(line.slice(2))}</h1>);
      i++; continue;
    }
    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <pre key={`code-${i}`} className="bg-zinc-900 text-zinc-100 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }
    if (/^[\*\-]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\*\-]\s/.test(lines[i])) { items.push(lines[i].replace(/^[\*\-]\s/, "")); i++; }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-1.5">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }
    if (/^\d+[\.\)]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+[\.\)]\s/, "")); i++; }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-1.5">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }
    if (line.trim() === "") { elements.push(<div key={i} className="h-2" />); i++; continue; }
    elements.push(<p key={i} className="my-0.5">{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

function renderInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const matches = [
      boldMatch && { type: "bold", match: boldMatch },
      codeMatch && { type: "code", match: codeMatch },
      italicMatch && { type: "italic", match: italicMatch },
    ].filter(Boolean).sort((a, b) => a.match.index - b.match.index);

    if (matches.length === 0) { parts.push(<span key={key++}>{remaining}</span>); break; }
    const first = matches[0];
    const idx = first.match.index;
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    if (first.type === "bold") parts.push(<strong key={key++} className="font-semibold">{first.match[1]}</strong>);
    else if (first.type === "code") parts.push(<code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{first.match[1]}</code>);
    else if (first.type === "italic") parts.push(<em key={key++} className="italic">{first.match[1]}</em>);
    remaining = remaining.slice(idx + first.match[0].length);
  }
  return parts;
}

/* ───────────── Message Components ───────────── */

function AssistantMessage({ content, isAnimating }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  const prevBlockCountRef = useRef(0);
  const blockCount = rendered ? rendered.length : 0;

  useEffect(() => {
    const t = setTimeout(() => { prevBlockCountRef.current = blockCount; }, 350);
    return () => clearTimeout(t);
  }, [blockCount]);

  return (
    <div className="flex gap-3 w-full">
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mt-0.5">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0 text-sm leading-relaxed text-foreground">
        {!content ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Mengetik...
          </span>
        ) : (
          rendered.map((el, i) => {
            const isNew = isAnimating && i >= prevBlockCountRef.current;
            return (
              <motion.div
                key={`b-${i}`}
                initial={isNew ? { opacity: 0, x: -12 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {el}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UserMessage({ content }) {
  return (
    <div className="flex gap-3 justify-end w-full">
      <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground">
        {content}
      </div>
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mt-0.5">
        <User className="h-3.5 w-3.5 text-white" />
      </div>
    </div>
  );
}

/* ───────────── History Sidebar ───────────── */

function HistorySidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onToggle }) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ width: isOpen ? 280 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-shrink-0 overflow-hidden border-r border-border bg-card/50 h-full relative z-40 md:relative md:z-auto"
        style={{ position: isOpen ? undefined : undefined }}
      >
        <div className="w-[280px] h-full flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b border-border">
            <Button
              onClick={onNew}
              className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="sm"
            >
              <Plus className="h-4 w-4" /> Chat Baru
            </Button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada riwayat chat
              </p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  conv.id === activeId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 opacity-50" />
                <span className="flex-1 truncate">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ───────────── Main Component ───────────── */

export default function AdminAiChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [animatingIdx, setAnimatingIdx] = useState(-1);
  const messagesEndRef = useRef(null);

  // History state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Reveal system
  const fullContentRef = useRef("");
  const revealedLenRef = useRef(0);
  const revealIntervalRef = useRef(null);
  const streamDoneRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const stopReveal = useCallback(() => {
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
  }, []);

  const startReveal = useCallback((assistantIdx) => {
    stopReveal();
    revealIntervalRef.current = setInterval(() => {
      const full = fullContentRef.current;
      const current = revealedLenRef.current;
      if (current < full.length) {
        const backlog = full.length - current;
        const step = Math.max(1, Math.ceil(backlog / 12));
        revealedLenRef.current = Math.min(current + step, full.length);
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantIdx] = { role: "assistant", content: full.slice(0, revealedLenRef.current) };
          return updated;
        });
      } else if (streamDoneRef.current) {
        stopReveal();
        setIsBusy(false);
        setAnimatingIdx(-1);
      }
    }, 20);
  }, [stopReveal]);

  useEffect(() => { return () => stopReveal(); }, [stopReveal]);

  /* ───────── Supabase: Load conversations ───────── */

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* ───────── Supabase: Load messages for a conversation ───────── */

  const loadMessages = useCallback(async (convId) => {
    stopReveal();
    setIsBusy(false);
    setAnimatingIdx(-1);
    setActiveConvId(convId);

    const { data } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setMessages(data);
    } else {
      setMessages([{ role: "assistant", content: GREETING }]);
    }
  }, [stopReveal]);

  /* ───────── Supabase: Save message ───────── */

  const saveMessage = useCallback(async (convId, role, content) => {
    await supabase.from("ai_messages").insert({ conversation_id: convId, role, content });
  }, []);

  /* ───────── Supabase: Create conversation ───────── */

  const createConversation = useCallback(async (title) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: session.user.id, title })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id;
  }, []);

  /* ───────── Supabase: Update conversation title ───────── */

  const updateConvTitle = useCallback(async (convId, title) => {
    await supabase
      .from("ai_conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", convId);
  }, []);

  /* ───────── Supabase: Delete conversation ───────── */

  const deleteConversation = useCallback(async (convId) => {
    await supabase.from("ai_messages").delete().eq("conversation_id", convId);
    await supabase.from("ai_conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(null);
      setMessages([{ role: "assistant", content: GREETING }]);
    }
  }, [activeConvId]);

  /* ───────── New Chat ───────── */

  const handleNewChat = useCallback(() => {
    stopReveal();
    setIsBusy(false);
    setAnimatingIdx(-1);
    setActiveConvId(null);
    setMessages([{ role: "assistant", content: GREETING }]);
    setInput("");
  }, [stopReveal]);

  /* ───────── Send Message ───────── */

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isBusy) return;

    const userMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    const assistantIdx = newMessages.length;

    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsBusy(true);
    setAnimatingIdx(assistantIdx);

    fullContentRef.current = "";
    revealedLenRef.current = 0;
    streamDoneRef.current = false;
    startReveal(assistantIdx);

    // Create or reuse conversation
    let convId = activeConvId;
    if (!convId) {
      const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
      convId = await createConversation(title);
      if (!convId) {
        fullContentRef.current = "Gagal membuat percakapan. Silakan coba lagi.";
        streamDoneRef.current = true;
        return;
      }
      setActiveConvId(convId);
    } else {
      // Update timestamp
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    // Save user message
    await saveMessage(convId, "user", text);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(SUPA_FUNCTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta =
              parsed.choices?.[0]?.delta?.content ||
              parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
            fullContentRef.current += delta;
          } catch {}
        }
      }

      if (!fullContentRef.current) {
        fullContentRef.current = "Maaf, tidak ada respon dari AI.";
      }

      // Save assistant response
      await saveMessage(convId, "assistant", fullContentRef.current);
      loadConversations();
    } catch (error) {
      console.error("AI Chat error:", error);
      fullContentRef.current =
        fullContentRef.current || "Maaf, terjadi kesalahan. Silakan coba lagi.";
      await saveMessage(convId, "assistant", fullContentRef.current);
    } finally {
      streamDoneRef.current = true;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-5rem)] -m-4 sm:-m-6 md:-m-8">
        {/* History Sidebar */}
        <HistorySidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={loadMessages}
          onNew={handleNewChat}
          onDelete={deleteConversation}
          isOpen={historyOpen}
          onToggle={() => setHistoryOpen(!historyOpen)}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="h-8 w-8"
            >
              {historyOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  AI Assistant
                </h1>
                <p className="text-xs text-muted-foreground">
                  Tanyakan apapun seputar HRD & manajemen karyawan
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-2 text-muted-foreground hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Chat Baru</span>
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {msg.role === "assistant" ? (
                      <AssistantMessage
                        content={msg.content}
                        isAnimating={i === animatingIdx}
                      />
                    ) : (
                      <UserMessage content={msg.content} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
                className="resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isBusy}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isBusy}
                size="icon"
                className="h-[44px] w-[44px] flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
