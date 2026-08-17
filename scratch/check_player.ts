import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://hnekxppiibujqrnzddgv.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkPlayer() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .or('user_ad.eq.anhph9,name.ilike.%anhph9%')
    
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Players found:', JSON.stringify(data, null, 2))
    }
}

checkPlayer()
