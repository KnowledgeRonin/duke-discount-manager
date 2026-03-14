"use client";

import { useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useCanvasRenderer } from "@/lib/canvas/useCanvasRenderer";

interface CanvasV2Props {
  // onDimensionsChange can be useful for centering new drops
  onDimensionsChange?: (dims: { width: number; height: number }) => void;
}

export function CanvasV2({ onDimensionsChange }: CanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { isOver, setNodeRef } = useDroppable({ id: "canvas-area" });

  const { resize } = useCanvasRenderer(canvasRef, {
      width: typeof window !== 'undefined' ? window.innerWidth - 320 : 800, // Initial estimate, will resize
      height: typeof window !== 'undefined' ? window.innerHeight : 600,
      backgroundColor: "#F9FAFB"
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      const parent = containerRef.current;
      if (!parent) return;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      
      resize(width, height);
      onDimensionsChange?.({ width, height });
    };

    // Initial sizing
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resize, onDimensionsChange]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // @ts-ignore
        containerRef.current = node;
      }}
      className={`absolute top-0 left-0 w-full h-full overflow-hidden transition-colors ${
        isOver ? "bg-blue-50/50" : "bg-slate-100"
      }`}
    >
      {/* Fabric.js requires a direct canvas child */}
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
