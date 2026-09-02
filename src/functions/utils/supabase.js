const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        "SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY sont manquants. Renseigne-les dans .env (voir .env.example)."
    );
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

module.exports = { supabase };
