"use client";

import { Stage, Layer, Text, Transformer } from "react-konva";
import { useRef, useState } from "react";

export function CanvasArea() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="w-full h-full border rounded-xl bg-gray-100">
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
          <DraggableText
            id="text1"
            text="Título de la plantilla"
            x={80}
            y={80}
            isSelected={selectedId === "text1"}
            onSelect={() => setSelectedId("text1")}
          />
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
