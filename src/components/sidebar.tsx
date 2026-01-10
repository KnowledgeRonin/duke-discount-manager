"use client";

import { useDraggable } from '@dnd-kit/core';
import { useContainerDimensions } from '@/components/canvas';
import { Block } from '@/app/page';

interface SidebarProps {
  activeBlock: Block | null;
  onUpdateBlock: (id: string, data: Partial<Block>) => void;
  onCloseEditor: () => void;
}

export function Sidebar({ activeBlock, onUpdateBlock, onCloseEditor }: SidebarProps) {

if (activeBlock) {
    return (
      <BlockEditor 
        block={activeBlock} 
        onChange={(data) => onUpdateBlock(activeBlock.id, data)}
        onBack={onCloseEditor}
      />
    );
  }

  return <TemplateLibrary />;
}

const TEMPLATES = [
  { id: 'TEMPLATE_RECT', type: 'RECTANGLE', label: 'Rectangle' },
  { id: 'TEMPLATE_SQUARE', type: 'SQUARE', label: 'Perfect square' },
];

function TemplateLibrary() {
  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="font-bold text-lg mb-1 text-gray-800">Biblioteca</h3>
      <p className="text-xs text-gray-400 mb-4">Drag elements onto the canvas</p>
      <div className="space-y-3">
          {TEMPLATES.map((template) => (
            <DraggableSidebarItem 
              key={template.id}
              id={template.id}
              type={template.type}
              label={template.label}
            />
          ))}
      </div>
    </div>
  );
}

interface BlockEditorProps {
  block: Block;
  onChange: (data: Partial<Block>) => void;
  onBack: () => void;
}

function BlockEditor({ block, onChange, onBack }: BlockEditorProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <h3 className="font-bold text-gray-700">Edit {block.type}</h3>
        <button onClick={onBack} className="text-xs text-blue-500 hover:underline">
          Cerrar
        </button>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4 overflow-y-auto">
        
        {/* Text Input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Text</label>
          <input 
            type="text" 
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Input Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Background Color</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              value={block.fill}
              onChange={(e) => onChange({ fill: e.target.value })}
              className="h-8 w-8 cursor-pointer border-0 p-0 rounded overflow-hidden"
            />
            <span className="text-sm text-gray-600 self-center">{block.fill}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarItemProps {
    id: string;
    type: string;
    label: string;
}

function DraggableSidebarItem({ id, type, label }: SidebarItemProps) {
    // Each item measures its own size to transfer it to the canvas
    const { dimensions, containerRef } = useContainerDimensions(0, 0);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: {
            templateType: type,
            // If it's a SQUARE, force width and height to be equal, for example
            w: type === 'SQUARE' ? 100 : dimensions.width,
            h: type === 'SQUARE' ? 100 : dimensions.height,
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999, // It ensures that it is seen above all else when dragging
    } : undefined;

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                containerRef.current = node;
            }}
            style={style}
            {...listeners}
            {...attributes}
            className="p-4 bg-white border border-gray-200 rounded-lg cursor-grab shadow-sm hover:shadow-md hover:border-blue-400 active:cursor-grabbing select-none"
        >
            <div className="flex items-center gap-2">
                {/* A small visual icon depending on the type */}
                <div className={`w-4 h-4 rounded-sm ${type === 'CIRCLE' ? 'rounded-full bg-red-200' : 'bg-blue-200'}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
        </div>
    );
}