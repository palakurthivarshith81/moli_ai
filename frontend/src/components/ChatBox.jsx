import { useState } from "react";
import { executeCommand } from "../actionExecutor";
import { askGemini } from "../ai/geminiClient";

export default function ChatBox() {

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSend = async () => {

    if (!text) return;

    const userMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);

    // run command for Mol*
    executeCommand(text);

    // ask Gemini
    const aiResponse = await askGemini(text);

    const aiMessage = { role: "ai", content: aiResponse };

    setMessages(prev => [...prev, aiMessage]);

    setText("");
  };

  return (
    <div style={{color:"white"}}>

      <h3>Molecular AI</h3>

      <div style={{height:"200px", overflow:"auto"}}>

        {messages.map((m,i)=>(
          <div key={i} style={{margin:"5px"}}>
            <b>{m.role === "user" ? "You:" : "AI:"}</b> {m.content}
          </div>
        ))}

      </div>

      <input
        value={text}
        onChange={(e)=>setText(e.target.value)}
        placeholder="Ask about a protein or type: show 1hsg"
        style={{width:"70%", padding:"8px"}}
      />

      <button onClick={handleSend}>
        Send
      </button>

    </div>
  );
}