"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric"; 
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/app/types";

interface FabricCanvasProps {
  blocks: Block[];
  onSelect: (id: string | null) => void;
  onUpdateBlock: (id: string, attrs: Partial<Block>) => void;
}

export function Canvas({ blocks, onSelect, onUpdateBlock }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Integration with dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-area",
  });

  // 1. INITIALIZATION (Runs only once)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true, // Enable multiple selection
    });

    fabricRef.current = canvas;

    // -- Event Listeners --

    // Resize
    const handleResize = () => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        canvas.requestRenderAll();
      }
    };
    window.addEventListener("resize", handleResize);

    // Modification of objects (Drag/Rotate/Scale) -> React
    canvas.on("object:modified", (e) => {
      const target = e.target;
      if (!target) return;

      // @ts-ignore: Custom property 'id'
      const id = target.id;
      if (id) {
        onUpdateBlock(id, {
          x: target.left,
          y: target.top,
          scaleX: target.scaleX,
          scaleY: target.scaleY,
          rotation: target.angle,
        });
      }
    });

    // Selection -> React
    const handleSelection = (e: any) => {
        const selection = e.selected || [];
        if (selection.length > 0) {
            // @ts-ignore
            const id = selection[0].id;
            onSelect(id);
        } else {
            onSelect(null);
        }
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => onSelect(null));

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // 2. INTELIGENT SYNCHRONIZATION (DIFFING)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    // We obtain the current objects from the canvas.
    const existingObjects = canvas.getObjects();
    
    // Quick map for searching by ID
    // @ts-ignore: id custom
    const existingMap = new Map(existingObjects.map(obj => [obj.id, obj]));
    const blockIds = new Set(blocks.map(b => b.id));

    // A. DELETE: Objects that are in Fabric but not in React
    existingObjects.forEach((obj) => {
       // @ts-ignore
       if (!blockIds.has(obj.id)) {
           canvas.remove(obj);
       }
    });

    // B. ADD or UPDATE
    blocks.forEach((block) => {
        const existingObj = existingMap.get(block.id);

        if (!existingObj) {
            // --- CREATE NEW ---
            const path = new fabric.Path(block.pathData, {
                // @ts-ignore: we inject the ID
                id: block.id, 
                left: block.x,
                top: block.y,
                fill: block.fill,
                scaleX: block.scaleX || 1,
                scaleY: block.scaleY || 1,
                angle: block.rotation || 0,
                originX: 'center',
                originY: 'center',
                cornerColor: '#3B82F6',
                borderColor: '#3B82F6',
                transparentCorners: false,
                cornerSize: 10,
                // Rendering optimizations
                objectCaching: false, 
            });
            canvas.add(path);
        
        } else {
            // --- UPDATE EXISTING ---
            
            // We check if this object is being actively manipulated by the user.
            // If the user is dragging it, we should NOT overwrite its position from React.
            // to avoid "glitches" or infinite loop conflicts.
            const isActive = canvas.getActiveObjects().some(obj => obj === existingObj);
            
            // If it is NOT active (or if you want to force color updates always):
            if (!isActive) {
                // We only update if there are differences (Micro-optimization).
                if (existingObj.left !== block.x) existingObj.set('left', block.x);
                if (existingObj.top !== block.y) existingObj.set('top', block.y);
                if (existingObj.angle !== block.rotation) existingObj.set('angle', block.rotation);
                if (existingObj.scaleX !== block.scaleX) existingObj.set('scaleX', block.scaleX);
                if (existingObj.scaleY !== block.scaleY) existingObj.set('scaleY', block.scaleY);
            }

            // Visual properties (Color) are ALWAYS updated, even if it is selected.
            if (existingObj.fill !== block.fill) {
                existingObj.set('fill', block.fill);
            }
            
            // Note: Changing the `pathData` of an existing object in Fabric is complex.
            // If your app allows you to change the shape of an object in real time, that's even better.
            // destroy and recreate the object in that specific case.
            // We assume that `pathData` does not change for the same ID in this flow.
        }
    });

    // Render changes
    canvas.requestRenderAll();

  }, [blocks]); // It is executed every time the React state changes.

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // @ts-ignore
        containerRef.current = node;
      }}
      className={`relative w-full h-full overflow-hidden transition-colors ${
        isOver ? "bg-blue-50/50" : "bg-slate-100"
      }`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}