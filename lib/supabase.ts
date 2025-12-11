import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = 'https://skqcggiuulwrjiclaibw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcWNnZ2l1dWx3cmppY2xhaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODk2OTksImV4cCI6MjA4MDA2NTY5OX0.rXJ7poOAkYh77rHt4AfLpN1wumhy5mrBEBGnhjLlAcg';

// Configure Supabase client with better error handling for React Native
const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: undefined, // Use default storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'fithive-react-native',
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Test connection on initialization
console.log('🔌 Supabase client initialized:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
});

