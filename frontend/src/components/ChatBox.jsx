import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { executePlan } from "../actionExecutor";

export default function ChatBox() {

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //  Fake streaming function
  const streamText = async (fullText) => {
    for (let i = 0; i < fullText.length; i++) {
      await new Promise(res => setTimeout(res, 10));

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content += fullText[i];
        return updated;
      });
    }
  };

  const handleSend = async () => {

    if (!text.trim()) return;

    const userInput = text.trim();

    // user message
    setMessages(prev => [...prev, { role: "user", content: userInput }]);
    setText("");

    // empty AI message
    setMessages(prev => [...prev, { role: "ai", content: "" }]);

    try {

      //  CALL NORMAL API (important)
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userInput,
          mode: "free"
        })
      });

      const data = await res.json();

      //  EXECUTE ACTIONS FIRST
      if (data.mode === "visualization" && data.actions) {
        await executePlan(data);
      }

      //  STREAM TEXT (smooth UI)
      await streamText(data.text || "No response");

    } catch (err) {
      console.error(err);

      setMessages(prev => [
        ...prev,
        { role: "ai", content: "Error fetching response" }
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", color: "white" }}>

      <h3>Molecular AI</h3>

      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #333", padding: "10px" }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: "flex", marginTop: "10px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />
        <button onClick={handleSend}>Send</button>
      </div>

    </div>
  );
}