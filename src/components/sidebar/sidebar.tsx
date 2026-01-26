"use client";

import { useDraggable } from "@dnd-kit/core";
import { SVG_LIBRARY } from "@/app/page";
import { Block } from "@/app/types";
import { ScrollArea } from "@/components/ui/scroll-area"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, GripVertical } from "lucide-react";

// --- PROPS ---
interface SidebarProps {
  activeBlock: Block | null;
  onUpdateBlock: (id: string, data: Partial<Block>) => void;
  onCloseEditor: () => void;
}

// --- MAIN SIDEBAR ---
export function Sidebar({ activeBlock, onUpdateBlock, onCloseEditor }: SidebarProps) {
  return (
    <div className="h-full border-l bg-background flex flex-col w-80 shadow-sm z-10">
      {activeBlock ? (
        <BlockEditor
          block={activeBlock}
          onChange={(data) => onUpdateBlock(activeBlock.id, data)}
          onBack={onCloseEditor}
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

// --- EDITOR VIEW ---
function BlockEditor({ block, onChange, onBack }: { block: Block, onChange: any, onBack: any }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-sm">Edit {block.type}</h3>
          <p className="text-xs text-muted-foreground text-ellipsis overflow-hidden w-40">
            ID: {block.id}
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
                value={block.fill}
                onChange={(e) => onChange({ fill: e.target.value })}
                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-0 p-0"
              />
            </div>
            <Input 
                value={block.fill} 
                onChange={(e) => onChange({ fill: e.target.value })}
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
      path: item.path,
      viewBox: item.viewBox
    }
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="touch-none">
       <Card 
        className={`cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all ${
            isDragging ? 'opacity-50 ring-2 ring-blue-400' : 'hover:shadow-md'
        }`}
       >
         <CardContent className="p-3 flex flex-col items-center gap-2 h-28 justify-center">
            {/* Simple rendering of the SVG for preview */}
            <svg
                viewBox={`0 0 ${item.viewBox.w} ${item.viewBox.h}`}
                className="w-12 h-12 fill-foreground/80"
            >
                <path d={item.path} />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
         </CardContent>
       </Card>
    </div>
  );
}