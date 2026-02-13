/** Full user profile as returned by Supabase (snake_case field names). */
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  job?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}
