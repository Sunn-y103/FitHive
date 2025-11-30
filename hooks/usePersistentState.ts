import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../contexts/AppStateContext';

/**
 * Custom hook for persistent state that automatically saves to AsyncStorage
 * Usage: const [value, setValue] = usePersistentState<T>('key', defaultValue);
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>] {
  const { getState, setState } = useAppState();
  const [state, setLocalState] = useState<T>(defaultValue);
  const isInitialized = useRef(false);
  const previousStateRef = useRef<T>(defaultValue);
  const isRestoringRef = useRef(false);

  // Load initial value from storage
  useEffect(() => {
    if (!isInitialized.current) {
      isRestoringRef.current = true;
      const savedValue = getState<T>(key);
      if (savedValue !== null) {
        setLocalState(savedValue);
        previousStateRef.current = savedValue;
      }
      isInitialized.current = true;
      // Mark restoration as complete after render cycle
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    }
  }, [key, getState]);

  // Auto-save when state changes (but not during restoration)
  useEffect(() => {
    if (isInitialized.current && !isRestoringRef.current) {
      // Only save if value actually changed
      const stateString = JSON.stringify(state);
      const previousString = JSON.stringify(previousStateRef.current);
      
      if (stateString !== previousString) {
        previousStateRef.current = state;
        // Save asynchronously after render
        const timeoutId = setTimeout(() => {
          setState(key, state).catch((error) => {
            console.error(`Error saving state for key ${key}:`, error);
          });
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [key, state, setState]);

  // Setter function
  const setValue = useCallback(
    async (value: T | ((prev: T) => T)) => {
      setLocalState((prev) => {
        return typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      });
    },
    []
  );

  return [state, setValue];
}

/**
 * Hook for persistent state that saves immediately on change (no debounce)
 * Useful for critical data that needs instant persistence
 */
export function useImmediatePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { getState, setState } = useAppState();
  const [state, setLocalState] = useState<T>(defaultValue);
  const isInitialized = useRef(false);
  const previousStateRef = useRef<T>(defaultValue);
  const isRestoringRef = useRef(false);

  // Load initial value from storage
  useEffect(() => {
    if (!isInitialized.current) {
      isRestoringRef.current = true;
      const savedValue = getState<T>(key);
      if (savedValue !== null) {
        setLocalState(savedValue);
        previousStateRef.current = savedValue;
      }
      isInitialized.current = true;
      // Mark restoration as complete after render cycle
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    }
  }, [key, getState]);

  // Auto-save immediately when state changes (but not during restoration)
  useEffect(() => {
    if (isInitialized.current && !isRestoringRef.current) {
      // Only save if value actually changed
      const stateString = JSON.stringify(state);
      const previousString = JSON.stringify(previousStateRef.current);
      
      if (stateString !== previousString) {
        previousStateRef.current = state;
        // Save immediately (no debounce)
        setState(key, state).catch((error) => {
          console.error(`Error saving state for key ${key}:`, error);
        });
      }
    }
  }, [key, state, setState]);

  // Setter function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setLocalState((prev) => {
        return typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      });
    },
    []
  );

  return [state, setValue];
}

