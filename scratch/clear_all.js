import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAll() {
    console.log('--- CLEARING ALL MATCHES AND TOURNAMENTS ---');
    await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Done clearing.');
}

clearAll();
