import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://skqcggiuulwrjiclaibw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcWNnZ2l1dWx3cmppY2xhaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODk2OTksImV4cCI6MjA4MDA2NTY5OX0.rXJ7poOAkYh77rHt4AfLpN1wumhy5mrBEBGnhjLlAcg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

