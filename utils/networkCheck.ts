/**
 * Network connectivity utilities for debugging
 */

/**
 * Test if Supabase URL is reachable
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://skqcggiuulwrjiclaibw.supabase.co', {
      method: 'HEAD',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcWNnZ2l1dWx3cmppY2xhaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODk2OTksImV4cCI6MjA4MDA2NTY5OX0.rXJ7poOAkYh77rHt4AfLpN1wumhy5mrBEBGnhjLlAcg',
      },
    });
    console.log('✅ Supabase URL is reachable:', response.status);
    return response.ok || response.status < 500;
  } catch (error: any) {
    console.error('❌ Supabase URL not reachable:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });
    return false;
  }
};

/**
 * Test basic internet connectivity
 */
export const testInternetConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
    });
    console.log('✅ Internet connection OK:', response.status);
    return true;
  } catch (error: any) {
    console.error('❌ No internet connection:', {
      message: error?.message,
      name: error?.name,
    });
    return false;
  }
};

/**
 * Run all network diagnostics
 */
export const runNetworkDiagnostics = async (): Promise<void> => {
  console.log('🔍 Running network diagnostics...');
  
  const hasInternet = await testInternetConnection();
  const hasSupabase = await testSupabaseConnection();
  
  console.log('📊 Network Diagnostics Results:');
  console.log('  Internet:', hasInternet ? '✅ Connected' : '❌ Not Connected');
  console.log('  Supabase:', hasSupabase ? '✅ Reachable' : '❌ Not Reachable');
  
  if (!hasInternet) {
    console.warn('⚠️ No internet connection detected. Check your network settings.');
  }
  
  if (hasInternet && !hasSupabase) {
    console.warn('⚠️ Internet works but Supabase is unreachable. Check Supabase project status.');
  }
};

