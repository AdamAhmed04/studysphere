import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Database types
export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  date_of_birth?: string;
  school?: string;
  study_field?: string;
  graduation_date?: string;
  grade?: string;
  interests: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  sessions: number;
  total_focus_minutes: number;
  streak_days: number;
  tasks_completed: number;
  last_session_date?: string;
  updated_at: string;
}