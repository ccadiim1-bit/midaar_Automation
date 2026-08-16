require('dotenv').config(); // 🔴 1. Kicinta akhriska faylka .env
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // 🔴 2. Hubi in magacu yahay SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CILAD: SUPABASE_URL ama SUPABASE_KEY lagama helin faylka .env!");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
    }
});

module.exports = supabase;