"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useCanvasRenderer } from "@/lib/canvas/useCanvasRenderer";

export interface CanvasV2Handle {
  exportImage: (options?: { format?: 'png' | 'jpeg'; multiplier?: number; quality?: number }) => void;
}

interface CanvasV2Props {
  onDimensionsChange?: (dims: { width: number; height: number }) => void;
}

export const CanvasV2 = forwardRef<CanvasV2Handle, CanvasV2Props>(
  function CanvasV2({ onDimensionsChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const { isOver, setNodeRef } = useDroppable({ id: "canvas-area" });

    const { resize, exportImage } = useCanvasRenderer(canvasRef, {
      width: typeof window !== 'undefined' ? window.innerWidth - 320 : 800,
      height: typeof window !== 'undefined' ? window.innerHeight : 600,
      backgroundColor: "#F9FAFB"
    });

    useImperativeHandle(ref, () => ({ exportImage }), [exportImage]);

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
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>
    );
  }
);
