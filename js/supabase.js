// ===== SUPABASE CONFIGURATION =====
// Replace these with your actual Supabase project details:
//   1. Go to https://supabase.com -> Your Project -> Settings -> API
//   2. Copy the "Project URL" and "anon public" key
//   3. Paste them below

const SUPABASE_URL = 'https://oemnbujgttlmdixexmoe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbW5idWpndHRsbWRpeGV4bW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODg3MDEsImV4cCI6MjA5NzI2NDcwMX0.XojGFhjiNV9aDbZBy-H4FczfFaw6pw9DAFxFfCkXLMg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);