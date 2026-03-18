"use client";

import { useDraggable } from "@dnd-kit/core";
import { SVG_LIBRARY } from "@/utils/library";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bold, Italic, BringToFront, SendToBack, ChevronUp, ChevronDown, Download } from "lucide-react";
import { FabricThumbnail } from "@/utils/fabricThumbnail";
import { useSelectedNode, useCanvasActions } from "@/lib/canvas";
import type { SceneNode, TextNode } from "@/lib/canvas";

// --- MAIN SIDEBAR ---
export function Sidebar({ onExport }: { onExport?: () => void }) {
  const selectedNode = useSelectedNode();
  const { clearSelection, updateNodeProperty } = useCanvasActions();

  return (
    <div className="h-full border-l bg-background flex flex-col w-80 shadow-sm z-10">
      {selectedNode ? (
        <BlockEditor
          node={selectedNode}
          onUpdateProperty={(property, value) => updateNodeProperty(selectedNode.id, property, value)}
          onBack={clearSelection}
          onExport={onExport}
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
  onExport,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onBack: () => void;
  onExport?: () => void;
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

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Text Formatting — only for textbox nodes */}
          {node.type === 'textbox' && (
            <TextFormattingPanel node={node} onUpdateProperty={onUpdateProperty} />
          )}

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

          {/* Layer Arrangement */}
          <ArrangePanel nodeId={node.id} />

          {/* Export */}
          <Button className="w-full gap-2" onClick={onExport} disabled={!onExport}>
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// --- TEXT FORMATTING PANEL ---
function TextFormattingPanel({
  node,
  onUpdateProperty,
}: {
  node: TextNode;
  onUpdateProperty: (property: string, value: unknown) => void;
}) {
  const isBold = node.fontWeight === 'bold' || (typeof node.fontWeight === 'number' && node.fontWeight >= 700);
  const isItalic = node.fontStyle === 'italic';

  return (
    <div className="space-y-3">
      <Label>Text</Label>

      {/* Font Size */}
      <div className="space-y-1">
        <Label htmlFor="font-size" className="text-xs text-muted-foreground">Font Size</Label>
        <Input
          id="font-size"
          type="number"
          min={1}
          max={500}
          value={node.fontSize}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 1 && val <= 500) onUpdateProperty('fontSize', val);
          }}
          className="w-24"
        />
      </div>

      {/* Bold / Italic toggles */}
      <div className="flex gap-2">
        <Button
          variant={isBold ? 'default' : 'outline'}
          size="icon"
          onClick={() => onUpdateProperty('fontWeight', isBold ? 'normal' : 'bold')}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={isItalic ? 'default' : 'outline'}
          size="icon"
          onClick={() => onUpdateProperty('fontStyle', isItalic ? 'normal' : 'italic')}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- ARRANGE PANEL ---
function ArrangePanel({ nodeId }: { nodeId: string }) {
  const { bringToFront, sendToBack, bringForward, sendBackward } = useCanvasActions();

  return (
    <div className="space-y-2">
      <Label>Arrange</Label>
      <div className="grid grid-cols-2 gap-1">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bringToFront(nodeId)}>
          <BringToFront className="h-3.5 w-3.5" />
          Bring to Front
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => sendToBack(nodeId)}>
          <SendToBack className="h-3.5 w-3.5" />
          Send to Back
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bringForward(nodeId)}>
          <ChevronUp className="h-3.5 w-3.5" />
          Bring Forward
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => sendBackward(nodeId)}>
          <ChevronDown className="h-3.5 w-3.5" />
          Send Backward
        </Button>
      </div>
    </div>
  );
}

// --- DRAGGABLE ITEM ---
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