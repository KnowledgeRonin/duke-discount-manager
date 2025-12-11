"use client";

import { useDraggable } from '@dnd-kit/core';
import { useRef, useState, useEffect } from "react";
import { useContainerDimensions } from '@/components/canvas';

export function Sidebar() {

  // Definition of the Rectangle template
  const RECTANGLE_TEMPLATE_ID = "RECTANGLE";

  const { dimensions, containerRef } = useContainerDimensions(0, 0);

    // 1. DND-KIT: Hook useDraggable
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: RECTANGLE_TEMPLATE_ID, // Unique ID that is transferred
        data: {
            templateType: 'RECTANGLE', // Additional information (optional, but useful)
            w: dimensions.width,
            h: dimensions.height
        }
    });

    // Apply position transformation while dragging
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

  return (
    <div className="w-64 p-4 border-r">
            <h3 className="font-semibold mb-3 text-black">Templates</h3>
            <div
                // 2. DND-KIT: Assign listeners and attributes to the draggable element
                ref={(node) => {
                    setNodeRef(node); // DOM node reference
                    containerRef.current = node;
                }}
                style={style} 
                {...listeners} // Drag events (mousedown, touchstart)
                {...attributes} // Accessibility attributes and role
                className="p-3 bg-gray-100 border border-gray-200 rounded cursor-grab mb-2 shadow hover:shadow-md transition duration-150 text-black"
            >
                Rectangle Template ({RECTANGLE_TEMPLATE_ID})
            </div>
            {/* ... more templates ... */}
        </div>
  );
}