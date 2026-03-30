import { useEffect, useRef } from "react";
import { initViewer, getViewer } from "../molstarEngine";

export default function ViewerPanel() {

  const viewerRef = useRef(null);

  useEffect(() => {

    async function setupViewer() {

      if (!viewerRef.current) return;

      // initialize Mol* viewer
      await initViewer(viewerRef.current);

      const viewer = getViewer();
      if (!viewer) return;

      // Detect clicks inside Mol*
      viewer.plugin.behaviors.interaction.click.subscribe(event => {

        const loci = event.current.loci;

        if (!loci) return;

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent("molstar-compound-click", {
            detail: loci
          })
        );

      });

    }

    setupViewer();

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