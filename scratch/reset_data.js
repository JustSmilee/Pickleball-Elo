import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';

const supabase = createClient(supabaseUrl, supabaseKey);

const players = [
    "Bùi Minh Đức", "Bùi Tăng Bảo Ngọc", "Dương Viết Đức", "Hoan Nguyên", 
    "Hoàng Quang Vinh", "Hoàng Trần Xuân Sơn", "Hà Thị Hiên", "Hà Vũ Đức Anh", 
    "Nguyễn Bích Ngọc", "Nguyễn Hoàng Minh Hiền", "Nguyễn Huy Hoàng", 
    "Nguyễn Hữu Tuấn Duy", "Nguyễn Lâm Trường", "Nguyễn Lê Anh", 
    "Nguyễn Ngọc Tuấn", "Nguyễn Thị Phương Thảo", "Nguyễn Thị Thu Phương", 
    "Nguyễn Thị Thùy Dương", "Nguyễn Tuấn Sơn", "Nguyễn Viết Chính", 
    "Nguyễn Văn Hải", "Nguyễn Đức Kiên", "Nguyễn Đức Xuân Bình", 
    "Phan Hoàng Anh", "Phan Hương Trà", "Trần Tuấn Hiệp", "Trần Việt Tùng", 
    "Trần Đức Nhân", "Tăng khánh Thiện", "Vũ Hồng Ngọc", "Đinh Anh Tiến"
];

async function resetData() {
    console.log('--- RESETTING DATA ---');
    
    // Deleting matches first due to FK constraints
    const { error: matchError } = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (matchError) console.error('Error deleting matches:', matchError.message);
    else console.log('Matches cleared.');

    const { error: tournamentError } = await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (tournamentError) console.error('Error deleting tournaments:', tournamentError.message);
    else console.log('Tournaments cleared.');

    const { error: playerError } = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (playerError) console.error('Error deleting players:', playerError.message);
    else console.log('Players cleared.');

    console.log('--- INSERTING NEW PLAYERS ---');
    const newPlayers = players.map(name => ({
        name,
        elo_rating: 1200,
        matches_played: 0,
        wins: 0,
        losses: 0
    }));

    const { error: insertError } = await supabase.from('players').insert(newPlayers);
    if (insertError) console.error('Error inserting players:', insertError.message);
    else console.log(`Successfully inserted ${players.length} players.`);
}

resetData();
