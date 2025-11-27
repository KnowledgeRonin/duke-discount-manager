import { useDraggable } from '@dnd-kit/core';

export function Sidebar() {

  // Definition of the Rectangle template
  const RECTANGLE_TEMPLATE_ID = "RECTANGLE";

    // 1. DND-KIT: Hook useDraggable
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: RECTANGLE_TEMPLATE_ID, // Unique ID that is transferred
        data: {
            templateType: 'RECTANGLE' // Additional information (optional, but useful)
        }
    });

    // Apply position transformation while dragging
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

  return (
    <div className="w-64 p-4 border-r">
            <h3 className="font-semibold mb-3">Plantillas</h3>
            <div
                // 2. DND-KIT: Assign listeners and attributes to the draggable element
                ref={setNodeRef} // DOM node reference
                style={style} 
                {...listeners} // Drag events (mousedown, touchstart)
                {...attributes} // Accessibility attributes and role
                className="p-3 bg-gray-100 border rounded cursor-grab mb-2 shadow hover:shadow-md transition duration-150"
            >
                Plantilla Rectángulo ({RECTANGLE_TEMPLATE_ID})
            </div>
            {/* ... more templates ... */}
        </div>
  );
}