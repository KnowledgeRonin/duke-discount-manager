"use client";

import { Stage, Layer, Text, Transformer } from "react-konva";
import { useRef, useState } from "react";

interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text: string;
    // Puedes añadir más propiedades (color, width, height, etc.) aquí
}

// ➡️ Definición de las props de CanvasArea
interface CanvasAreaProps {
    onDropTemplate: (type: string, pos: { x: number; y: number }) => void;
    blocks: Block[]; // ⬅️ Nuevo: Ahora recibimos la lista de bloques
}

export function CanvasArea({ onDropTemplate, blocks }: CanvasAreaProps) {

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // 1. Recupera los datos del sidebar
    const templateType = e.dataTransfer.getData("application/template-type");
    if (templateType) {
      // 2. Calcula la posición del mouse relativa al canvas
      const rect = e.target.getBoundingClientRect();
      const pos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // 3. Llama a una función en el componente padre para agregar el bloque
      onDropTemplate(templateType, pos);
    }
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="w-full h-full border rounded-xl bg-gray-100" 
         onDragOver={handleDragOver} // Necesario para permitir el "drop"
         onDrop={handleDrop}         // Llama a onDropTemplate
      >
      
      <Stage
        width={800}
        height={600}
        onMouseDown={(e) => {
          // Deselección cuando se hace clic fuera
          const clickedEmpty = e.target === e.target.getStage();
          if (clickedEmpty) setSelectedId(null);
        }}
      >
        <Layer>
          {blocks.map((block) => (
            // Usamos el 'type' para decidir qué componente renderizar
            <ElementWrapper
                key={block.id}
                block={block}
                isSelected={selectedId === block.id}
                onSelect={() => setSelectedId(block.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function DraggableText({ id, text, x, y, isSelected, onSelect }: any) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  // Activar transformador cuando seleccionas el elemento
  if (isSelected && trRef.current && shapeRef.current) {
    trRef.current.nodes([shapeRef.current]);
    trRef.current.getLayer().batchDraw();
  }

  return (
    <>
      <Text
        ref={shapeRef}
        text={text}
        x={x}
        y={y}
        fontSize={24}
        draggable
        onClick={onSelect}
        onTap={onSelect}
      />
      {isSelected && <Transformer ref={trRef} rotateEnabled={true} />}
    </>
  );
}
