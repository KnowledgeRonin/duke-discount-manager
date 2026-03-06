"use client";

import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { useDroppable } from "@dnd-kit/core";
import { Block } from "@/utils/types";
import { extractFontsFromFabricJSON } from "@/utils/fontUtils";
import { loadGoogleFonts } from "@/utils/fontLoader";

interface FabricCanvasProps {
  blocks: Block[];
  onSelect: (id: string | null) => void;
  onUpdateBlock: (id: string, attrs: Partial<Block>) => void;
  onDimensionsChange?: (dims: { width: number; height: number }) => void;
}

export function Canvas({ blocks, onSelect, onUpdateBlock, onDimensionsChange }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // FIX 1: Guardamos los callbacks en refs para que los listeners
  // del canvas de inicialización SIEMPRE llamen a la versión más reciente,
  // sin necesidad de destruir y recrear el canvas.
  const onUpdateBlockRef = useRef(onUpdateBlock);
  const onSelectRef = useRef(onSelect);
  const onDimensionsChangeRef = useRef(onDimensionsChange);
  useEffect(() => { onUpdateBlockRef.current = onUpdateBlock; }, [onUpdateBlock]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onDimensionsChangeRef.current = onDimensionsChange; }, [onDimensionsChange]);

  // FIX 2: Ref para saber qué IDs están en proceso de carga asíncrona.
  // Esto previene duplicados y el bug del objeto huérfano tras un undo rápido.
  const loadingIdsRef = useRef<Set<string>>(new Set());

  // FIX 2 (parte 2): Ref que siempre apunta al array de blocks actual.
  // Los callbacks async lo usan para verificar si el bloque sigue siendo
  // válido en el momento en que terminan (el undo pudo haberlo eliminado).
  const blocksRef = useRef<Block[]>(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  const { setNodeRef, isOver } = useDroppable({ id: "canvas-area" });

  // 1. INITIALIZATION — solo se ejecuta una vez
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      height: containerRef.current.clientHeight,
      width: containerRef.current.clientWidth,
      backgroundColor: "#F9FAFB",
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;

    onDimensionsChangeRef.current?.({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      canvas.setDimensions({ width, height });
      onDimensionsChangeRef.current?.({ width, height });

      const center = canvas.getCenterPoint();
      const objects = canvas.getObjects() as Array<fabric.FabricObject & { id: string }>;
      objects.forEach((obj) => {
        obj.setPositionByOrigin(center, "center", "center");
        obj.setCoords();
        if (obj.id) {
          onUpdateBlockRef.current(obj.id, { x: center.x, y: center.y });
        }
      });
      canvas.requestRenderAll();
    };
    window.addEventListener("resize", handleResize);

canvas.on("object:modified", (e) => {
  const target = e.target;
  if (!target) return;

  // @ts-ignore
  let id: string | undefined = target.id;
  let sourceObj: fabric.FabricObject = target;

  if (!id && (target as any).group) {
    const parent = (target as any).group as fabric.FabricObject & { id?: string };
    if (parent.id) {
      id = parent.id;
      sourceObj = parent;
    }
  }

  if (!id) return;

  const update: Partial<Block> = {
    x: sourceObj.left,
    y: sourceObj.top,
    scaleX: sourceObj.scaleX,
    scaleY: sourceObj.scaleY,
    rotation: sourceObj.angle,
  };

  if (sourceObj !== target) {
    const newJsonData = (sourceObj as fabric.Group).toObject(['id']);

    // FIX BUG 1: Solo actualizamos si el estado interno realmente cambió.
    // Comparamos el JSON serializado con la última versión guardada en el canvas.
    // @ts-ignore
    const previousJson = sourceObj._jsonDataRef;
    const previousStr = previousJson ? JSON.stringify(previousJson) : null;
    const newStr = JSON.stringify(newJsonData);

    if (previousStr === newStr) return; // Nada cambió realmente, ignoramos el evento

    // Actualizamos la referencia almacenada para la próxima comparación
    // @ts-ignore
    sourceObj._jsonDataRef = newJsonData;
    update.jsonData = newJsonData;
  }

  onUpdateBlockRef.current(id, update);
});

    const handleSelection = (e: any) => {
      const selection = e.selected || [];
      if (selection.length > 0) {
        // @ts-ignore
        onSelectRef.current(selection[0].id);
      } else {
        onSelectRef.current(null);
      }
    };
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", () => onSelectRef.current(null));

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // 2. SINCRONIZACIÓN INTELIGENTE (DIFFING)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;

    const existingObjects = canvas.getObjects() as Array<fabric.FabricObject & { id: string }>;
    const existingMap = new Map(existingObjects.map((obj) => [obj.id, obj]));
    const blockIds = new Set(blocks.map((b) => b.id));

    // A. ELIMINAR objetos que ya no están en el estado
existingObjects.forEach((obj) => {
  if (!blockIds.has(obj.id)) {
    // FIX BUG 2: Si el objeto eliminado estaba activo, limpiar la selección
    if (canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    canvas.remove(obj);
  }
});

    // B. AGREGAR o ACTUALIZAR
blocks.forEach((block) => {
  let existingObj = existingMap.get(block.id);

  // ¿El jsonData cambió? (ocurre tras undo/redo de movimientos internos del grupo)
  // Comparamos por referencia: si undo restauró el jsonData antiguo, 
  // la referencia será distinta a la que almacenamos en _jsonDataRef.
  if (existingObj && block.jsonData) {
    // @ts-ignore
    const storedRef = existingObj._jsonDataRef;
    if (storedRef !== undefined && storedRef !== block.jsonData) {
      // El estado interno del grupo cambió: eliminar y recrear desde el JSON restaurado
      canvas.remove(existingObj);
      existingMap.delete(block.id);
      loadingIdsRef.current.delete(block.id); // Permitir recarga
      existingObj = undefined;
    }
  }

  if (!existingObj) {
    if (loadingIdsRef.current.has(block.id)) return;

    if (block.type === "JSON" && block.jsonData) {
      loadingIdsRef.current.add(block.id);
      const detectedFonts = extractFontsFromFabricJSON(block.jsonData);

      loadGoogleFonts(detectedFonts).then(() => {
        fabric.util.enlivenObjects([block.jsonData!]).then((results) => {
          loadingIdsRef.current.delete(block.id);
          if (!blocksRef.current.some((b) => b.id === block.id)) return;

          const enlivenedObjects = results as fabric.FabricObject[];
          if (enlivenedObjects.length === 0) return;

          const group = enlivenedObjects[0] as fabric.Group;
          group.set({
            // @ts-ignore
            id: block.id,
            // @ts-ignore
            _jsonDataRef: block.jsonData, // <-- también aquí
            left: block.x,
            top: block.y,
            originX: "center",
            originY: "center",
            scaleX: block.scaleX || 3,
            scaleY: block.scaleY || 3,
            subTargetCheck: true,
            interactive: true,
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            hasBorders: false,
            shadow: new fabric.Shadow({
              color: "rgba(0, 0, 0, 0.08)",
              blur: 25,
              offsetX: 0,
              offsetY: 10,
            }),
          });

          group.getObjects().forEach((obj) => {
            if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
              obj.set({ selectable: true, evented: true });
            } else {
              obj.set({
                selectable: false,
                evented: false,
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
              });
            }
          });

          canvas.add(group);
          canvas.requestRenderAll();
        });
      });
    }

        // CASO B: SVG String
        else if (block.svgContent) {
          loadingIdsRef.current.add(block.id);

          fabric.loadSVGFromString(block.svgContent).then((results) => {
            loadingIdsRef.current.delete(block.id);

            // FIX 2: Mismo chequeo de validez
            if (!blocksRef.current.some((b) => b.id === block.id)) return;

            const { objects, options } = results;
            const cleanObjects = objects.filter((o): o is fabric.FabricObject => o !== null);

            const svgGroup = new fabric.Group(cleanObjects, {
              ...options,
              // @ts-ignore
              id: block.id,
              left: block.x,
              top: block.y,
              originX: "center",
              originY: "center",
              scaleX: block.scaleX || 3,
              scaleY: block.scaleY || 3,
              shadow: new fabric.Shadow({
                color: "rgba(0, 0, 0, 0.08)",
                blur: 25,
                offsetX: 0,
                offsetY: 10,
              }),
            });
            canvas.add(svgGroup);
            canvas.requestRenderAll();
          });
        }
  } else {
    // UPDATE: posición/escala/rotación (sin cambios)
    let didChange = false;
    if (existingObj.left !== block.x) { existingObj.set("left", block.x); didChange = true; }
    if (existingObj.top !== block.y) { existingObj.set("top", block.y); didChange = true; }
    if (existingObj.angle !== block.rotation) { existingObj.set("angle", block.rotation); didChange = true; }
    if (existingObj.scaleX !== block.scaleX) { existingObj.set("scaleX", block.scaleX); didChange = true; }
    if (existingObj.scaleY !== block.scaleY) { existingObj.set("scaleY", block.scaleY); didChange = true; }
    if (didChange) {
      existingObj.setCoords();
      const activeObject = canvas.getActiveObject();
      // @ts-ignore
      if (activeObject && activeObject.id === block.id) {
        canvas.discardActiveObject();
        canvas.setActiveObject(existingObj);
      }
    }
  }
});

    canvas.requestRenderAll();
  }, [blocks]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        // @ts-ignore
        containerRef.current = node;
      }}
      className={`relative w-full h-full overflow-hidden transition-colors ${
        isOver ? "bg-blue-50/50" : "bg-slate-100"
      }`}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}