import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function absoluteClear() {
    console.log('--- ABSOLUTE CLEAR ---');
    // Delete all matches
    const { error: e1 } = await supabase.from('matches').delete().neq('type', 'invalid_type');
    if (e1) console.error(e1);
    
    // Delete all tournaments
    const { error: e2 } = await supabase.from('tournaments').delete().neq('name', 'invalid_name');
    if (e2) console.error(e2);
    
    // Reset ALL players
    const { error: e3 } = await supabase.from('players').update({ elo_rating: 1200, matches_played: 0, wins: 0, losses: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (e3) console.error(e3);
    
    console.log('Database is now completely empty of matches and stats.');
}

absoluteClear();
