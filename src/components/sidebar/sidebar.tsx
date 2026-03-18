"use client";

import { useDraggable } from "@dnd-kit/core";
import { SVG_LIBRARY } from "@/utils/library";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { FabricThumbnail } from "@/utils/fabricThumbnail";
import { useSelectedNode, useCanvasActions } from "@/lib/canvas";
import type { SceneNode } from "@/lib/canvas";

// --- MAIN SIDEBAR ---
export function Sidebar() {
  const selectedNode = useSelectedNode();
  const { clearSelection, updateNodeProperty } = useCanvasActions();

  return (
    <div className="h-full border-l bg-background flex flex-col w-80 shadow-sm z-10">
      {selectedNode ? (
        <BlockEditor
          node={selectedNode}
          onUpdateProperty={(property, value) => updateNodeProperty(selectedNode.id, property, value)}
          onBack={clearSelection}
        />
      ) : (
        <TemplateLibrary />
      )}
    </div>
  );
}

// --- LIBRARY VIEW ---
function TemplateLibrary() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <h2 className="text-xl font-semibold tracking-tight">Library</h2>
        <p className="text-sm text-muted-foreground">Drag elements to the canvas</p>
      </div>

      <Separator className="my-2" />

      <ScrollArea className="flex-1 px-4">
        <div className="grid gap-3 pb-4">
          {SVG_LIBRARY.map((item) => (
            <DraggableSidebarItem
              key={item.id}
              item={item}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// --- BLOCK EDITOR ---
function BlockEditor({
  node,
  onUpdateProperty,
  onBack,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onBack: () => void;
}) {
  const fillColorString = typeof node.fill === 'string'
    ? node.fill
    : ((node.fill as any)?.colorStops?.[0]?.color ?? '#000000');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-sm">Edit {node.type}</h3>
          <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden w-40">
            ID: {node.id}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-6">
        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color-picker">Fill Color</Label>
          <div className="flex items-center gap-3">
            <div className="relative overflow-hidden rounded-md border shadow-sm w-10 h-10">
              <input
                id="color-picker"
                type="color"
                value={fillColorString}
                onChange={(e) => onUpdateProperty('fill', e.target.value)}
                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-0 p-0"
              />
            </div>
            <Input
              value={fillColorString}
              onChange={(e) => onUpdateProperty('fill', e.target.value)}
              className="font-mono uppercase w-28"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// --- DRAGGABLE ITEM ---
// Important: We extracted the props to simplify things.
function DraggableSidebarItem({ item }: { item: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: {
      templateType: item.type,
      content: item.content,
      canvasData: item.canvasData,
      viewBox: item.viewBox
    }
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none w-full">
      <Card
        className={`cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all overflow-hidden relative ${isDragging ? 'opacity-50 ring-2 ring-blue-400' : 'hover:shadow-md'
          } aspect-[2/1]`}
      >
        <div className="w-full h-full flex items-center justify-center p-0">
          {/* Renderizamos el Thumbnail a partir del JSON */}
          {item.type === 'JSON' && item.canvasData ? (
            <FabricThumbnail jsonData={item.canvasData} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: item.content }} />
          )}
        </div>
      </Card>
    </div>
  );
}