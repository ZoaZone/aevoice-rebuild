import { useState } from "react";

// Simple streaming chat hook using fetch with ReadableStream
export function useStreamingChat({ buildRequest }) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const send = async (text) => {
    if (!text?.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const req = buildRequest?.(text, messages) || {};
      const res = await fetch(req.url, req.options);
      if (!res.ok || !res.body) throw new Error("Network error");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      // stream loop
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const filtered = prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && m._stream));
          return [...filtered, { role: "assistant", content: full, _stream: true }];
        });
      }
      setMessages((prev) => prev.map((m) => (m._stream ? { ...m, _stream: undefined } : m)));
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  return { loading, messages, setMessages, send };
}