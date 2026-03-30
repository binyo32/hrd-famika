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
  ChevronDown,
  Sparkles,
  Cpu,
  Globe,
  Search,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const SUPA_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const GREETING = "Halo! Saya AI Assistant HRD Famika. Ada yang bisa saya bantu?";

/* ───────────── Markdown Renderer (Full) ───────────── */

function isTableSeparator(line) {
  return /^\|?[\s\-:]+(\|[\s\-:]+)+\|?\s*$/.test(line);
}

function isTableRow(line) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function parseTableCells(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function parseTableAlign(line) {
  return parseTableCells(line).map((c) => {
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Heading ──
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const cls = [
        "", "text-xl font-bold mt-4 mb-1.5",
        "text-lg font-bold mt-3 mb-1",
        "text-base font-bold mt-3 mb-1",
        "text-sm font-bold mt-2 mb-1 uppercase tracking-wide text-muted-foreground",
      ][level];
      const Tag = `h${level}`;
      elements.push(<Tag key={i} className={cls}>{renderInline(content)}</Tag>);
      i++; continue;
    }

    // ── Code block ──
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden border border-border">
          {lang && (
            <div className="bg-zinc-800 text-zinc-400 text-xs px-3 py-1 font-mono">{lang}</div>
          )}
          <pre className="bg-zinc-900 text-zinc-100 p-3 overflow-x-auto text-sm font-mono">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // ── Table ──
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableCells(line);
      const aligns = parseTableAlign(lines[i + 1]);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableCells(lines[i]));
        i++;
      }
      elements.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 font-semibold text-left border-b border-border" style={{ textAlign: aligns[j] || "left" }}>
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 border-b border-border/50" style={{ textAlign: aligns[ci] || "left" }}>
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Blockquote ──
    if (line.startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-4 border-primary/40 pl-4 py-1 my-2 text-muted-foreground italic">
          {quoteLines.map((ql, j) => <p key={j} className="my-0.5">{renderInline(ql)}</p>)}
        </blockquote>
      );
      continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-3 border-border" />);
      i++; continue;
    }

    // ── Checkbox list ──
    if (/^[\*\-]\s\[[ xX]\]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\*\-]\s\[[ xX]\]\s/.test(lines[i])) {
        const checked = /\[[xX]\]/.test(lines[i]);
        const content = lines[i].replace(/^[\*\-]\s\[[ xX]\]\s/, "");
        items.push({ checked, content });
        i++;
      }
      elements.push(
        <ul key={`cb-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center text-xs ${item.checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/40"}`}>
                {item.checked && "✓"}
              </span>
              <span className={item.checked ? "line-through text-muted-foreground" : ""}>{renderInline(item.content)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Unordered list (with nested indent support) ──
    if (/^[\*\-]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\*\-]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\*\-]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-1.5 marker:text-primary/60">
          {items.map((item, j) => <li key={j} className="leading-relaxed">{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // ── Ordered list ──
    if (/^\d+[\.\)]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[\.\)]\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-1.5 marker:text-primary/60 marker:font-semibold">
          {items.map((item, j) => <li key={j} className="leading-relaxed">{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // ── Empty line ──
    if (line.trim() === "") { elements.push(<div key={i} className="h-2" />); i++; continue; }

    // ── Normal paragraph ──
    elements.push(<p key={i} className="my-0.5 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return elements;
}

/* ── Inline renderer: bold, italic, bold-italic, strikethrough, code, links ── */

function renderInline(text) {
  if (!text) return null;
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Find the earliest match of any inline pattern
    const patterns = [
      { type: "bolditalic", regex: /\*\*\*(.+?)\*\*\*/ },
      { type: "bold", regex: /\*\*(.+?)\*\*/ },
      { type: "italic", regex: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/ },
      { type: "strikethrough", regex: /~~(.+?)~~/ },
      { type: "code", regex: /`([^`]+)`/ },
      { type: "link", regex: /\[([^\]]+)\]\(([^)]+)\)/ },
      { type: "autolink", regex: /(https?:\/\/[^\s<>)\]]+)/ },
    ];

    let earliest = null;
    for (const p of patterns) {
      const m = remaining.match(p.regex);
      if (m && (!earliest || m.index < earliest.match.index)) {
        earliest = { type: p.type, match: m };
      }
    }

    if (!earliest) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const { type, match } = earliest;
    const idx = match.index;

    // Text before the match
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);

    switch (type) {
      case "bolditalic":
        parts.push(<strong key={key++} className="font-bold italic">{renderInline(match[1])}</strong>);
        break;
      case "bold":
        parts.push(<strong key={key++} className="font-semibold">{renderInline(match[1])}</strong>);
        break;
      case "italic":
        parts.push(<em key={key++} className="italic">{renderInline(match[1])}</em>);
        break;
      case "strikethrough":
        parts.push(<del key={key++} className="line-through text-muted-foreground">{renderInline(match[1])}</del>);
        break;
      case "code":
        parts.push(
          <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-primary/90">
            {match[1]}
          </code>
        );
        break;
      case "link":
        parts.push(
          <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
            {match[1]}
          </a>
        );
        break;
      case "autolink":
        parts.push(
          <a key={key++} href={match[1]} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all">
            {match[1]}
          </a>
        );
        break;
    }

    remaining = remaining.slice(idx + match[0].length);
  }

  return parts;
}

/* ───────────── Message Components ───────────── */

function AssistantMessage({ content, isAnimating }) {
  const rendered = useMemo(() => renderMarkdown(content?.replace(/^\n+/, "")), [content]);
  const prevBlockCountRef = useRef(0);
  const blockCount = rendered ? rendered.length : 0;

  useEffect(() => {
    const t = setTimeout(() => { prevBlockCountRef.current = blockCount; }, 350);
    return () => clearTimeout(t);
  }, [blockCount]);

  // Split first block and rest so icon sits next to first line
  // Skip leading empty spacer divs to find real first content block
  let firstIdx = 0;
  if (rendered) {
    while (firstIdx < rendered.length && rendered[firstIdx]?.props?.className === "h-2") {
      firstIdx++;
    }
  }
  const firstBlock = rendered ? rendered[firstIdx] || rendered[0] : null;
  const restBlocks = rendered ? rendered.slice(firstIdx + 1) : [];

  return (
    <div className="w-full text-sm leading-relaxed text-foreground">
      {!content ? (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Mengetik...
          </span>
        </div>
      ) : (
        <>
          {/* First block: icon + content side by side */}
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mt-0.5">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <motion.div
                key="b-0"
                initial={isAnimating && 0 >= prevBlockCountRef.current ? { opacity: 0, x: -12 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {firstBlock}
              </motion.div>
            </div>
          </div>
          {/* Rest of blocks: full width, indented to match */}
          {restBlocks.length > 0 && (
            <div className="pl-10">
              {restBlocks.map((el, i) => {
                const idx = i + 1;
                const isNew = isAnimating && idx >= prevBlockCountRef.current;
                return (
                  <motion.div
                    key={`b-${idx}`}
                    initial={isNew ? { opacity: 0, x: -12 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    {el}
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
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

/* ───────────── Search Indicator ───────────── */

function SearchIndicator({ searchState }) {
  if (!searchState || searchState.status === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 w-full"
    >
      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mt-0.5">
        <Globe className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Searching status */}
        {searchState.status === "searching" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-3.5 w-3.5 animate-pulse" />
            <span>Mencari di web: <strong className="text-foreground">{searchState.query}</strong></span>
            <Loader2 className="h-3 w-3 animate-spin" />
          </div>
        )}

        {/* Search results coming in */}
        {searchState.status === "results" && (
          <div className="text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Search className="h-3.5 w-3.5" />
              <span>Hasil pencarian: <strong className="text-foreground">{searchState.query}</strong></span>
              {!searchState.done && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <div className="space-y-1 pl-0.5">
              {searchState.results.map((r, i) => (
                <motion.a
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline underline-offset-2 py-0.5"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{r.title}</span>
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Search done */}
        {searchState.status === "done" && (
          <div className="text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Search className="h-3.5 w-3.5 text-green-500" />
              <span>Ditemukan {searchState.results.length} sumber untuk: <strong className="text-foreground">{searchState.query}</strong></span>
            </div>
            <div className="space-y-1 pl-0.5">
              {searchState.results.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline underline-offset-2 py-0.5"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{r.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ───────────── Sources Footer ───────────── */

function SourcesFooter({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        <Globe className="h-3 w-3" /> Sumber:
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md text-primary hover:bg-muted/80 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{s.title}</span>
          </a>
        ))}
      </div>
    </div>
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

  // Model selector
  const [availableModels, setAvailableModels] = useState([
    { id: "gemini", name: "Gemini 2.5 Flash", available: true },
  ]);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem("ai-chat-model") || "gemini"
  );
  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  // History state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Search state
  const [searchState, setSearchState] = useState({ status: "idle", query: "", results: [], done: false });
  const [lastSources, setLastSources] = useState([]);

  // Reveal system
  const fullContentRef = useRef("");
  const revealedLenRef = useRef(0);
  const revealIntervalRef = useRef(null);
  const streamDoneRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, searchState]);

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

  // Fetch available models from edge function
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(SUPA_FUNCTIONS_URL, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.models?.length) setAvailableModels(data.models);
        }
      } catch {}
    })();
  }, []);

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
    setSearchState({ status: "idle", query: "", results: [], done: false });
    setLastSources([]);
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
          model: selectedModel,
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
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);

            // Search events from edge function
            if (parsed.search) {
              setSearchState({ status: "searching", query: parsed.query, results: [], done: false });
              continue;
            }
            if (parsed.searchResult) {
              setSearchState((prev) => ({
                ...prev,
                status: "results",
                results: [...prev.results, parsed.searchResult],
              }));
              continue;
            }
            if (parsed.searchDone) {
              setSearchState((prev) => ({ ...prev, status: "done", done: true }));
              continue;
            }
            if (parsed.sources) {
              setLastSources(parsed.sources);
              continue;
            }

            // Normal text delta
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

  // Context limit detection (~4 chars per token estimate)
  const CONTEXT_LIMIT = selectedModel === "custom" ? 32768 : 100000;
  const WARN_THRESHOLD = 0.85;
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const estimatedTokens = Math.round(totalChars / 4);
  const contextUsage = estimatedTokens / CONTEXT_LIMIT;
  const isContextFull = contextUsage >= 0.95;
  const isContextWarning = contextUsage >= WARN_THRESHOLD && !isContextFull;

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

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm"
                disabled={isBusy}
              >
                {selectedModel === "gemini" ? (
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                ) : (
                  <Cpu className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span className="hidden sm:inline">
                  {availableModels.find((m) => m.id === selectedModel)?.name || "Gemini"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {modelMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-lg p-1"
                    >
                      {availableModels.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m.id);
                            localStorage.setItem("ai-chat-model", m.id);
                            setModelMenuOpen(false);
                          }}
                          disabled={!m.available}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedModel === m.id
                              ? "bg-primary/10 text-primary font-medium"
                              : m.available
                                ? "hover:bg-muted"
                                : "opacity-40 cursor-not-allowed"
                          }`}
                        >
                          {m.id === "gemini" ? (
                            <Sparkles className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Cpu className="h-4 w-4 text-emerald-500" />
                          )}
                          <div className="flex-1 text-left">
                            <div>{m.name}</div>
                            {!m.available && (
                              <div className="text-xs text-muted-foreground">Tidak tersedia</div>
                            )}
                          </div>
                          {selectedModel === m.id && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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

              {/* Search indicator - shown while searching */}
              {searchState.status !== "idle" && (
                <SearchIndicator searchState={searchState} />
              )}

              {/* Sources footer - shown after response with web search */}
              {!isBusy && lastSources.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pl-10"
                >
                  <SourcesFooter sources={lastSources} />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Context limit banner */}
          <AnimatePresence>
            {(isContextFull || isContextWarning) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`px-4 py-3 border-t ${isContextFull ? "bg-destructive/10 border-destructive/30" : "bg-yellow-500/10 border-yellow-500/30"}`}
              >
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                  <p className={`text-sm ${isContextFull ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}`}>
                    {isContextFull
                      ? "Context penuh. Percakapan ini sudah mencapai batas maksimal. Silakan mulai chat baru."
                      : `Context hampir penuh (${Math.round(contextUsage * 100)}%). Pertimbangkan untuk memulai chat baru.`}
                  </p>
                  <Button
                    onClick={handleNewChat}
                    size="sm"
                    className="flex-shrink-0 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Chat Baru
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-3">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isContextFull ? "Context penuh — klik Chat Baru untuk melanjutkan" : "Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"}
                className="resize-none min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={isBusy || isContextFull}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isBusy || isContextFull}
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
