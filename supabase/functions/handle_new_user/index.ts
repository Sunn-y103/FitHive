import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the request
    const { record: user } = await req.json()

    if (!user || !user.id) {
      throw new Error('User data is missing')
    }

    // Extract username from email (before @) or use UUID prefix as fallback
    const username = user.email?.split('@')[0] || user.id.substring(0, 8)

    // Insert new profile row with ONLY basic fields
    // id, email, name (full_name) - Health fields are NOT set here
    const { error: insertError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || null,  // Store email for convenience
        full_name: user.user_metadata?.full_name || null,  // Name from signup (optional)
        username: username,  // Extracted from email
        // NOTE: height, weight, gender, water, activity_level are NOT set
        // They will be NULL until user updates them in Profile screen
      })

    if (insertError) {
      // If profile already exists (e.g., from trigger), that's okay
      if (insertError.code === '23505') { // Unique violation
        console.log('Profile already exists for user:', user.id)
        return new Response(
          JSON.stringify({ message: 'Profile already exists' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
      throw insertError
    }

    return new Response(
      JSON.stringify({ message: 'Profile created successfully', userId: user.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in handle_new_user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

