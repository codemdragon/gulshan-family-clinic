// ===== SUPABASE CONFIGURATION =====
// Replace these with your actual Supabase project details:
//   1. Go to https://supabase.com -> Your Project -> Settings -> API
//   2. Copy the "Project URL" and "anon public" key
//   3. Paste them below

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
