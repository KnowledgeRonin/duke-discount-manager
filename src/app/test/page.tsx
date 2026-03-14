"use client";

import { useEffect, useRef } from "react";
import { useCanvasRenderer, useCanvasStore, parseSVGToGroupNode } from "@/lib/canvas";
import { SVG_LIBRARY } from "@/utils/library";
import { Button } from "@/components/ui/button";

export default function CanvasTestPage() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 1. Inicializamos el renderizador en el contenedor HTML
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvasRenderer(canvasRef);
  
  // 2. Traemos las acciones del store para modificar el estado
  const addNode = useCanvasStore((state) => state.addNode);
  const clear = useCanvasStore((state) => state.clear);
  const loadScene = useCanvasStore((state) => state.loadScene);
  const isInitialized = useCanvasStore((state) => state.root !== null);

  useEffect(() => {
    if (!isInitialized) {
      loadScene({
        version: "7.0.0",
        width: 800,
        height: 600,
        objects: []
      });
    }
  }, [isInitialized, loadScene]);

  const handleLoadSVG = async (svgString: string) => {
    try {
      // Magia: Convertimos el string SVG crudo a nuestro SceneNode validado (GroupNode)
      const groupNode = await parseSVGToGroupNode(svgString);

      // Lo añadimos al estado global (Zustand). El Renderer lo detectará y lo dibujará solo.
      addNode(groupNode);
    } catch (error) {
      console.error("No se pudo parsear el SVG", error);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50">
      <header className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="font-bold text-lg">Test de Nueva Arquitectura Canvas</h1>
          <p className="text-xs text-slate-500">
            Usando: <code className="bg-slate-100 px-1 rounded">svgParser</code> + <code className="bg-slate-100 px-1 rounded">store</code> + <code className="bg-slate-100 px-1 rounded">CanvasRenderer</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
          {SVG_LIBRARY.filter(i => i.type === 'SVG').map((item, idx) => (
            <Button
              key={idx}
              variant="outline"
              onClick={() => handleLoadSVG(item.content!)}
            >
              Cargar {item.label}
            </Button>
          ))}
          <Button variant="destructive" onClick={clear}>Limpiar Canvas</Button>
          <Button 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              const root = useCanvasStore.getState().root;
              if (!root || root.objects.length === 0) {
                alert("El lienzo está vacío. Haz clic en 'Cargar...' primero para tener algo que exportar.");
                return;
              }
              
              // Legacy code in canvasData expects a SINGLE Fabric Object (usually a group), NOT an array.
              // If there's 1 element, we export it directly. If more, we export the root group itself.
              const dataToExport = root.objects.length === 1 ? root.objects[0] : root;
              
              navigator.clipboard.writeText(JSON.stringify(dataToExport, null, 2));
              alert("Objeto exportado al portapapeles exitosamente! Pégalo en el canvasData de library.ts");
            }}
          >
            Exportar JSON
          </Button>
        </div>
      </header>

      {/* Aquí es donde FabricJS inyectará física y visualmente el <canvas> */}
      <div 
        ref={canvasContainerRef} 
        className="flex-1 w-full relative overflow-hidden bg-white" 
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
}
