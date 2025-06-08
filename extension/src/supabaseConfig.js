//import { createClient } from '@supabase/supabase-js';
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hzhuqrztsisuwjilobiv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHVxcnp0c2lzdXdqaWxvYml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MzA3MTQsImV4cCI6MjA1OTEwNjcxNH0.yNW1jkUTkIpanoQJP0dsFCfr5swXF10QX4nHNIoem8E';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;