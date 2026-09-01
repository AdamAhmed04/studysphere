import { createClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

/*
 * Typed with the generated Database schema.
 *
 * This is what makes every .from(), .select(), .insert() and .rpc() call in
 * the app check its table names, column names and argument shapes at compile
 * time. Untyped, they all returned `any`, so a renamed column or a wrong RPC
 * argument only failed at runtime.
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/*
 * These were hand-written duplicates of the table shapes, which meant they
 * could drift from the real schema without anything noticing. They are now
 * aliases of the generated row types, so a migration that changes a column
 * changes these too.
 */
export type UserProfile = Tables<'user_profiles'>;
export type UserStats = Tables<'user_stats'>;

/** Profile columns other users are allowed to read. */
