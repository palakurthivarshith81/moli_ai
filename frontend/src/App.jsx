import ViewerPanel from "./components/ViewerPanel";
import ChatBox from "./components/ChatBox";
import ChartsPanel from "./components/ChartsPanel";

export default function App() {

  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      display: "flex"
    }}>

      {/* LEFT: Molstar Viewer */}
      <div style={{
        width: "60%",
        height: "100%"
      }}>
        <ViewerPanel />
      </div>

      {/* MIDDLE: Chat */}
      <div style={{
        width: "20%",
        height: "100%",
        borderLeft: "2px solid #333",
        background: "#0f172a",
        padding: "10px"
      }}>
        <ChatBox />
      </div>

      {/* RIGHT: Charts */}
      <div style={{
        width: "20%",
        height: "100%",
        borderLeft: "2px solid #333",
        background: "#020617",
        padding: "10px"
      }}>
        <ChartsPanel />
      </div>

    </div>
  );
}