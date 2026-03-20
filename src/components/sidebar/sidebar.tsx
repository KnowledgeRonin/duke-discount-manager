"use client";

import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { SVG_LIBRARY } from "@/data/library";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  BringToFront, SendToBack, ChevronUp, ChevronDown,
  Download, Save, Check, Loader2, Trash2,
} from "lucide-react";
import { FabricThumbnail } from "@/components/canvas/FabricThumbnail";
import { useSelectedNode, useCanvasActions } from "@/lib/canvas";
import { useCanvasStore } from "@/lib/canvas/store";
import type { SceneNode, TextNode, RectNode, Shadow } from "@/lib/canvas";

// --- MAIN SIDEBAR ---
export function Sidebar({
  defaultTemplateName,
  onExport,
  onSave,
  onSaveAs,
}: {
  defaultTemplateName?: string
  onExport?: () => void
  onSave?: (name: string) => Promise<void>
  onSaveAs?: (name: string) => Promise<void>
}) {
  const selectedNode = useSelectedNode();
  const { clearSelection, updateNodeProperty, updateNodePropertyLive, commitLiveUpdate, selectNode } = useCanvasActions();
  const root = useCanvasStore((state) => state.root);

  const isEditingTemplate = !!defaultTemplateName;

  useEffect(() => {
    if (isEditingTemplate && !selectedNode && root?.objects?.[0]) {
      selectNode(root.objects[0].id);
    }
  }, [isEditingTemplate, selectedNode, root, selectNode]);

  return (
    <div className="h-full border-l bg-background flex flex-col w-80 shadow-sm z-10">
      {selectedNode ? (
        <BlockEditor
          node={selectedNode}
          onUpdateProperty={(property, value) => updateNodeProperty(selectedNode.id, property, value)}
          onUpdatePropertyLive={(property, value) => updateNodePropertyLive(selectedNode.id, property, value)}
          onCommitLiveUpdate={commitLiveUpdate}
          defaultTemplateName={defaultTemplateName}
          onBack={isEditingTemplate ? undefined : clearSelection}
          onExport={onExport}
          onSave={onSave}
          onSaveAs={onSaveAs}
        />
      ) : (
        <TemplateLibrary />
      )}
    </div>
  );
}

