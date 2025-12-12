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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create/update profile when user signs in or confirms email
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          try {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', session.user.id)
              .maybeSingle();

            // If profile doesn't exist or email is NULL, create/update it
            if (!existingProfile || !existingProfile.email) {
              console.log('👤 Creating/updating profile...');
              const username = session.user.email?.split('@')[0] || session.user.id.substring(0, 8);
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  email: session.user.email || null,
                  full_name: session.user.user_metadata?.full_name || null,
                  username: username,
                });

              if (profileError) {
                console.error('❌ Profile creation/update error:', profileError);
              } else {
                console.log('✅ Profile created/updated successfully');
              }
            }
          } catch (err) {
            console.error('❌ Exception during profile sync:', err);
          }
        }
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
        return { error };
      }

      // Ensure profile exists and email is synced after login
      if (data.user) {
        try {
          console.log('👤 Syncing profile after login...');
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('id', data.user.id)
            .maybeSingle();

          // If profile doesn't exist or email is NULL, create/update it
          if (!existingProfile || !existingProfile.email) {
            console.log('📝 Creating/updating profile...');
            const username = data.user.email?.split('@')[0] || data.user.id.substring(0, 8);
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: data.user.email || email,
                full_name: data.user.user_metadata?.full_name || null,
                username: username,
              });

            if (profileError) {
              console.error('❌ Profile sync error:', profileError);
              // Try using the RPC function as fallback
              await supabase.rpc('handle_new_user', {
                user_id: data.user.id,
                user_email: data.user.email || email,
                user_full_name: data.user.user_metadata?.full_name || null,
              });
            } else {
              console.log('✅ Profile synced successfully');
            }
          } else if (existingProfile.email !== data.user.email) {
            // Update email if it changed
            console.log('📧 Updating email in profile...');
            await supabase
              .from('profiles')
              .update({ email: data.user.email || email })
              .eq('id', data.user.id);
          }
        } catch (profileErr) {
          console.error('❌ Exception during profile sync:', profileErr);
          // Continue anyway - profile sync is not critical for login
        }
      }
      
      console.log('✅ Sign in successful');
      return { error: null };
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign up error:', error.message);
        return { error };
      }

      // Create profile after successful signup
      if (data.user) {
        try {
          console.log('👤 Creating profile for new user...');
          const { error: profileError } = await supabase.rpc('handle_new_user', {
            user_id: data.user.id,
            user_email: data.user.email || email,
            user_full_name: data.user.user_metadata?.full_name || null,
          });

          if (profileError) {
            console.error('❌ Profile creation error:', profileError);
            // Don't fail signup if profile creation fails - it can be created later
            // But try alternative method: direct insert
            const username = email.split('@')[0] || data.user.id.substring(0, 8);
            const { error: insertError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: data.user.email || email,
                full_name: data.user.user_metadata?.full_name || null,
                username: username,
              });

            if (insertError) {
              console.error('❌ Direct profile insert also failed:', insertError);
            } else {
              console.log('✅ Profile created via direct insert');
            }
          } else {
            console.log('✅ Profile created successfully');
          }
        } catch (profileErr) {
          console.error('❌ Exception during profile creation:', profileErr);
          // Continue anyway - profile can be created later
        }
      }
      
      console.log('✅ Sign up successful');
      return { error: null };
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

