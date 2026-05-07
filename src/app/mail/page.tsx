"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Inbox,
  RefreshCw,
  Send,
  Trash2,
  Reply,
  Loader2,
  X,
  ChevronRight,
  AlertCircle,
  PenSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MailInbox {
  inbox_id: string;       // primary key (same as email for custom domains)
  email: string;
  display_name?: string;
}

interface MailMessage {
  message_id: string;
  inbox_id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  timestamp?: string;
  preview?: string;
  text?: string;
  html?: string;
  extracted_text?: string;
  labels?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInboxEmail(inbox: MailInbox): string {
  return inbox.email || inbox.inbox_id;
}

function getInboxDisplayName(inbox: MailInbox): string {
  return inbox.display_name || inbox.email || inbox.inbox_id;
}

function getMessageFrom(msg: MailMessage): string {
  return msg.from || "Unknown";
}

function getMessageSubject(msg: MailMessage): string {
  return msg.subject || "(No subject)";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeModalProps {
  fromInbox: MailInbox;
  replyTo?: MailMessage;
  onClose: () => void;
  onSent: () => void;
}

function ComposeModal({ fromInbox, replyTo, onClose, onSent }: ComposeModalProps) {
  const [to, setTo] = useState(replyTo ? getMessageFrom(replyTo) : "");
  const [subject, setSubject] = useState(replyTo ? `Re: ${getMessageSubject(replyTo)}` : "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inbox_id: getInboxEmail(fromInbox),
          to: [to.trim()],
          subject: subject.trim(),
          text: body,
          html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
        setSending(false);
        return;
      }
      onSent();
      onClose();
    } catch (err) {
      setError(String(err));
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-6"
      style={{ pointerEvents: "none" }}
    >
      <form
        onSubmit={handleSend}
        className="rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: 520,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--line)", background: "var(--bg)" }}
        >
          <span className="text-sm font-semibold">{replyTo ? "Reply" : "New Message"}</span>
          <button type="button" onClick={onClose} style={{ color: "var(--ink-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs w-16 flex-none" style={{ color: "var(--ink-3)" }}>From</span>
            <span className="text-xs" style={{ color: "var(--ink-2)" }}>{getInboxEmail(fromInbox)}</span>
          </div>
          <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs w-16 flex-none" style={{ color: "var(--ink-3)" }}>To</span>
            <input
              autoFocus
              required
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: "var(--ink)" }}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="flex items-center px-4 py-2 border-b" style={{ borderColor: "var(--line)" }}>
            <span className="text-xs w-16 flex-none" style={{ color: "var(--ink-3)" }}>Subject</span>
            <input
              required
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: "var(--ink)" }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>
          <textarea
            className="px-4 py-3 text-sm bg-transparent outline-none resize-none"
            style={{ color: "var(--ink)", minHeight: 160 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
          />
        </div>

        {error && (
          <div className="px-4 pb-2 text-xs" style={{ color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: "var(--line)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ color: "var(--ink-3)", border: "1px solid var(--line)" }}
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg"
            style={{ background: "#10b981", color: "#000", opacity: sending ? 0.7 : 1 }}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Message Detail ───────────────────────────────────────────────────────────

interface MessageDetailProps {
  inboxId: string;
  messageId: string;
  onReply: (msg: MailMessage) => void;
  onDelete: (msg: MailMessage) => void;
}

function MessageDetail({ inboxId, messageId, onReply, onDelete }: MessageDetailProps) {
  const [message, setMessage] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(
      `/api/mail/messages/${encodeURIComponent(messageId)}?inbox_id=${encodeURIComponent(inboxId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setMessage(data);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [inboxId, messageId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--ink-3)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: "var(--ink-3)" }}>
        <AlertCircle className="w-5 h-5" />
        <p className="text-sm">{error || "Message not found"}</p>
      </div>
    );
  }

  const toAddrs = Array.isArray(message.to) ? message.to.join(", ") : "";
  const bodyText = message.text || message.extracted_text;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex-none"
        style={{ borderColor: "var(--line)" }}
      >
        <h2 className="font-semibold text-[16px] mb-3">{getMessageSubject(message)}</h2>
        <div className="flex flex-col gap-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
          <div className="flex items-center gap-2">
            <span className="w-10 flex-none text-right">From</span>
            <span style={{ color: "var(--ink-2)" }}>{getMessageFrom(message)}</span>
          </div>
          {toAddrs && (
            <div className="flex items-center gap-2">
              <span className="w-10 flex-none text-right">To</span>
              <span style={{ color: "var(--ink-2)" }}>{toAddrs}</span>
            </div>
          )}
          {message.timestamp && (
            <div className="flex items-center gap-2">
              <span className="w-10 flex-none text-right">Date</span>
              <span>
                {new Date(message.timestamp).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => onReply(message)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          <button
            onClick={() => onDelete(message)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "#ef444415", border: "1px solid #ef4444", color: "#ef4444" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {message.html ? (
          <iframe
            srcDoc={message.html}
            sandbox="allow-same-origin"
            className="w-full border-none"
            style={{ height: "100%", minHeight: 400, background: "#fff" }}
            title="Email body"
          />
        ) : bodyText ? (
          <div className="px-6 py-4 text-sm whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
            {bodyText}
          </div>
        ) : (
          <div className="px-6 py-4 text-sm" style={{ color: "var(--ink-3)" }}>
            (No content)
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MailPage() {
  const [inboxes, setInboxes] = useState<MailInbox[]>([]);
  const [inboxesLoading, setInboxesLoading] = useState(true);
  const [inboxesError, setInboxesError] = useState<string | null>(null);

  const [selectedInbox, setSelectedInbox] = useState<MailInbox | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const [composing, setComposing] = useState(false);
  const [replyMessage, setReplyMessage] = useState<MailMessage | undefined>(undefined);

  // Load inboxes
  const loadInboxes = useCallback(async (keepSelected = false) => {
    setInboxesLoading(true);
    setInboxesError(null);
    try {
      const res = await fetch("/api/mail/inboxes");
      const data = await res.json();
      if (!res.ok) {
        setInboxesError(data.error || "Failed to load inboxes");
        return;
      }
      // AgentMail returns { count, inboxes: [...] }
      const items: MailInbox[] = Array.isArray(data)
        ? data
        : (data.inboxes ?? data.items ?? []);
      setInboxes(items);
      if (!keepSelected && items.length > 0) {
        setSelectedInbox(items[0]);
      }
    } catch (err) {
      setInboxesError(String(err));
    } finally {
      setInboxesLoading(false);
    }
  }, []);

  // Load messages for selected inbox
  const loadMessages = useCallback(async (inbox: MailInbox) => {
    setMessagesLoading(true);
    setMessagesError(null);
    setSelectedMessageId(null);
    try {
      const inboxId = getInboxEmail(inbox);
      const res = await fetch(
        `/api/mail/messages?inbox_id=${encodeURIComponent(inboxId)}&limit=50`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessagesError(data.error || "Failed to load messages");
        return;
      }
      // AgentMail returns { count, limit, messages: [...] }
      const items: MailMessage[] = Array.isArray(data)
        ? data
        : (data.messages ?? data.items ?? []);
      setMessages(items);
    } catch (err) {
      setMessagesError(String(err));
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInboxes();
  }, [loadInboxes]);

  useEffect(() => {
    if (selectedInbox) {
      loadMessages(selectedInbox);
    }
  }, [selectedInbox, loadMessages]);

  const handleDelete = async (msg: MailMessage) => {
    if (!selectedInbox) return;
    if (!confirm(`Delete this message?\n\n"${getMessageSubject(msg)}"`)) return;
    const inboxId = getInboxEmail(selectedInbox);
    await fetch(
      `/api/mail/messages/${encodeURIComponent(msg.message_id)}?inbox_id=${encodeURIComponent(inboxId)}`,
      { method: "DELETE" }
    );
    setSelectedMessageId(null);
    loadMessages(selectedInbox);
  };

  const handleReply = (msg: MailMessage) => {
    setReplyMessage(msg);
    setComposing(true);
  };

  const handleCompose = () => {
    setReplyMessage(undefined);
    setComposing(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Left Pane: Inbox List ───────────────────────────────── */}
      <aside
        className="flex flex-col border-r overflow-y-auto flex-none"
        style={{ width: 240, borderColor: "var(--line)", background: "var(--bg)" }}
      >
        {/* Compose button */}
        <div className="p-3 border-b" style={{ borderColor: "var(--line)" }}>
          <button
            onClick={handleCompose}
            disabled={!selectedInbox}
            className="flex items-center justify-center gap-2 w-full text-sm py-2 rounded-lg transition-opacity"
            style={{
              background: "#10b981",
              color: "#000",
              opacity: selectedInbox ? 1 : 0.5,
            }}
          >
            <PenSquare className="w-3.5 h-3.5" />
            Compose
          </button>
        </div>

        {/* Inbox list header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <span
            className="text-[11px] uppercase tracking-wider font-medium"
            style={{ color: "var(--ink-3)" }}
          >
            Inboxes
          </span>
          <button
            onClick={() => loadInboxes(true)}
            className="p-1 rounded hover:bg-[var(--panel)] transition-colors"
            style={{ color: "var(--ink-3)" }}
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>

        {inboxesLoading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--ink-3)" }}>
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : inboxesError ? (
          <div className="px-3 py-4 text-xs flex items-start gap-1.5" style={{ color: "#ef4444" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-none mt-0.5" />
            <span>{inboxesError}</span>
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5 p-2">
            {inboxes.map((inbox) => {
              const key = inbox.inbox_id || inbox.email;
              const active =
                selectedInbox?.inbox_id === inbox.inbox_id ||
                selectedInbox?.email === inbox.email;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedInbox(inbox)}
                  className="flex items-start gap-2 px-2.5 py-2.5 rounded-lg text-left transition-colors w-full"
                  style={{
                    background: active ? "var(--panel)" : "transparent",
                    border: active ? "1px solid var(--line)" : "1px solid transparent",
                  }}
                >
                  <Inbox
                    className="w-3.5 h-3.5 flex-none mt-0.5"
                    style={{ color: active ? "#10b981" : "var(--ink-3)" }}
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-[12.5px] font-medium truncate"
                      style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
                    >
                      {getInboxDisplayName(inbox)}
                    </span>
                    <span className="text-[10.5px] truncate" style={{ color: "var(--ink-3)" }}>
                      {getInboxEmail(inbox)}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        )}
      </aside>

      {/* ─── Middle Pane: Message List ───────────────────────────── */}
      <div
        className="flex flex-col border-r overflow-hidden flex-none"
        style={{ width: 320, borderColor: "var(--line)" }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between flex-none"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <h2 className="font-semibold text-[13.5px]">
              {selectedInbox ? getInboxDisplayName(selectedInbox) : "Select an inbox"}
            </h2>
            {selectedInbox && !messagesLoading && (
              <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {selectedInbox && (
            <button
              onClick={() => loadMessages(selectedInbox)}
              className="p-1.5 rounded hover:bg-[var(--panel)] transition-colors"
              style={{ color: "var(--ink-3)" }}
              title="Refresh messages"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!selectedInbox ? (
            <div
              className="flex flex-col items-center justify-center h-full text-center px-6"
              style={{ color: "var(--ink-3)" }}
            >
              <Inbox className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Select an inbox</p>
            </div>
          ) : messagesLoading ? (
            <div className="flex items-center justify-center h-32" style={{ color: "var(--ink-3)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messagesError ? (
            <div
              className="px-4 py-4 text-xs flex items-start gap-1.5"
              style={{ color: "#ef4444" }}
            >
              <AlertCircle className="w-3.5 h-3.5 flex-none mt-0.5" />
              <span>{messagesError}</span>
            </div>
          ) : messages.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-32 text-center"
              style={{ color: "var(--ink-3)" }}
            >
              <p className="text-sm">No messages</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((msg) => {
                const active = selectedMessageId === msg.message_id;
                return (
                  <button
                    key={msg.message_id}
                    onClick={() => setSelectedMessageId(msg.message_id)}
                    className="flex items-start gap-2 px-4 py-3 text-left transition-colors w-full border-b"
                    style={{
                      background: active ? "var(--panel)" : "transparent",
                      borderColor: "var(--line)",
                      borderLeft: active ? "2px solid #10b981" : "2px solid transparent",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className="text-[12.5px] font-medium truncate"
                          style={{ color: "var(--ink)" }}
                        >
                          {getMessageFrom(msg)}
                        </span>
                        <span
                          className="text-[10.5px] flex-none"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {fmtDate(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-[12px] truncate mb-0.5" style={{ color: "var(--ink-2)" }}>
                        {getMessageSubject(msg)}
                      </p>
                      {msg.preview && (
                        <p className="text-[11px] truncate" style={{ color: "var(--ink-3)" }}>
                          {msg.preview}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="w-3 h-3 flex-none mt-1"
                      style={{ color: "var(--ink-3)", opacity: active ? 1 : 0.3 }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Pane: Message Detail ──────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedMessageId && selectedInbox ? (
          <MessageDetail
            inboxId={getInboxEmail(selectedInbox)}
            messageId={selectedMessageId}
            onReply={handleReply}
            onDelete={handleDelete}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center px-8"
            style={{ color: "var(--ink-3)" }}
          >
            <Inbox className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              No message selected
            </p>
            <p className="text-xs">Select a message from the list to read it</p>
          </div>
        )}
      </div>

      {/* Compose / Reply Modal */}
      {composing && selectedInbox && (
        <ComposeModal
          fromInbox={selectedInbox}
          replyTo={replyMessage}
          onClose={() => {
            setComposing(false);
            setReplyMessage(undefined);
          }}
          onSent={() => {
            if (selectedInbox) loadMessages(selectedInbox);
          }}
        />
      )}
    </div>
  );
}
