"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { SVG_LIBRARY } from "@/data/library";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bold, Italic, BringToFront, SendToBack, ChevronUp, ChevronDown, Download, Save, Check, Loader2 } from "lucide-react";
import { FabricThumbnail } from "@/components/canvas/FabricThumbnail";
import { useSelectedNode, useCanvasActions } from "@/lib/canvas";
import type { SceneNode, TextNode } from "@/lib/canvas";

// --- MAIN SIDEBAR ---
export function Sidebar({
  defaultTemplateName,
  onExport,
  onSave,
}: {
  defaultTemplateName?: string
  onExport?: () => void
  onSave?: (name: string) => Promise<void>
}) {
  const selectedNode = useSelectedNode();
  const { clearSelection, updateNodeProperty, updateNodePropertyLive, commitLiveUpdate } = useCanvasActions();

  return (
    <div className="h-full border-l bg-background flex flex-col w-80 shadow-sm z-10">
      {selectedNode ? (
        <BlockEditor
          node={selectedNode}
          onUpdateProperty={(property, value) => updateNodeProperty(selectedNode.id, property, value)}
          onUpdatePropertyLive={(property, value) => updateNodePropertyLive(selectedNode.id, property, value)}
          onCommitLiveUpdate={commitLiveUpdate}
          defaultTemplateName={defaultTemplateName}
          onBack={clearSelection}
          onExport={onExport}
          onSave={onSave}
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
  onUpdatePropertyLive,
  onCommitLiveUpdate,
  defaultTemplateName,
  onBack,
  onExport,
  onSave,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onUpdatePropertyLive: (property: string, value: unknown) => void;
  onCommitLiveUpdate: () => void;
  defaultTemplateName?: string;
  onBack: () => void;
  onExport?: () => void;
  onSave?: (name: string) => Promise<void>;
}) {
  const isUpdate = !!defaultTemplateName;
  const [templateName, setTemplateName] = useState(defaultTemplateName ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Listen for the native 'change' event (fires when the picker closes)
  // to commit the live update as a single undo step.
  useEffect(() => {
    const el = colorInputRef.current;
    if (!el) return;
    const handleChange = () => onCommitLiveUpdate();
    el.addEventListener('change', handleChange);
    return () => el.removeEventListener('change', handleChange);
  }, [onCommitLiveUpdate]);

  const handleSave = async () => {
    if (!onSave || !templateName.trim()) return;
    setSaveState('saving');
    try {
      await onSave(templateName.trim());
      setSaveState('saved');
      setTimeout(() => { setSaveState('idle'); setTemplateName(''); }, 2000);
    } catch {
      setSaveState('idle');
    }
  };

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
                  ref={colorInputRef}
                  id="color-picker"
                  type="color"
                  value={fillColorString}
                  onChange={(e) => onUpdatePropertyLive('fill', e.target.value)}
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

          {/* Save to DB */}
          <div className="space-y-2">
            <Label>{isUpdate ? 'Update Template' : 'Save Template'}</Label>
            <Input
              placeholder="Template name..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              disabled={saveState === 'saving'}
            />
            <Button
              className="w-full gap-2"
              variant="secondary"
              onClick={handleSave}
              disabled={!templateName.trim() || saveState === 'saving' || !onSave}
            >
              {saveState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveState === 'saved' && <Check className="h-4 w-4" />}
              {saveState === 'idle' && <Save className="h-4 w-4" />}
              {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved!' : isUpdate ? 'Update' : 'Save'}
            </Button>
          </div>
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