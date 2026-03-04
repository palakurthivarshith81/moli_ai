import ChatPanel from "./components/ChatPanel";
import ViewerPanel from "./components/ViewerPanel";

export default function App() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden"
      }}
    >
      {/* Left Chat Panel */}
      <div
        style={{
          width: "30%",
          minWidth: "300px",
          background: "#0b1a2b"
        }}
      >
        <ChatPanel />
      </div>

      {/* Right Viewer Panel */}
      <div
        style={{
          flex: 1,
          background: "#000"
        }}
      >
        <ViewerPanel />
      </div>
    </div>
  );
}