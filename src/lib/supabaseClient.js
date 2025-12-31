import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hawojxoxgwofsoejakrb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhd29qeG94Z3dvZnNvZWpha3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDQ3NjcsImV4cCI6MjA2NTYyMDc2N30.-SHVByUscunxtmXygDdCEsKon236BWx1LmzTowaY80U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);