import { useState, useCallback, SetStateAction } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

// Añadimos un parámetro opcional 'limit' (por defecto 50)
export function useHistory<T>(initialState: T, limit = 50) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const set = useCallback((action: SetStateAction<T>) => {
    setState((currentState) => {
      const nextPresent = typeof action === 'function' 
        ? (action as (prevState: T) => T)(currentState.present)
        : action;

      if (currentState.present === nextPresent) return currentState;

      // Unimos el pasado con el presente actual, pero lo CORTAMOS según el límite
      // Así evitamos fugas de memoria si el usuario trabaja por horas
      const newPast = [...currentState.past, currentState.present].slice(-limit);

      return {
        past: newPast,
        present: nextPresent,
        future: [] 
      };
    });
  }, [limit]);

  const undo = useCallback(() => {
    setState((currentState) => {
      // Opcional: Si quieres que nunca vuelva al array vacío inicial ([]),
      // podrías cambiar esto a: if (currentState.past.length <= 1) return currentState;
      if (currentState.past.length <= 1) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
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

  return { state: state.present, setState: set, undo, redo };
}