// src/config/supabaseClient.js
require('dotenv').config(); // Tani waxay soo akhrinaysaa faylka .env
const { createClient } = require('@supabase/supabase-js');

// Hadda nidaamku wuxuu furayaasha ka soo qaadanayaa meel qarsoon
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;