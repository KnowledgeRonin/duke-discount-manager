"use client";

import { CanvasArea } from "@/components/canvas";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { DndContext, DragEndEvent } from '@dnd-kit/core';

interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text: string;
    width?: number;
    height?: number;
}

export default function Home() {

  // Define the object data that will be managed and rendered within the CanvasArea
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Stores the type of template the user is dragging at any given time
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(null);

  // Function that executes when an element is dropped onto the CanvasArea
  const handleDropTemplate = (templateType: string, pos: { x: number; y: number }, size?: { w: number; h: number }) => {
        
      // Create a block of text for this example
      const newBlock: Block = {
          id: `block-${Date.now()}`, // Unique ID based on timestamp
          type: templateType,
          x: pos.x,
          y: pos.y,
          text: `Nuevo ${templateType}`,
          width: size?.w || 150, 
          height: size?.h || 100,
      };

      // Update the state, which triggers a new rendering of CanvasArea
      setBlocks((prevBlocks) => [...prevBlocks, newBlock]);
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
      if (event.over?.id === 'canvas-area' && activeTemplateType) {
            
          // Calculate the pointer position for the new block
          // Note: dnd-kit does not provide drop coordinates relative to the destination
          // in a simple way in this context, so we will use dummy coordinates (or
          // it would be necessary to calculate it manually based on the event).
          // For this example, we will use a central point:
          const pos = { x: 400, y: 300 }; // Fixed position for simplicity

          const payload = active.data.current;
          
          const sizeData = {
              w: payload?.w,
              h: payload?.h
          };

          handleDropTemplate(activeTemplateType, pos, sizeData);
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
                    />

                </div>

                <aside className="w-80 h-screen border-l border-gray-200 bg-white" aria-label="Sidebar">
                    {/* Sidebar is now only the drag source */}
                    <Sidebar />
                </aside>
            </main>     
            
      </DndContext>
  );
}
