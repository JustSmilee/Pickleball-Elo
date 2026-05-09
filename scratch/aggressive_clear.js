import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function aggressiveClear() {
    console.log('--- AGGRESSIVE CLEAR ---');
    const { data: matches } = await supabase.from('matches').select('id');
    if (matches && matches.length > 0) {
        await supabase.from('matches').delete().in('id', matches.map(m => m.id));
    }
    
    const { data: tournaments } = await supabase.from('tournaments').select('id');
    if (tournaments && tournaments.length > 0) {
        await supabase.from('tournaments').delete().in('id', tournaments.map(t => t.id));
    }
    
    console.log('Cleaned everything.');
}

aggressiveClear();
