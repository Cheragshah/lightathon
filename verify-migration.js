
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase credentials in .env file");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyMigration() {
    console.log(`Verifying migration on ${supabaseUrl}...`);
    try {
        // Check key tables
        const tables = ['codex_prompts', 'codex_section_prompts', 'app_roles', 'app_settings']; // app_role is a type, not table, checking app_settings which relies on it

        // Check codex_prompts count
        const { count: promptsCount, error: promptsError } = await supabase.from('codex_prompts').select('*', { count: 'exact', head: true });
        if (promptsError) throw promptsError;
        console.log(`codex_prompts count: ${promptsCount}`);

        // Check codex_section_prompts count
        const { count: sectionsCount, error: sectionsError } = await supabase.from('codex_section_prompts').select('*', { count: 'exact', head: true });
        if (sectionsError) throw sectionsError;
        console.log(`codex_section_prompts count: ${sectionsCount}`);

        console.log("Migration verification successful! Tables exist and are accessible.");
    } catch (err) {
        console.error("Verification failed:", err);
        process.exit(1);
    }
}

verifyMigration();
