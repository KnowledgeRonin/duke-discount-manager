"use client";

import { Stage, Layer } from "react-konva";
import { useDroppable } from "@dnd-kit/core";
import { RefObject } from "react";
import { Block } from "@/app/page";
import { DraggableSVG } from "@/components/canvas/DraggableSVG";

interface CanvasAreaProps {
    blocks: Block[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDeselect: () => void;
    onUpdateBlock: (id: string, attrs: Partial<Block>) => void;
    dimensions: { width: number; height: number };
    containerRef: RefObject<HTMLDivElement | null>;
}

export function CanvasArea({ blocks, selectedId, onSelect, onUpdateBlock, dimensions, containerRef }: CanvasAreaProps) {

    const { isOver, setNodeRef } = useDroppable({ id: 'canvas-area' });

    const droppableStyle = {
        opacity: isOver ? 0.9 : 1,
        border: isOver ? '4px dashed #3B82F6' : '1px solid #e5e7eb',
        borderRadius: '10px'
    };

    return (
        <div className="flex flex-1 w-full h-full bg-gray-100 justify-center items-center overflow-auto">
            <div 
                ref={(node) => {
                    setNodeRef(node);
                    containerRef.current = node;
                }}
                style={droppableStyle}
                className="w-[75vw] h-[90vh] bg-gray-100 flex justify-center items-center overflow-hidden"
            >
                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    className="shadow-xl bg-white"
                    onMouseDown={(e) => {
                        // Si hacemos clic en el fondo vacío, deseleccionamos todo
                        if (e.target === e.target.getStage()) {
                            onDeselect();
                        }
                    }}
                    onTouchStart={(e) => {
                        if (e.target === e.target.getStage()) {
                            onDeselect();
                        }
                    }}
                >
                    <Layer>
                        {blocks.map((block) => (
                            <DraggableSVG
                                key={block.id}
                                block={block}
                                isSelected={selectedId === block.id}
                                onSelect={() => onSelect(block.id)}
                                onUpdate={onUpdateBlock}
                            />
                        ))}
                    </Layer>
                </Stage>
                
                {blocks.length === 0 && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xl font-medium">Lienzo Vacío</span>
                        <span className="text-sm mt-1">Arrastra elementos desde la barra lateral</span>
                    </div>
                )}
            </div>
        </div>
    );
}