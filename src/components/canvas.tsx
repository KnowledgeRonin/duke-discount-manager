"use client";

import { Stage, Layer, Text, Transformer, Rect } from "react-konva";
import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";

interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text: string;
}

// ➡️ Definition of CanvasArea props
interface CanvasAreaProps {
    // For the holy spirit thank god onDropTemplate is no longer used here; it's used in Home with DndContext
    blocks: Block[]; 
}

export function CanvasArea({ blocks }: CanvasAreaProps) {

  // 1. DND-KIT: Hook useDroppable
    const { isOver, setNodeRef } = useDroppable({
        id: 'canvas-area', // ID that will be used in handleDragEnd of Home
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Visual style to indicate that a draggable is over this area
    const droppableStyle = {
        opacity: isOver ? 0.9 : 1,
        border: isOver ? '4px dashed #3B82F6' : '1px solid #e5e7eb',
    };

  return (
    <div 
            // 2. DND-KIT: Assign the node reference
            ref={setNodeRef} 
            style={droppableStyle}
            className="w-full h-full bg-gray-100 flex justify-center items-center overflow-hidden" 
        >
            <Stage
                width={800}
                height={600}
                className="shadow-xl bg-white"
                onMouseDown={(e) => {
                    // Deselection when clicking outside
                    const clickedEmpty = e.target === e.target.getStage();
                    if (clickedEmpty) setSelectedId(null);
                }}
            >
                <Layer>
                    {blocks.map((block) => (
                        // We use the 'type' to decide which component to render.
                        <ElementWrapper
                            key={block.id}
                            block={block}
                            isSelected={selectedId === block.id}
                            onSelect={() => setSelectedId(block.id)}
                        />
                    ))}
                </Layer>
            </Stage>
            {blocks.length === 0 && (
                <p className="absolute text-gray-500 text-lg pointer-events-none">
                    Drag a template here
                </p>
            )}
        </div>
  );
}

function ElementWrapper({ block, isSelected, onSelect }: any) {
    if (block.type === 'RECTANGLE') {
        return (
            <DraggableRectangle
                id={block.id}
                x={block.x}
                y={block.y}
                text={block.text}
                isSelected={isSelected}
                onSelect={onSelect}
            />
        );
    }
    // You can add more item types here
    return null;
}

// Konva component for rectangle
function DraggableRectangle({ id, text, x, y, isSelected, onSelect }: any) {
    const shapeRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Use useEffect to handle selection and the transformer
    if (isSelected && trRef.current && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
    }

    return (
        <>
            <Rect
                ref={shapeRef}
                x={x}
                y={y}
                width={150}
                height={80}
                fill="#81E6D9" // Pretty color
                stroke="#000"
                strokeWidth={2}
                cornerRadius={10}
                draggable
                onClick={onSelect}
                onTap={onSelect}
            />
            <Text
                text={text}
                x={x + 10}
                y={y + 30}
                fontSize={16}
                fill="#000"
                width={130}
                align="center"
                listening={false} // Use useEffect to handle selection and the transformer
            />
            {isSelected && <Transformer ref={trRef} rotateEnabled={true} />}
        </>
    );
}
