import { useEffect, useRef, useCallback } from 'react';
import { Canvas } from 'fabric';

export function useFabricCanvas(canvasElementId: string) {
  const canvasRef = useRef<Canvas | null>(null);

  useEffect(() => {
    const canvas = new Canvas(canvasElementId, {
      preserveObjectStacking: true,
    });

    // ✅ Activa el historial nativo de Fabric
    canvas.set('includeDefaultValues', false);

    canvasRef.current = canvas;

    return () => {
      canvas.dispose();
    };
  }, [canvasElementId]);

  const undo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  return { canvasRef, undo, redo };
}