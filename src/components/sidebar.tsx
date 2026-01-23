"use client";

import { useDraggable } from '@dnd-kit/core';
import { useContainerDimensions } from '@/components/canvas';
import { Block } from '@/app/page';
import { SVG_LIBRARY } from '@/app/page';

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

function TemplateLibrary() {
  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="font-bold text-lg mb-1 text-gray-800">Library</h3>
      <p className="text-xs text-gray-400 mb-4">Drag elements onto the canvas</p>
      <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-10">
        {SVG_LIBRARY.map((item) => (
          <DraggableSidebarItem
            key={item.id}
            id={item.id}
            type={item.type}
            label={item.label}
            extraData={{
              path: item.path,
              viewBox: item.viewBox
            }}
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
          Close
        </button>
      </div>
      {/* Form */}
      <div className="p-4 space-y-4 overflow-y-auto">
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
  extraData?: Record<string, any>;
}

function DraggableSidebarItem({ id, type, label, extraData }: SidebarItemProps) {
  // Each item measures its own size to transfer it to the canvas
  const { dimensions, containerRef } = useContainerDimensions(0, 0);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: {
      templateType: type,
      // If it's a SQUARE, force width and height to be equal, for example
      w: type === 'SQUARE' ? 100 : dimensions.width,
      h: type === 'SQUARE' ? 100 : dimensions.height,
      ...extraData
    }
  });
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999, // It ensures that it is seen above all else when dragging
  } : undefined;

  const viewBoxString = extraData?.viewBox
      ? `0 0 ${extraData.viewBox.w} ${extraData.viewBox.h}`
      : "0 0 24 24";

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
      }}
      style={style}
      {...listeners}
      {...attributes}
      className="flex flex-col items-center justify-center p-2 bg-white border border-gray-200 rounded-lg cursor-grab shadow-sm hover:shadow-md hover:border-blue-400 active:cursor-grabbing select-none transition-all h-32"
    >
      <div className="flex-1 w-full flex items-center justify-center p-2">
        {extraData?.path ? (
           <svg 
             viewBox={viewBoxString}
             className="w-full h-full fill-gray-600"
             preserveAspectRatio="xMidYMid meet"
             xmlns="http://www.w3.org/2000/svg"
           >
             <path d={extraData.path} />
           </svg>
        ) : (

           <div className="w-4 h-4 rounded-sm bg-blue-200" />
        )}
      </div>
    </div>
  );
}
