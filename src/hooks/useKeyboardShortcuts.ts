import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  /** Callback para limpiar la selección activa al deshacer/rehacer */
  onClearSelection: () => void;
}

/**
 * Registra los atajos de teclado globales del editor.
 *
 * Atajos soportados:
 * - Ctrl+Z / Cmd+Z       → deshacer
 * - Ctrl+Shift+Z / Cmd+Shift+Z → rehacer
 *
 * El listener se ignora automáticamente cuando el foco está en un
 * campo de texto (input, textarea, select) para no interferir con
 * la edición normal de texto.
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onClearSelection,
}: UseKeyboardShortcutsProps): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isUndoRedo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z';
      if (!isUndoRedo) return;

      e.preventDefault();

      if (e.shiftKey) {
        onRedo();
      } else {
        onUndo();
      }

      // Limpiamos la selección del panel lateral también
      onClearSelection();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onClearSelection]);
}
