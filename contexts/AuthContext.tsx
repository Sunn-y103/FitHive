import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { runNetworkDiagnostics } from '../utils/networkCheck';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // Run network diagnostics if first time (helps debug network issues)
        if (__DEV__) {
          runNetworkDiagnostics().catch(console.error);
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          // Don't throw - just set loading to false so app can continue
        }
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          console.log('✅ Auth initialized:', session ? 'User logged in' : 'No session');
        }
      } catch (error: any) {
        console.error('❌ Network error during auth init:', {
          message: error?.message,
          name: error?.name,
          code: error?.code,
        });
        // Set loading to false even on error so app doesn't hang
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting sign in...');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
      } else {
        console.log('✅ Sign in successful');
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Network error during sign in:', {
        message: error?.message,
        name: error?.name,
      });
      return { 
        error: {
          message: error?.message || 'Network request failed. Please check your internet connection.',
          name: 'NetworkError',
        } as AuthError
      };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('📝 Attempting sign up...');
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign up error:', error.message);
      } else {
        console.log('✅ Sign up successful');
      }
      
      return { error };
    } catch (error: any) {
      console.error('❌ Network error during sign up:', {
        message: error?.message,
        name: error?.name,
      });
      return { 
        error: {
          message: error?.message || 'Network request failed. Please check your internet connection.',
          name: 'NetworkError',
        } as AuthError
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      await supabase.auth.signOut();
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Error during sign out:', error);
      // Don't throw - sign out should always complete
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

