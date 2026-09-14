import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check Vercel environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StorageUnit {
  id: string;
  size: string;
  dimensions: string;
  max_cu_ft: number;
  usable_cu_ft: number;
  price: number;
  sort_order: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
