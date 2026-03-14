"use client";
import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { SVG_LIBRARY } from "@/utils/library";
import { loadFromFabricJSON } from "@/lib/canvas/parser";
import { CanvasRenderer } from "@/lib/canvas/CanvasRenderer";

export default function RenderTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Test the real renderer
    const renderer = new CanvasRenderer(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#e0e0e0"
    });

    const item = SVG_LIBRARY[0];
    if (item.type === 'JSON' && item.canvasData) {
        const rootGroup = loadFromFabricJSON(item.canvasData);
        rootGroup.left = 400;
        rootGroup.top = 300;
        
        console.log("Rendering GroupNode:", rootGroup);
        renderer.initialize(rootGroup);
    }

    return () => renderer.dispose();
  }, []);

  return (
    <div style={{ padding: 40, background: '#fafafa', minHeight: '100vh' }}>
      <h1>Static Render Test (No DndKit)</h1>
      <div style={{ border: '2px dashed #999', width: 800, height: 600 }}>
         <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
