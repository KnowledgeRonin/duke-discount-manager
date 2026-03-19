"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Sidebar } from "@/components/sidebar/sidebar";
import { CanvasV2, type CanvasV2Handle } from "@/components/canvas/CanvasV2";
import { useCanvasStore } from "@/lib/canvas/store";
import { parseSVGToGroupNode } from "@/lib/canvas/svgParser";
import { loadFromFabricJSON } from "@/lib/canvas/parser";
import { SVG_LIBRARY } from "@/data/library";
import { FabricThumbnail } from "@/components/canvas/FabricThumbnail";
import { saveTemplate } from "@/lib/supabase/templates";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export function Editor() {
  const router = useRouter();
  const loadScene = useCanvasStore((state) => state.loadScene);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasV2Ref = useRef<CanvasV2Handle>(null);

  const activeSidebarItem = activeId ? SVG_LIBRARY.find(item => item.id === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleResetCanvas = () => {
    loadScene({ version: '7.0.0', objects: [] });
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'canvas-area') {
      const originalItem = SVG_LIBRARY.find(item => item.id === active.id);

      if (originalItem) {
        const centerX = canvasDims.width > 0 ? canvasDims.width / 2 : 300;
        const centerY = canvasDims.height > 0 ? canvasDims.height / 2 : 300;

        setTimeout(async () => {
          const store = useCanvasStore.getState();

          if (originalItem.type === 'JSON' && originalItem.canvasData) {
            try {
              const groupNode = loadFromFabricJSON(originalItem.canvasData);
              groupNode.left = centerX;
              groupNode.top = centerY;
              groupNode.originX = 'center';
              groupNode.originY = 'center';
              groupNode.lockMovementX = true;
              groupNode.lockMovementY = true;
              groupNode.lockScalingX = true;
              groupNode.lockScalingY = true;
              groupNode.lockRotation = true;
              groupNode.hasControls = false;
              groupNode.hasBorders = false;
              store.clear();
              loadScene({ version: '7.0.0', objects: [groupNode] });
              selectNode(groupNode.id);
            } catch (e) {
              console.error("Failed to parse JSON template", e);
            }
          } else if (originalItem.content) {
            try {
              const groupNode = await parseSVGToGroupNode(originalItem.content);
              groupNode.left = centerX;
              groupNode.top = centerY;
              groupNode.originX = 'center';
              groupNode.originY = 'center';
              groupNode.lockMovementX = true;
              groupNode.lockMovementY = true;
              groupNode.lockScalingX = true;
              groupNode.lockScalingY = true;
              groupNode.lockRotation = true;
              groupNode.hasControls = false;
              groupNode.hasBorders = false;
              store.clear();
              loadScene({ version: '7.0.0', objects: [groupNode] });
              selectNode(groupNode.id);
            } catch (e) {
              console.error("Failed to parse SVG template", e);
            }
          }
        }, 50);
      }
    }
    setActiveId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, clearSelection]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="flex h-screen w-screen overflow-hidden bg-background text-foreground">

        {/* Canvas Area */}
        <div
          ref={canvasContainerRef}
          className="flex-1 h-full relative"
          tabIndex={-1}
          style={{ outline: 'none' }}
          onMouseDown={() => canvasContainerRef.current?.focus()}
        >
          <CanvasV2
            ref={canvasV2Ref}
            onDimensionsChange={(dims) => setCanvasDims(dims)}
          />
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border text-sm font-medium rounded shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={handleResetCanvas}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded shadow-lg transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <Sidebar
          onExport={() => canvasV2Ref.current?.exportImage()}
          onSave={async (name) => {
            const root = useCanvasStore.getState().root;
            if (!root) throw new Error('Canvas is empty');
            const thumbnail = canvasV2Ref.current?.getThumbnailDataURL() ?? null;
            try {
              await saveTemplate(name, root, thumbnail);
              toast.success('Template saved!');
            } catch (err) {
              toast.error('Failed to save template. Check your connection and try again.');
              throw err;
            }
          }}
        />
      </main>

      <DragOverlay dropAnimation={null}>
        {activeSidebarItem ? (
          <div className="w-24 h-24 opacity-90 cursor-grabbing rotate-3 drop-shadow-2xl">
            {activeSidebarItem.type === 'JSON' && activeSidebarItem.canvasData ? (
              <FabricThumbnail jsonData={activeSidebarItem.canvasData} />
            ) : (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: activeSidebarItem.content || '' }}
              />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
