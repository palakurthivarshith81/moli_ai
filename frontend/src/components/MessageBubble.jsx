export default function MessageBubble({ role, content }) {

  const isUser = role === "user";

  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: "10px"
    }}>
      <div style={{
        maxWidth: "75%",
        padding: "12px",
        borderRadius: "12px",
        background: isUser ? "#2563eb" : "#1f2937",
        color: "white",
        fontSize: "14px",
        whiteSpace: "pre-wrap"
      }}>
        {content}
      </div>
    </div>
  );
}