import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use the secrets from Supabase
const supabaseUrl = 'https://xqzlejcvvtjdrabofrxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxemxlamN2dnRqZHJhYm9mcnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ1MjY0MDAsImV4cCI6MjAyMDEwMjQwMH0.aqMKvgQQk6XvHDgv-HwLDUOPQzQ4hcJxYVXE-LyZqL4';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage
  },
  global: {
    headers: {
      'external-token': new URLSearchParams(window.location.search).get('token') || '',
    },
  },
});