// --- LIBRARY VIEW ---
function TemplateLibrary() {
  const { clear } = useCanvasActions();
  const [confirming, setConfirming] = useState(false);

  const handleClear = () => {
    clear();
    setConfirming(false);
  };

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

      <div className="p-3 border-t">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-1">Are you sure?</span>
            <Button variant="destructive" size="sm" onClick={handleClear}>Yes</Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>No</Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" />
            Clear canvas
          </Button>
        )}
      </div>
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
  onSaveAs,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onUpdatePropertyLive: (property: string, value: unknown) => void;
  onCommitLiveUpdate: () => void;
  defaultTemplateName?: string;
  onBack?: () => void;
  onExport?: () => void;
  onSave?: (name: string) => Promise<void>;
  onSaveAs?: (name: string) => Promise<void>;
}) {
  const isUpdate = !!defaultTemplateName;
  const [templateName, setTemplateName] = useState(defaultTemplateName ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsState, setSaveAsState] = useState<'idle' | 'saving' | 'saved'>('idle');

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

  const handleSaveAs = async () => {
    if (!onSaveAs || !saveAsName.trim()) return;
    setSaveAsState('saving');
    try {
      await onSaveAs(saveAsName.trim());
      setSaveAsState('saved');
      setTimeout(() => { setSaveAsState('idle'); setSaveAsName(''); }, 2000);
    } catch {
      setSaveAsState('idle');
    }
  };

  const fillColorString = typeof node.fill === 'string'
    ? node.fill
    : ((node.fill as any)?.colorStops?.[0]?.color ?? '#000000');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h3 className="font-semibold text-sm">Edit {node.type}</h3>
          <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden w-50">
            ID: {node.id}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Text Formatting — only for textbox nodes */}
          {node.type === 'textbox' && (
            <TextFormattingPanel node={node as TextNode} onUpdateProperty={onUpdateProperty} />
          )}

          {/* Opacity */}
          <OpacityPanel node={node} onUpdatePropertyLive={onUpdatePropertyLive} onCommitLiveUpdate={onCommitLiveUpdate} />

          {/* Fill Color */}
          <div className="space-y-2">
            <Label>Fill Color</Label>
            <LiveColorInput
              value={fillColorString}
              onLive={(color) => onUpdatePropertyLive('fill', color)}
              onCommit={onCommitLiveUpdate}
            />
          </div>

          {/* Stroke */}
          <StrokePanel node={node} onUpdateProperty={onUpdateProperty} onUpdatePropertyLive={onUpdatePropertyLive} onCommitLiveUpdate={onCommitLiveUpdate} />

          {/* Border Radius — rect only */}
          {node.type === 'rect' && (
            <BorderRadiusPanel node={node as RectNode} onUpdateProperty={onUpdateProperty} />
          )}

          {/* Shadow */}
          <ShadowPanel node={node} onUpdateProperty={onUpdateProperty} onUpdatePropertyLive={onUpdatePropertyLive} onCommitLiveUpdate={onCommitLiveUpdate} />

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

          {/* Save As — only when editing an existing template */}
          {isUpdate && onSaveAs && (
            <div className="space-y-2">
              <Separator />
              <Label>Save as New Template</Label>
              <Input
                placeholder="New template name..."
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
                disabled={saveAsState === 'saving'}
              />
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handleSaveAs}
                disabled={!saveAsName.trim() || saveAsState === 'saving'}
              >
                {saveAsState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                {saveAsState === 'saved' && <Check className="h-4 w-4" />}
                {saveAsState === 'idle' && <Save className="h-4 w-4" />}
                {saveAsState === 'saving' ? 'Saving...' : saveAsState === 'saved' ? 'Saved!' : 'Save as New'}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// --- LIVE COLOR INPUT ---
// Reusable color picker: React onChange → live update; native 'change' (picker close) → commit.
function LiveColorInput({
  value,
  onLive,
  onCommit,
}: {
  value: string;
  onLive: (color: string) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onCommit();
    el.addEventListener('change', handle);
    return () => el.removeEventListener('change', handle);
  }, [onCommit]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative overflow-hidden rounded-md border shadow-sm w-10 h-10 flex-shrink-0">
        <input
          ref={ref}
          type="color"
          value={value}
          onChange={(e) => onLive(e.target.value)}
          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-0 p-0"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onLive(e.target.value)}
        className="font-mono uppercase w-28"
      />
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

      {/* Style toggles */}
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
        <Button
          variant={node.underline ? 'default' : 'outline'}
          size="icon"
          onClick={() => onUpdateProperty('underline', !node.underline)}
          aria-label="Toggle underline"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          variant={node.linethrough ? 'default' : 'outline'}
          size="icon"
          onClick={() => onUpdateProperty('linethrough', !node.linethrough)}
          aria-label="Toggle strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
      </div>

      {/* Alignment */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Alignment</Label>
        <div className="flex gap-1">
          {(['left', 'center', 'right', 'justify'] as const).map((align) => {
            const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : align === 'right' ? AlignRight : AlignJustify;
            return (
              <Button
                key={align}
                variant={node.textAlign === align ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onUpdateProperty('textAlign', align)}
                aria-label={`Align ${align}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Text Transform */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Transform</Label>
        <div className="flex gap-1">
          {([
            { value: 'none', label: 'Ag' },
            { value: 'uppercase', label: 'AA' },
            { value: 'lowercase', label: 'aa' },
            { value: 'capitalize', label: 'Aa' },
          ] as const).map(({ value, label }) => (
            <Button
              key={value}
              variant={node.textTransform === value ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2 text-xs font-mono"
              onClick={() => onUpdateProperty('textTransform', value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-1">
        <Label htmlFor="line-height" className="text-xs text-muted-foreground">Line Height</Label>
        <Input
          id="line-height"
          type="number"
          min={0.5}
          max={3.0}
          step={0.1}
          value={node.lineHeight}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 0.5 && val <= 3.0) onUpdateProperty('lineHeight', val);
          }}
          className="w-24"
        />
      </div>

      {/* Char Spacing */}
      <div className="space-y-1">
        <Label htmlFor="char-spacing" className="text-xs text-muted-foreground">Letter Spacing</Label>
        <Input
          id="char-spacing"
          type="number"
          min={-200}
          max={800}
          step={10}
          value={node.charSpacing}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= -200 && val <= 800) onUpdateProperty('charSpacing', val);
          }}
          className="w-24"
        />
      </div>
    </div>
  );
}

// --- OPACITY PANEL ---
function OpacityPanel({
  node,
  onUpdatePropertyLive,
  onCommitLiveUpdate,
}: {
  node: SceneNode;
  onUpdatePropertyLive: (property: string, value: unknown) => void;
  onCommitLiveUpdate: () => void;
}) {
  const pct = Math.round(node.opacity * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Opacity</Label>
        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onUpdatePropertyLive('opacity', Number(e.target.value) / 100)}
        onPointerUp={onCommitLiveUpdate}
        className="w-full h-2 accent-foreground cursor-pointer"
      />
    </div>
  );
}

// --- STROKE PANEL ---
function StrokePanel({
  node,
  onUpdateProperty,
  onUpdatePropertyLive,
  onCommitLiveUpdate,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onUpdatePropertyLive: (property: string, value: unknown) => void;
  onCommitLiveUpdate: () => void;
}) {
  const hasStroke = node.stroke !== null;

  const enableStroke = () => {
    onUpdateProperty('stroke', '#000000');
    onUpdateProperty('strokeWidth', 1);
  };

  const disableStroke = () => {
    onUpdateProperty('stroke', null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Stroke</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={hasStroke ? disableStroke : enableStroke}
        >
          {hasStroke ? 'Remove' : 'Add'}
        </Button>
      </div>

      {hasStroke && (
        <div className="space-y-3">
          <LiveColorInput
            value={node.stroke!}
            onLive={(color) => onUpdatePropertyLive('stroke', color)}
            onCommit={onCommitLiveUpdate}
          />

          <div className="space-y-1">
            <Label htmlFor="stroke-width" className="text-xs text-muted-foreground">Width</Label>
            <Input
              id="stroke-width"
              type="number"
              min={0}
              max={100}
              step={1}
              value={node.strokeWidth}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 0) onUpdateProperty('strokeWidth', val);
              }}
              className="w-24"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dash Style</Label>
            <div className="flex gap-1">
              {([
                { label: '—', value: null },
                { label: '- -', value: [10, 5] },
                { label: '···', value: [2, 5] },
              ] as const).map(({ label, value }) => {
                const current = JSON.stringify(node.strokeDashArray ?? null);
                const target = JSON.stringify(value);
                return (
                  <Button
                    key={label}
                    variant={current === target ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-3 text-xs font-mono"
                    onClick={() => onUpdateProperty('strokeDashArray', value)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- BORDER RADIUS PANEL (rect only) ---
function BorderRadiusPanel({
  node,
  onUpdateProperty,
}: {
  node: RectNode;
  onUpdateProperty: (property: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Border Radius</Label>
      <div className="flex gap-3">
        <div className="space-y-1">
          <Label htmlFor="rx" className="text-xs text-muted-foreground">rx</Label>
          <Input
            id="rx"
            type="number"
            min={0}
            step={1}
            value={node.rx}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0) onUpdateProperty('rx', val);
            }}
            className="w-20"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ry" className="text-xs text-muted-foreground">ry</Label>
          <Input
            id="ry"
            type="number"
            min={0}
            step={1}
            value={node.ry}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val >= 0) onUpdateProperty('ry', val);
            }}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
}

// --- SHADOW PANEL ---
function ShadowPanel({
  node,
  onUpdateProperty,
  onUpdatePropertyLive,
  onCommitLiveUpdate,
}: {
  node: SceneNode;
  onUpdateProperty: (property: string, value: unknown) => void;
  onUpdatePropertyLive: (property: string, value: unknown) => void;
  onCommitLiveUpdate: () => void;
}) {
  const shadow = node.shadow as Shadow | null;
  const hasShadow = shadow !== null;

  const enableShadow = () => {
    onUpdateProperty('shadow', { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 });
  };

  const disableShadow = () => {
    onUpdateProperty('shadow', null);
  };

  const updateShadow = (field: keyof Shadow, value: unknown) => {
    if (!shadow) return;
    onUpdateProperty('shadow', { ...shadow, [field]: value });
  };

  const updateShadowLive = (field: keyof Shadow, value: unknown) => {
    if (!shadow) return;
    onUpdatePropertyLive('shadow', { ...shadow, [field]: value });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Shadow</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={hasShadow ? disableShadow : enableShadow}
        >
          {hasShadow ? 'Remove' : 'Add'}
        </Button>
      </div>

      {hasShadow && shadow && (
        <div className="space-y-3">
          <LiveColorInput
            value={shadow.color}
            onLive={(color) => updateShadowLive('color', color)}
            onCommit={onCommitLiveUpdate}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Blur</Label>
              <span className="text-xs text-muted-foreground">{shadow.blur}</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={shadow.blur}
              onChange={(e) => updateShadowLive('blur', Number(e.target.value))}
              onPointerUp={onCommitLiveUpdate}
              className="w-full h-2 accent-foreground cursor-pointer"
            />
          </div>

          <div className="flex gap-3">
            <div className="space-y-1">
              <Label htmlFor="shadow-x" className="text-xs text-muted-foreground">Offset X</Label>
              <Input
                id="shadow-x"
                type="number"
                step={1}
                value={shadow.offsetX}
                onChange={(e) => updateShadow('offsetX', Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shadow-y" className="text-xs text-muted-foreground">Offset Y</Label>
              <Input
                id="shadow-y"
                type="number"
                step={1}
                value={shadow.offsetY}
                onChange={(e) => updateShadow('offsetY', Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}
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
