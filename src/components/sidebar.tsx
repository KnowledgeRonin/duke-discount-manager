"use client";

import { useDraggable } from '@dnd-kit/core';
import { useRef, useState, useEffect } from "react";
import { useContainerDimensions } from '@/components/canvas';

  const TEMPLATES = [
  { id: 'TEMPLATE_RECT', type: 'RECTANGLE', label: 'Standard Rectangle' },
  { id: 'TEMPLATE_SQUARE', type: 'SQUARE', label: 'Perfect square' },
  { id: 'TEMPLATE_CIRCLE', type: 'CIRCLE', label: 'Circle (Test)' },
];

export function Sidebar() {

  return (
    <div className="w-64 p-4 border-r">
        <h3 className="font-semibold mb-3 text-black">Templates</h3>
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
            className="p-4 bg-white border border-gray-200 rounded-lg cursor-grab shadow-sm hover:shadow-md hover:border-blue-400 transition-all active:cursor-grabbing select-none"
        >
            <div className="flex items-center gap-2">
                {/* A small visual icon depending on the type */}
                <div className={`w-4 h-4 rounded-sm ${type === 'CIRCLE' ? 'rounded-full bg-red-200' : 'bg-blue-200'}`} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
        </div>
    );
}