import { useState, useRef, useEffect } from "react";
import { executePlan } from "../actionExecutor";

function ChatBox() {

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  // auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {

    if (!text.trim()) return;

    const userInput = text.trim();

    const userMessage = {
      role: "user",
      content: userInput
    };

    setMessages(prev => [...prev, userMessage]);

    try {

      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userInput })
      });

      if (!res.ok) {
        throw new Error("Backend returned status " + res.status);
      }

      const plan = await res.json();

      console.log("AI Plan:", plan);

      // Execute Mol* actions
      if (plan.actions) {
        await executePlan(plan);
      }

      const aiMessage = {
        role: "ai",
        content: plan.text || "Visualization updated."
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {

      console.error("Backend error:", err);

      let errorMessage = "Backend connection failed. Check FastAPI server.";

      if (err.message && err.message.includes("429")) {
        errorMessage =
          "AI quota exceeded. Please wait before sending another request.";
      }

      setMessages(prev => [
        ...prev,
        { role: "ai", content: errorMessage }
      ]);

    }

    setText("");
  };

  // ENTER key support
  const handleKeyDown = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

  };

  return (

    <div
      style={{
        color: "white",
        padding: "10px",
        fontFamily: "Arial",
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
    >

      <h3>Molecular AI</h3>

      {/* Chat messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #444",
          padding: "10px",
          marginBottom: "10px"
        }}
      >

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <b>{m.role === "user" ? "You:" : "AI:"}</b> {m.content}
          </div>
        ))}

        <div ref={chatEndRef} />

      </div>

      {/* Input area */}
      <div style={{ display: "flex" }}>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a protein or type: show 1hsg"
          style={{
            width: "70%",
            padding: "8px",
            marginRight: "5px",
            resize: "none",
            height: "40px"
          }}
        />

        <button
          onClick={handleSend}
          style={{
            padding: "8px 14px",
            cursor: "pointer"
          }}
        >
          Send
        </button>

      </div>

    </div>

  );
}

export default ChatBox;