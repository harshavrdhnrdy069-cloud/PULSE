import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: Profile;
};

export type Follow = {
  follower_id: string;
  followee_id: string;
  created_at: string;
};
