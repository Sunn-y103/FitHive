import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { useAuth } from './AuthContext';
import { getUserKey } from '../utils/userStorageUtils';

// Global app state type
export interface AppState {
  [key: string]: any; // Flexible to store any screen state
}

// Action types
type AppStateAction =
  | { type: 'SET_STATE'; payload: { key: string; value: any } }
  | { type: 'CLEAR_STATE'; payload: { key: string } }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'CLEAR_ALL' };

// Context type
interface AppStateContextType {
  state: AppState;
  setState: (key: string, value: any) => Promise<void>;
  getState: <T>(key: string) => T | null;
  clearState: (key: string) => Promise<void>;
  clearAllState: () => Promise<void>;
  loading: boolean;
}

// Create context
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Reducer
const appStateReducer = (state: AppState, action: AppStateAction): AppState => {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    case 'CLEAR_STATE': {
      const newState = { ...state };
      delete newState[action.payload.key];
      return newState;
    }
    case 'LOAD_STATE':
      return action.payload;
    case 'CLEAR_ALL':
      return {};
    default:
      return state;
  }
};

// Provider component
interface AppStateProviderProps {
  children: React.ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appStateReducer, {});
  const [loading, setLoading] = React.useState(true);
  const currentUserIdRef = React.useRef<string | null>(null);

  // Get user-specific storage key
  const getStorageKey = useCallback(() => {
    if (user?.id) {
      return getUserKey(STORAGE_KEYS.APP_STATE, user.id);
    }
    return STORAGE_KEYS.APP_STATE;
  }, [user?.id]);

  // Load initial state from AsyncStorage (user-specific)
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const storageKey = getStorageKey();
        const savedState = await Storage.load<AppState>(storageKey);
        if (savedState) {
          dispatch({ type: 'LOAD_STATE', payload: savedState });
        } else {
          // No saved state for this user - start fresh
          dispatch({ type: 'LOAD_STATE', payload: {} });
        }
        currentUserIdRef.current = user?.id || null;
      } catch (error) {
        console.error('Error loading app state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [user?.id, getStorageKey]);

  // Reset state when user changes
  useEffect(() => {
    if (currentUserIdRef.current !== user?.id) {
      // User changed - clear state and reload
      dispatch({ type: 'CLEAR_ALL' });
      currentUserIdRef.current = user?.id || null;
      setLoading(true);
      // Reload will happen in the loadInitialState effect above
    }
  }, [user?.id]);

  // Save state to AsyncStorage whenever it changes (user-specific)
  useEffect(() => {
    if (!loading && Object.keys(state).length > 0 && user?.id) {
      const saveState = async () => {
        try {
          const storageKey = getStorageKey();
          await Storage.save(storageKey, state);
        } catch (error) {
          console.error('Error saving app state:', error);
        }
      };

      // Debounce saves to avoid too frequent writes
      const timeoutId = setTimeout(saveState, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [state, loading, user?.id, getStorageKey]);

  // Set state function
  const setState = useCallback(async (key: string, value: any) => {
    dispatch({ type: 'SET_STATE', payload: { key, value } });
  }, []);

  // Get state function
  const getState = useCallback(<T,>(key: string): T | null => {
    return (state[key] as T) || null;
  }, [state]);

  // Clear state function
  const clearState = useCallback(async (key: string) => {
    dispatch({ type: 'CLEAR_STATE', payload: { key } });
  }, []);

  // Clear all state function
  const clearAllState = useCallback(async () => {
    dispatch({ type: 'CLEAR_ALL' });
    await Storage.remove(STORAGE_KEYS.APP_STATE);
  }, []);

  const value: AppStateContextType = {
    state,
    setState,
    getState,
    clearState,
    clearAllState,
    loading,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

// Hook to use app state
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

