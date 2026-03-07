"use client";

import { useState, useEffect, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Sidebar } from "@/components/sidebar/sidebar";
import { Block } from "@/utils/types";
import { Canvas } from "@/components/canvas/canvas";
import { Card } from "@/components/ui/card";
import { VOUCHER_JSON_2 } from "@/mockData/json2"; 
import JsonExtractor from "@/utils/JsonExtractor";
import { useHistory } from "@/utils/useHistory";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";


import { SVG_LIBRARY } from "@/utils/library";

export default function Home() {
  // 👇 CAMBIO 1: Reemplazamos useState por useHistory
  const { 
    state: blocks, 
    setState: setBlocks, 
    undo, 
    redo 
  } = useHistory<Block[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null); 
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 }); 

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, 
    })
  );

  const activeSidebarItem = activeId 
    ? SVG_LIBRARY.find(item => item.id === activeId) 
    : null;

  const activeBlock = blocks.find(b => b.id === selectedId) || null;

  // 👇 CAMBIO 2: Esto funciona igual gracias al callback de setHistory
const handleUpdateBlock = useCallback((id: string, newAttrs: Partial<Block>) => {
  setBlocks((prev: Block[]) => prev.map(b => b.id === id ? { ...b, ...newAttrs } : b));
}, [setBlocks]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'canvas-area') {
      const originalItem = SVG_LIBRARY.find(item => item.id === active.id);

      if (originalItem) {
        const centerX = canvasDims.width > 0 ? canvasDims.width / 2 : 300;
        const centerY = canvasDims.height > 0 ? canvasDims.height / 2 : 300;
        
        const newBlock: Block = {
            id: `el-${Date.now()}`,
            // @ts-ignore
            type: originalItem.type, 
            x: centerX, 
            y: centerY,
            rotation: 0,
            scaleX: 3, 
            scaleY: 3,
            fill: '#3B82F6',
            viewBox: originalItem.viewBox,
            
            // @ts-ignore
            jsonData: originalItem.canvasData || undefined,
            svgContent: originalItem.content || ''
        };

        // Al soltar un nuevo bloque, lo agregamos al historial
        // En lugar de reemplazar el array, lo sumamos (como lo tendrías en un editor real)
        // O si quieres que solo haya 1 bloque en pantalla a la vez, déjalo como () => [newBlock]
        setBlocks(() => [newBlock]); 
        
        setSelectedId(newBlock.id);
      }
    }
    setActiveId(null);
  };

useKeyboardShortcuts({ undo, redo, setSelectedId });


  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/*<JsonExtractor/>*/}
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

      {/* Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeSidebarItem ? (
           <Card className="w-24 h-24 flex items-center justify-center bg-blue-50 border-blue-500 opacity-90 cursor-grabbing shadow-2xl rotate-3 p-2 overflow-hidden">
             <div 
               className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
               dangerouslySetInnerHTML={{ __html: activeSidebarItem.content }} 
             />
           </Card>
        ) : null}
      </DragOverlay> 
    </DndContext>
  );
}