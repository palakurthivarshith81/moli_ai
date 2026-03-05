import { useEffect, useRef } from "react";
import { initViewer } from "../molstarEngine";

export default function ViewerPanel() {

  const viewerRef = useRef(null);

  useEffect(() => {
    if (viewerRef.current) {
      initViewer(viewerRef.current);
    }
  }, []);

  return (
    <div
      ref={viewerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative"
      }}
    />
  );
}