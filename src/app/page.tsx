"use client";

import { CanvasArea, useContainerDimensions } from "@/components/canvas";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { DndContext, DragEndEvent } from '@dnd-kit/core';

export interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text?: string;
    fill: string; // Delete if it doesn't make sense later
    pathData?: string;
    scaleX?: number;
    scaleY?: number;
}

export const SVG_LIBRARY = [
  {
    id: 'star_shape',
    type: 'SVG',
    label: 'Star',
    path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    viewBox: { w: 24, h: 24 }
  },
  {
    id: 'heart_shape',
    type: 'SVG',
    label: 'Heart',
    path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    viewBox: { w: 24, h: 24 }
  }
];

export default function Home() {

  // Define the object data that will be managed and rendered within the CanvasArea
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Stores the type of template the user is dragging at any given time
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { dimensions, containerRef } = useContainerDimensions(800, 600);

  const activeBlock = blocks.find(b => b.id === selectedId) || null;

  const handleUpdateBlock = (id: string, newAttrs: Partial<Block>) => {
    setBlocks(prev => prev.map(b => 
      b.id === id ? { ...b, ...newAttrs } : b
    ));
  };

  // Function that executes when an element is dropped onto the CanvasArea
  const handleDropTemplate = (templateType: string, pos: { x: number; y: number }, size?: { w: number; h: number }) => {
        
      // Create a block of text for this example
      const newBlock: Block = {
          id: `block-${Date.now()}`, // Unique ID based on timestamp
          type: templateType,
          x: pos.x,
          y: pos.y,
          text: `New ${templateType}`,
          fill: '#F3F4F6' // Delete if it doesn't make sense later
      };

      // Update the state, which triggers a new rendering of CanvasArea
      setBlocks([newBlock]);
      setSelectedId(newBlock.id);
  };

  // 1. DND-KIT: It runs when a drag starts
  const handleDragStart = (event: any) => {
      // Stores the type of template being dragged (e.g., "RECTANGLE")
      setActiveTemplateType(event.active.id);
  };

  // 2. DND-KIT: It runs when the drag finishes
  const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;

      // 'over' indicates where it was dropped. If it was dropped over the 'canvas-area', we process the drop
      if (event.over?.id === 'canvas-area') {
      
          const payload = active.data.current;

          if (payload) {
            const initialScale = 4;

            const newBlock: Block = {
                id: `svg-${Date.now()}`,
                type: payload.templateType,
                x: (dimensions.width / 2) - 50,
                y: (dimensions.height / 2) - 50,
                fill: '#3B82F6',
                
                pathData: payload.path, 
                scaleX: initialScale,
                scaleY: initialScale,
            };

            setBlocks([newBlock]);
            setSelectedId(newBlock.id);
        }
      }
        
      // Reset the active template type
      setActiveTemplateType(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

            <main className="flex h-screen w-screen overflow-hidden">

                <div className="w-screen h-screen">
                    {/* CanvasArea is now the drop zone */}
                    <CanvasArea 
                        blocks={blocks}
                        dimensions={dimensions}
                        containerRef={containerRef}
                        selectedId={selectedId}
                        onSelect={(id) => setSelectedId(id)}
                        onDeselect={() => setSelectedId(null)}
                        onUpdateBlock={handleUpdateBlock} // To update position by dragging within the canvas
                    />
                </div>

                <aside className="w-80 h-screen border-l border-gray-200 bg-white" aria-label="Sidebar">
                    {/* Sidebar is now only the drag source */}
                    <Sidebar
                        activeBlock={activeBlock}
                        onUpdateBlock={handleUpdateBlock}
                        onCloseEditor={() => setSelectedId(null)}
                    />
                </aside>
            </main>     
            
      </DndContext>
  );
}