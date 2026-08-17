import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkH2() {
    const h2Id = "928b7a56-389e-4fe2-84bd-65156889113a";
    const { data: matches } = await supabase.from('matches').select('*').eq('tournament_id', h2Id);
    console.log('H2 Matches count:', matches?.length);
    if (matches && matches.length > 0) {
        console.log('Sample match:', matches[0]);
    }
}

checkH2();
