import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export const useSupabase = () => supabase;
