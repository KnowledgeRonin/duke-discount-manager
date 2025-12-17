"use client";

import { Stage, Layer, Text, Transformer, Rect } from "react-konva";
import { useRef, useState, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { RefObject } from "react";
import Konva from 'konva';

interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text: string;
    width?: number;
    height?: number;
}

// ➡️ Definition of CanvasArea props
interface CanvasAreaProps {
    // For the holy spirit thank god onDropTemplate is no longer used here; it's used in Home with DndContext
    blocks: Block[];
    dimensions: { width: number; height: number };
    containerRef: RefObject<HTMLDivElement | null>;
}

export function CanvasArea({ blocks, dimensions, containerRef }: CanvasAreaProps) {

  // 1. DND-KIT: Hook useDroppable
    const { isOver, setNodeRef } = useDroppable({
        id: 'canvas-area', // ID that will be used in handleDragEnd of Home
    });

    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Visual style to indicate that a draggable is over this area
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
                            stageDimensions={dimensions}
                        />
                    ))}
                </Layer>
            </Stage>
            
            {blocks.length === 0 && (
                <p className="absolute text-gray-500 text-lg">
                    Drag a template here
                </p>
            )}
        </div>
    </div>
  );
}

function ElementWrapper({ block, isSelected, onSelect, stageDimensions }: any) {
    if (block.type === 'RECTANGLE') {
        return (
            <DraggableRectangle
                id={block.id}
                x={block.x}
                y={block.y}
                text={block.text}
                width={block.width || 150} 
                height={block.height || 80}
                isSelected={isSelected}
                onSelect={onSelect}
                stageDimensions={stageDimensions}
            />
        );
    }
    // You can add more item types here
    return null;
}

// Konva component for rectangle
function DraggableRectangle({ id, text, x, y, width, height, isSelected, onSelect, stageDimensions }: any) {
    const shapeRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    // Use useEffect to handle selection and the transformer
    if (isSelected && trRef.current && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer().batchDraw();
    }

    const { handleSnapBack } = useBlockBehavior(x, y);

    return (
        <>
            <Rect
                ref={shapeRef}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#F3F4F6"
                stroke="#E5E7EB"
                strokeWidth={1}
                cornerRadius={6}
                draggable
                dragBoundFunc={createBoundaryConstraints(
                    stageDimensions.width,  // Canvas Width
                    stageDimensions.height, // Canvas Height
                    width,                  // Object Width
                    height                  // Object Height
                )}
                onDragEnd={handleSnapBack}
                onClick={onSelect}
                onTap={onSelect}
            />
            {/*<Text
                text={text}
                x={x + 10}
                y={y + 30} 
                fontSize={16}
                fill="#000"
                width={130}
                align="center"
                listening={false} // Use useEffect to handle selection and the transformer
            />*/}
            {isSelected && <Transformer ref={trRef} rotateEnabled={true} />}
        </>
    );
}

export function useContainerDimensions(initialWidth: number, initialHeight: number) {
    
    const [dimensions, setDimensions] = useState({
        width: initialWidth,
        height: initialHeight,
    });
    
    const containerRef = useRef<HTMLDivElement | null>(null);

    const updateSize = useCallback(() => {
        if (containerRef.current) {

            const height = containerRef.current.offsetHeight;
            const width = containerRef.current.offsetWidth;
            
            setDimensions({
                width: width,
                height: height
            });
        }
    }, []);

    useEffect(() => {
        updateSize();
        
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [updateSize]);

    return { dimensions, containerRef, updateSize };
}

export const useBlockBehavior = (x: number, y: number) => {
    
    const handleSnapBack = useCallback((e: any) => {
        const node = e.target;
        
        // Extra logic, such as analytics or sounds
        {/*console.log("El bloque intentó moverse, regresando a casa...");*/}

        node.to({
            x: x,
            y: y,
            duration: 0.5,
            easing: Konva.Easings.ElasticEaseOut,
        });
    }, [x, y]);

    return {
        handleSnapBack
    };
};

export const createBoundaryConstraints = (
  stageWidth: number,
  stageHeight: number,
  objectWidth: number,
  objectHeight: number
) => {

  return function (pos: { x: number; y: number }) {
    // 1. Limit X axis
    // The object cannot go further to the left than 0
    // Nor further to the right than (CanvasWidth - ObjectWidth)
    const newX = Math.max(0, Math.min(pos.x, stageWidth - objectWidth));

    // 2. Limit Y axis
    // The object cannot go higher than 0
    // Nor lower than (HighCanvas - HighObject)
    const newY = Math.max(0, Math.min(pos.y, stageHeight - objectHeight));

    return {
      x: newX,
      y: newY,
    };
  };
};