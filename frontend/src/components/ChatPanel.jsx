import { useState } from "react";
import { executeActions } from "../actionExecutor";
import MessageBubble from "./MessageBubble";

export default function ChatPanel() {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {

    if (!input.trim()) return;

    const userMessage = input;
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const plan = await res.json();

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: plan.text }
      ]);

      await executeActions(plan);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Error communicating with server." }
      ]);
    }

    setLoading(false);
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      padding: "20px",
      background: "#0f172a"
    }}>

      {/* Message Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        marginBottom: "15px"
      }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}

        {loading && (
          <MessageBubble role="assistant" content="Thinking..." />
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: "flex" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a protein..."
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            outline: "none",
            background: "#1e293b",
            color: "white"
          }}
        />

        <button
          onClick={send}
          style={{
            marginLeft: "10px",
            padding: "10px 15px",
            borderRadius: "8px",
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer"
          }}
        >
          Send
        </button>
      </div>

    </div>
  );
}