/**
 * User-Specific Persistent State Hook
 * 
 * This hook automatically prefixes storage keys with the current user's ID,
 * ensuring each user has isolated data storage.
 * 
 * Usage:
 *   const [value, setValue] = useUserPersistentState<T>('water_intake_entries', []);
 *   // Automatically uses key: 'water_intake_entries_<userId>'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserKey } from '../utils/userStorageUtils';

/**
 * User-specific persistent state hook
 * Automatically prefixes keys with userId
 */
export function useUserPersistentState<T>(
  baseKey: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>] {
  const { user } = useAuth();
  const { getState, setState } = useAppState();
  const [state, setLocalState] = useState<T>(defaultValue);
  const isInitialized = useRef(false);
  const previousStateRef = useRef<T>(defaultValue);
  const isRestoringRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Generate user-specific key
  const userKey = user?.id ? getUserKey(baseKey, user.id) : baseKey;

  // Reset when user changes
  useEffect(() => {
    if (currentUserIdRef.current !== user?.id) {
      // User changed - reset state and reload
      currentUserIdRef.current = user?.id || null;
      isInitialized.current = false;
      setLocalState(defaultValue);
      previousStateRef.current = defaultValue;
    }
  }, [user?.id, defaultValue]);

  // Load initial value from storage
  useEffect(() => {
    if (!isInitialized.current && user?.id) {
      isRestoringRef.current = true;
      const savedValue = getState<T>(userKey);
      if (savedValue !== null) {
        setLocalState(savedValue);
        previousStateRef.current = savedValue;
      }
      isInitialized.current = true;
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    } else if (!user?.id) {
      // No user - use default
      isInitialized.current = true;
      setLocalState(defaultValue);
    }
  }, [userKey, user?.id, getState, defaultValue]);

  // Auto-save when state changes (but not during restoration)
  useEffect(() => {
    if (isInitialized.current && !isRestoringRef.current && user?.id) {
      const stateString = JSON.stringify(state);
      const previousString = JSON.stringify(previousStateRef.current);
      
      if (stateString !== previousString) {
        previousStateRef.current = state;
        const timeoutId = setTimeout(() => {
          setState(userKey, state).catch((error) => {
            console.error(`Error saving state for key ${userKey}:`, error);
          });
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [userKey, state, setState, user?.id]);

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

