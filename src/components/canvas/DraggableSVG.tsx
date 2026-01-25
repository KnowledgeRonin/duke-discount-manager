import { useRef, useEffect } from "react";
import { Group, Path, Transformer } from "react-konva";
import Konva from "konva";
import { Block } from "@/app/types";

interface DraggableSVGProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, attrs: Partial<Block>) => void;
}

export function DraggableSVG({ block, isSelected, onSelect, onUpdate }: DraggableSVGProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onUpdate(block.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;

    onUpdate(block.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={block.x}
        y={block.y}
        rotation={block.rotation}
        scaleX={block.scaleX}
        scaleY={block.scaleY}
        draggable
        onClick={onSelect}
        onTap={onSelect} // Para soporte táctil
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {/* SVG */}
        <Path
          data={block.pathData}
          fill={block.fill}
          offsetX={block.viewBox.w / 2}
          offsetY={block.viewBox.h / 2}
        />
      </Group>

      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio={true} 
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  );
}