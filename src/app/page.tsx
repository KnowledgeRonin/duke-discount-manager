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
    text: string;
    width?: number;
    height?: number;
    fill: string; // Delete if it doesn't make sense later
}

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
          text: `Nuevo ${templateType}`,
          width: size?.w || 150, 
          height: size?.h || 100,
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
            const objectWidth = payload.w || 150;
            const objectHeight = payload.h || 100;
            const typeToCreate = payload.templateType; 

            const pos = { 
                x: (dimensions.width / 2) - (objectWidth / 2), 
                y: (dimensions.height / 2) - (objectHeight / 2) 
            };
            
            const sizeData = { w: objectWidth, h: objectHeight };

            handleDropTemplate(typeToCreate, pos, sizeData);
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