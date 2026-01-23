"use client";

import { Stage, Layer, Text, Transformer, Rect, Path, Group } from "react-konva";
import { useRef, useState, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { RefObject } from "react";
import Konva from 'konva';
import { Block } from "@/app/page";

interface CanvasAreaProps {
    blocks: Block[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDeselect: () => void;
    onUpdateBlock: (id: string, attrs: Partial<Block>) => void;
    dimensions: { width: number; height: number };
    containerRef: RefObject<HTMLDivElement | null>;
}

export function CanvasArea({ 
    blocks, 
    selectedId, 
    onSelect, 
    onDeselect, 
    onUpdateBlock,
    dimensions, 
    containerRef 
}: CanvasAreaProps) {

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
                >
                    <Layer>
                        {blocks.map((block) => (
                            <ElementWrapper
                                key={block.id}
                                block={block}
                                isSelected={selectedId === block.id} // We compare with prop
                                onSelect={() => onSelect(block.id)}  // We call prop
                                onUpdate={onUpdateBlock}             // We ran the updater
                                stageDimensions={dimensions}
                            />
                        ))}
                    </Layer>
                </Stage>
                
                {blocks.length === 0 && (
                    <div className="absolute pointer-events-none text-gray-400 flex flex-col items-center">
                        <span className="text-xl font-semibold">Empty Canvas</span>
                        <span className="text-sm">Drag a template from the left</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function ElementWrapper({ block, isSelected, onSelect, onUpdate, stageDimensions }: any) {
    if (block.type === 'RECTANGLE' || block.type === 'SQUARE' || block.type === 'SVG') {
        return (
            <DraggablePath
                {...block} // We pass all the block's props (x, y, fill, text, etc.)
                isSelected={isSelected}
                onSelect={onSelect}
                onUpdate={onUpdate}
            />
        );
    }
    return null;
}

// Konva component for rectangle
function DraggablePath({ 
    id, x, y, pathData, fill, scaleX, scaleY, 
    isSelected, onSelect, onUpdate 
}: any) {
    
    const groupRef = useRef<Konva.Group>(null);
    const trRef = useRef<Konva.Transformer>(null);

    useEffect(() => {
        if (isSelected && trRef.current && groupRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Group
                ref={groupRef}
                x={x}
                y={y}
                scaleX={scaleX} // Usamos escala en lugar de width
                scaleY={scaleY}
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    onUpdate(id, {
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    if (node) {
                        // Al terminar de redimensionar, guardamos la nueva escala
                        onUpdate(id, {
                            x: node.x(),
                            y: node.y(),
                            scaleX: node.scaleX(),
                            scaleY: node.scaleY(),
                        });
                    }
                }}
            >
                {/* El Path dibuja la forma vectorial */}
                <Path
                    data={pathData}
                    fill={fill}
                    // Centrar el SVG es un truco visual, 
                    // a veces es necesario ajustar el offset si el SVG no viene centrado
                    x={0} 
                    y={0}
                />
            </Group>

            {isSelected && (
                <Transformer
                    ref={trRef}
                    // IMPORTANTE: Para vectores queremos que mantenga proporción por defecto?
                    // false = permite deformar. true = fuerza proporción.
                    keepRatio={false} 
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                />
            )}
        </>
    );
}

{function DraggableRectangle({ id, text, x, y, width, height, fill, isSelected, onSelect, onUpdate, stageDimensions }: any) {
    const shapeRef = useRef<Konva.Rect>(null);
    const trRef = useRef<Konva.Transformer>(null);

    // Effect for handling the Konva Transformer when the selection changes
    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Rect
                ref={shapeRef}
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill || "#F3F4F6"} // We use dynamic color
                stroke={isSelected ? "#3B82F6" : "#E5E7EB"} // Extra visual feedback
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={6}
                draggable={false}
                // IMPORTANT: After dragging, we update the global status in 'Home'
                onDragEnd={(e) => {
                    onUpdate(id, {
                        x: e.target.x(),
                        y: e.target.y()
                    });
                }}
                onClick={onSelect}
                onTap={onSelect}
            />
            
            {/* Simple centered text */}
            <Text
                text={text}
                x={x}
                y={y}
                width={width}
                height={height}
                verticalAlign="middle"
                align="center"
                listening={false} // Click-through to select the rectangle
            />

            {isSelected && (
                <Transformer 
                    ref={trRef}
                    centeredScaling={true}
                    rotateEnabled={false} // Simplified for the example
                    boundBoxFunc={(oldBox, newBox) => {
                        // Avoid resizing to very small sizes
                        if (newBox.width < 20 || newBox.height < 20) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    onTransformEnd={() => {
                        // Update global size upon completion of transformation
                        const node = shapeRef.current;
                        if(node) {
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            
                            // Reset scale and update actual width/height to avoid distortion
                            node.scaleX(1);
                            node.scaleY(1);
                            
                            onUpdate(id, {
                                x: node.x(),
                                y: node.y(),
                                width: Math.max(5, node.width() * scaleX),
                                height: Math.max(5, node.height() * scaleY),
                            });
                        }
                    }}
                />
            )}
        </>
    );
}}

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
        {/*console.log("The group tried to move, heading back home...");*/}

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