import { createClient } from '@supabase/supabase-js';

// 使用 Vite 的 import.meta.env 来读取变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);