import { useState } from "react";

export default function ChatPanel() {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  function send() {

    if (!input.trim()) return;

    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      <div style={{ padding: "10px", fontWeight: "bold" }}>
        Molecular AI
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px"
        }}
      >
        {messages.map((m, i) => (
          <div key={i}>{m.content}</div>
        ))}
      </div>

      <div style={{ display: "flex", padding: "10px" }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button onClick={send}>
          Send
        </button>
      </div>

    </div>
  );
}