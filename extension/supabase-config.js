import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://hzhuqrztsisuwjilobiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHVxcnp0c2lzdXdqaWxvYml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MzA3MTQsImV4cCI6MjA1OTEwNjcxNH0.yNW1jkUTkIpanoQJP0dsFCfr5swXF10QX4nHNIoem8E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);