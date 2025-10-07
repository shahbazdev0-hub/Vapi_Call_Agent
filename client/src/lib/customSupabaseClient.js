import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zgppwptkskbkdxeyhvri.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpncHB3cHRrc2tia2R4ZXlodnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDEyNTMsImV4cCI6MjA3MzExNzI1M30.5Cj8dD2R6AWCAevgYoxtCZ459UzPOqB7Ruep2Qo3KkI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);