import { Header } from "@/components/header";
import { CanvasArea } from "@/components/canvas";
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { DndContext, DragEndEvent } from '@dnd-kit/core';

interface Block {
    id: string;
    type: string;
    x: number;
    y: number;
    text: string;
}

export default function Home() {

  const [blocks, setBlocks] = useState<Block[]>([]);

  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(null);

  // 3. Función que se ejecuta cuando se suelta un elemento en el Canvas
  const handleDropTemplate = (templateType: string, pos: { x: number; y: number }) => {
        
      // Simplemente crea un bloque de texto para este ejemplo
      const newBlock: Block = {
          id: `block-${Date.now()}`, // ID único
          type: templateType,
          x: pos.x,
          y: pos.y,
          text: `Nuevo ${templateType}`,
      };

      // 4. Actualiza el estado, lo que dispara un nuevo renderizado de CanvasArea
      setBlocks((prevBlocks) => [...prevBlocks, newBlock]);
  };

  // 1. DND-KIT: Se ejecuta cuando un arrastre comienza
  const handleDragStart = (event: any) => {
      // Almacena el tipo de plantilla que se está arrastrando (p. ej., "RECTANGLE")
      setActiveTemplateType(event.active.id); 
  };

  // 2. DND-KIT: Se ejecuta cuando el arrastre finaliza
  const handleDragEnd = (event: DragEndEvent) => {
      // Lógica de soltado:
      // 'over' indica dónde se soltó. Si se soltó sobre el 'canvas-area', procesamos el drop.
      if (event.over?.id === 'canvas-area' && activeTemplateType) {
            
          // Calculamos la posición del puntero para el nuevo bloque
          // Nota: dnd-kit no proporciona coordenadas de soltado relativas al destino
          // de forma simple en este contexto, así que usaremos coordenadas dummy (o
          // se requeriría calcularlo manualmente basado en el evento).
          // Para el ejemplo, usaremos un punto central:
          const pos = { x: 400, y: 300 }; // Posición fija para simplicidad

          handleDropTemplate(activeTemplateType, pos);
      }
        
      // Reinicia el tipo de plantilla activa
      setActiveTemplateType(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
                <Header />
                
                <div className="flex flex-1 w-full">
                    {/* Sidebar ahora es solo la fuente del arrastre */}
                    <Sidebar /> 
                    
                    {/* CanvasArea ahora es la zona de soltado (Droppable) */}
                    <CanvasArea 
                        blocks={blocks}
                    />
                </div>
            </div>
      </DndContext>
  );
}
