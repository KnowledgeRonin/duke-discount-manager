import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Block, LibraryItem } from '@/utils/types';

interface UseDragHandlersProps {
  /** Dimensiones actuales del canvas, necesarias para centrar el bloque al soltarlo */
  canvasDims: { width: number; height: number };
  /** Callback para agregar un nuevo bloque al historial */
  onBlockAdd: (block: Block) => void;
  /** Callback para establecer el bloque seleccionado */
  onSelect: (id: string) => void;
  /** Items disponibles en la librería del sidebar */
  libraryItems: LibraryItem[];
}

interface UseDragHandlersReturn {
  activeId: string | null;
  /** Item activo durante el drag, usado por DragOverlay */
  activeSidebarItem: LibraryItem | undefined;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

/**
 * Encapsula toda la lógica de drag & drop del sidebar al canvas.
 * - Gestiona el estado del item que se está arrastrando
 * - Crea el bloque correspondiente al soltarlo en el canvas
 * - Todo item es de tipo JSON (Group de Fabric.js), sin SVGs sueltos
 */
export function useDragHandlers({
  canvasDims,
  onBlockAdd,
  onSelect,
  libraryItems,
}: UseDragHandlersProps): UseDragHandlersReturn {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeSidebarItem = activeId
    ? libraryItems.find(item => item.id === activeId)
    : undefined;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // UniqueIdentifier puede ser string | number, lo normalizamos a string
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over?.id === 'canvas-area') {
      const originalItem = libraryItems.find(item => item.id === String(active.id));

      if (originalItem) {
        const centerX = canvasDims.width  > 0 ? canvasDims.width  / 2 : 300;
        const centerY = canvasDims.height > 0 ? canvasDims.height / 2 : 300;

        const newBlock: Block = {
          id: `el-${Date.now()}`,
          x: centerX,
          y: centerY,
          rotation: 0,
          scaleX: 3,
          scaleY: 3,
          fill: '#3B82F6',
          viewBox: originalItem.viewBox,
          jsonData: originalItem.canvasData,
        };

        onBlockAdd(newBlock);
        onSelect(newBlock.id);
      }
    }

    setActiveId(null);
  }, [canvasDims, libraryItems, onBlockAdd, onSelect]);

  return {
    activeId,
    activeSidebarItem,
    handleDragStart,
    handleDragEnd,
  };
}