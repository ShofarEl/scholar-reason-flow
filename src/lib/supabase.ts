
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unhulaavbftqpvflarqi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHVsYWF2YmZ0cXB2ZmxhcnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MTczMDgsImV4cCI6MjA2OTM5MzMwOH0.OYM1Hh8_FuhtKcMyfjPCllxodKQr7ysHwKrrxH6wwL8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
