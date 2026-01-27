"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric"; 
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/app/types";

interface FabricCanvasProps {
  blocks: Block[];
  onSelect: (id: string | null) => void;
  onUpdateBlock: (id: string, attrs: Partial<Block>) => void;
  onDimensionsChange?: (dims: { width: number; height: number }) => void;
}

export function Canvas({ blocks, onSelect, onUpdateBlock, onDimensionsChange }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-area",
  });

  // 1. INITIALIZATION
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      backgroundColor: "#F9FAFB",
      preserveObjectStacking: true,
      selection: true,
    });

    fabricRef.current = canvas;

    if (onDimensionsChange) {
        onDimensionsChange({ 
            width: containerRef.current.clientWidth, 
            height: containerRef.current.clientHeight 
        });
    }

    // -- Event Listeners --

    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        canvas.setDimensions({ width, height });

        if (onDimensionsChange) {
            onDimensionsChange({ width, height });
        }
        
        const center = canvas.getCenterPoint();
        
        const objects = canvas.getObjects() as Array<fabric.FabricObject & { id: string }>;

        objects.forEach(obj => {
            obj.setPositionByOrigin(center, 'center', 'center');
            obj.setCoords();

            if (obj.id) {
               onUpdateBlock(obj.id, { x: center.x, y: center.y });
           }
        });
            
        canvas.requestRenderAll();
      }
    };
    window.addEventListener("resize", handleResize);

    // Modification
    canvas.on("object:modified", (e) => {
      const target = e.target;
      if (!target) return;

      // @ts-ignore
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

    // Selection
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

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // 2. INTELLIGENT SYNCHRONIZATION (DIFFING)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    const existingObjects = canvas.getObjects() as Array<fabric.FabricObject & { id: string }>;
    
    const existingMap = new Map(existingObjects.map(obj => [obj.id, obj]));
    const blockIds = new Set(blocks.map(b => b.id));

    // A. DELETE
    existingObjects.forEach((obj) => {
       if (!blockIds.has(obj.id)) {
           canvas.remove(obj);
       }
    });

    // B. ADD or UPDATE
    blocks.forEach((block) => {
        const existingObj = existingMap.get(block.id);

        if (!existingObj) {

            fabric.loadSVGFromString(block.svgContent).then((results) => {

                const objects = results.objects;
                const options = results.options;
                
                const svgGroup = new fabric.Group(objects, {
                     ...options,
                    // @ts-ignore
                    id: block.id,
                    left: block.x,
                    top: block.y,
                    scaleX: block.scaleX || 1,
                    scaleY: block.scaleY || 1,
                    angle: block.rotation || 0,
                    originX: 'center',
                    originY: 'center',
                    
                    cornerColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    transparentCorners: false,
                    cornerSize: 10,
                    
                    lockMovementX: true,
                    lockMovementY: true,
                    hasControls: true,
                });

                canvas.add(svgGroup);
                canvas.requestRenderAll();
            }).catch((err) => {
                console.error("Error al cargar SVG en Fabric:", err);
            });
        
        } else {
            // Lógica de actualización (se mantiene igual)
            const isActive = canvas.getActiveObjects().some(obj => obj === existingObj);
            
            if (!isActive) {
                if (existingObj.left !== block.x) existingObj.set('left', block.x);
                if (existingObj.top !== block.y) existingObj.set('top', block.y);
                if (existingObj.angle !== block.rotation) existingObj.set('angle', block.rotation);
                if (existingObj.scaleX !== block.scaleX) existingObj.set('scaleX', block.scaleX);
                if (existingObj.scaleY !== block.scaleY) existingObj.set('scaleY', block.scaleY);
                
                existingObj.setCoords(); // Importante actualizar coordenadas
            }
        }
    });
    
    canvas.requestRenderAll();

  }, [blocks]);

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