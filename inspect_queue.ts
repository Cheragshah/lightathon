
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Note: Using anon key might be limited by RLS. 
// If possible I should use Service Role but I don't have it in .env usually?
// Check .env file content first.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectQueue() {
    console.log('Inspecting Codex Generation Queue...');

    const { data: queueItems, error } = await supabase
        .from('codex_generation_queue')
        .select(`
      id,
      status,
      user_id,
      codex_prompt_id,
      created_at,
      batch_id
    `)
        .eq('status', 'processing') // Focus on stuck items
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching queue:', error);
        return;
    }

    console.log(`Found ${queueItems.length} processing items.`);

    if (queueItems.length > 0) {
        console.log('Sample Item:', queueItems[0]);

        // Check if we can fetch the related codex prompt
        const promptId = queueItems[0].codex_prompt_id;
        const { data: prompt, error: promptError } = await supabase
            .from('codex_prompts')
            .select('id, codex_name')
            .eq('id', promptId)
            .single();

        if (promptError) console.error('Error fetching linked prompt:', promptError);
        else console.log('Linked Prompt:', prompt);
    }
}

inspectQueue();
