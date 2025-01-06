import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xqzlejcvvtjdrabofrxs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxemxlamN2dnRqZHJhYm9mcnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3NTcyMDQsImV4cCI6MjA1MTMzMzIwNH0.U8CEwCIY4RMecp1ALSqzQEUYOIh4kMY9kpl32m8FKoA";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);