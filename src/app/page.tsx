"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Sidebar } from "@/components/sidebar/sidebar";
import { Block } from "@/app/types";
import { Canvas } from "@/components/canvas/canvas";
import { Card } from "@/components/ui/card";

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); // ID of the dragged element in the Sidebar
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 }); // State to determine the size of the canvas

  // Configuring sensors for improved drag-and-drop UX
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Avoid accidental dragging with a simple click.
    })
  );

  const activeSidebarItem = activeId 
    ? SVG_LIBRARY.find(item => item.id === activeId) 
    : null;

  const activeBlock = blocks.find(b => b.id === selectedId) || null;

  const handleUpdateBlock = (id: string, newAttrs: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...newAttrs } : b));
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'canvas-area') {
      const payload = active.data.current;

      if (payload) {

        // Calculate center position for new block
        const centerX = canvasDims.width > 0 ? canvasDims.width / 2 : 300;
        const centerY = canvasDims.height > 0 ? canvasDims.height / 2 : 300;
        
        const newBlock: Block = {
            id: `el-${Date.now()}`,
            type: payload.templateType,
            x: centerX, 
            y: centerY,
            rotation: 0,
            scaleX: 3, 
            scaleY: 3,
            fill: '#3B82F6',
            pathData: payload.path,
        };

        setBlocks([newBlock]);
        setSelectedId(newBlock.id);
      }
    }
    setActiveId(null);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        
        {/* Canvas Area (Drop Zone) */}
        <div className="flex-1 h-full relative">
            <Canvas 
                blocks={blocks}
                onSelect={setSelectedId}
                onUpdateBlock={handleUpdateBlock}
                onDimensionsChange={(dims) => setCanvasDims(dims)}
            />
        </div>

        {/* Sidebar (Drag Source) */}
        <Sidebar
            activeBlock={activeBlock}
            onUpdateBlock={handleUpdateBlock}
            onCloseEditor={() => setSelectedId(null)}
        />
      </main>

      {/* Overlay that follows the cursor */}
      <DragOverlay dropAnimation={null}>
        {activeSidebarItem ? (
           <Card className="w-24 h-24 flex items-center justify-center bg-blue-50 border-blue-500 opacity-90 cursor-grabbing shadow-2xl rotate-3">
              <svg viewBox={`0 0 ${activeSidebarItem.viewBox.w} ${activeSidebarItem.viewBox.h}`} className="w-10 h-10 fill-blue-500">
                  <path d={activeSidebarItem.path} />
              </svg>
           </Card>
        ) : null}
      </DragOverlay>     
    </DndContext>
  );
}