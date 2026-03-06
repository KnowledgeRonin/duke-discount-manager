import { useState, useCallback, SetStateAction } from 'react';

// Definimos la estructura exacta del tiempo
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const set = useCallback((action: SetStateAction<T>) => {
    setState((currentState) => {
      // Resolvemos el estado nuevo igual que lo hace React internamente
      const nextPresent = typeof action === 'function' 
        ? (action as (prevState: T) => T)(currentState.present)
        : action;

      // Si no hay cambios reales, no guardamos basura en el historial
      if (currentState.present === nextPresent) return currentState;

      return {
        past: [...currentState.past, currentState.present], // Guardamos el presente en el pasado
        present: nextPresent, // Establecemos el nuevo presente
        future: [] // Si hacemos una nueva acción, borramos las líneas temporales futuras
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((currentState) => {
      // Si no hay pasado, no hacemos nada
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future] // Mandamos el presente actual al futuro
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      // Si no hay futuro, no hacemos nada
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Exponemos las variables tal cual las espera tu componente principal
  return { state: state.present, setState: set, undo, redo };
}