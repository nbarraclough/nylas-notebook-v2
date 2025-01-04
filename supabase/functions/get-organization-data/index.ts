import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface OrganizationData {
  organization: {
    id: string;
    name: string;
    domain: string;
  } | null;
  members: Array<{
    user_id: string;
    role: string;
    profile: {
      email: string;
    };
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user ID from the authorization header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's profile to find their organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', authHeader)
      .maybeSingle()

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ organization: null, members: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle()

    // Get organization members
    const { data: members } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        profiles (
          email
        )
      `)
      .eq('organization_id', profile.organization_id)

    const response: OrganizationData = {
      organization,
      members: members || []
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})