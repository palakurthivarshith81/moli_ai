import ViewerPanel from "./components/ViewerPanel";
import ChatBox from "./components/ChatBox";

export default function App() {

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex"
    }}>

      {/* LEFT: Molstar Viewer */}
      <div style={{
        width: "70%",
        height: "100%"
      }}>
        <ViewerPanel />
      </div>

      {/* RIGHT: Chat */}
      <div style={{
        width: "30%",
        height: "100%",
        borderLeft: "2px solid #333",
        background: "#111",
        padding: "10px"
      }}>
        <ChatBox />
      </div>

    </div>
  );
}