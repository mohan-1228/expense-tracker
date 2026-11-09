import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { askPenny } from "./api";

export default function PennyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, sending]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    const history = messages;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const { reply } = await askPenny(text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-brand-50 shadow-xl sm:w-96">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-700 to-brand-900 px-4 py-3">
            <div className="flex items-center gap-2 text-brand-50">
              <MessageCircle size={18} />
              <span className="font-bold">Penny</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1 text-brand-50 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="rounded-xl bg-brand-200/25 px-3 py-2 text-sm text-brand-900">
                Hi, I'm Penny! Ask me about your spending, balances, or recurring expenses.
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-gradient-to-r from-brand-700 to-brand-900 text-brand-50"
                    : "bg-brand-200/25 text-brand-900"
                }`}
              >
                {m.content}
              </div>
            ))}

            {sending && (
              <div className="max-w-[85%] rounded-xl bg-brand-200/25 px-3 py-2 text-sm text-brand-700">
                Thinking...
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Penny about your expenses..."
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-900 p-2.5
                         text-brand-50 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Penny chat" : "Open Penny chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full
                   bg-gradient-to-br from-brand-700 to-brand-900 text-brand-50
                   shadow-lg hover:opacity-90"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
