const { createClient } = require("@supabase/supabase-js");

// Le bot écrit avec la clé service_role : elle contourne le RLS, ce qui est
// voulu ici (c'est lui la source de vérité des GS) mais implique qu'elle ne
// doit JAMAIS quitter le serveur du bot — ni le site, ni le navigateur, ni git.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        "SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY sont manquants. Renseigne-les dans .env (voir .env.example)."
    );
}

// Pas de session à persister ni de token à rafraîchir : la clé service_role
// est un secret statique, et le bot est un process long — inutile de laisser
// tourner le timer de refresh de la librairie.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

module.exports = { supabase };
