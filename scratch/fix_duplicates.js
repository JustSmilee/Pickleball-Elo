import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';
const supabase = createClient(supabaseUrl, supabaseKey);

const K_FACTOR = 32;

function calculateEloDelta(ratingA, ratingB, scoreA, scoreB) {
    const winProbability = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const actualScore = scoreA > scoreB ? 1 : 0;
    return Math.round(K_FACTOR * (actualScore - winProbability));
}

async function run() {
    console.log('--- FIXING DUPLICATES AND RE-IMPORTING ---');

    // 1. Ensure both Nguyễn Mạnh Thắng exist
    const { data: existing } = await supabase.from('players').select('*').ilike('name', 'Nguyễn Mạnh Thắng');
    
    // Delete existing to start clean
    if (existing && existing.length > 0) {
        for (const p of existing) {
            await supabase.from('matches').delete().or(`team1_player1_id.eq.${p.id},team1_player2_id.eq.${p.id},team2_player1_id.eq.${p.id},team2_player2_id.eq.${p.id}`);
            await supabase.from('players').delete().eq('id', p.id);
        }
    }

    const { data: p8 } = await supabase.from('players').insert([{ name: 'Nguyễn Mạnh Thắng', user_ad: 'thangnm8', elo_rating: 1200, matches_played: 0, wins: 0, losses: 0 }]).select().single();
    const { data: p12 } = await supabase.from('players').insert([{ name: 'Nguyễn Mạnh Thắng', user_ad: 'thangnm12', elo_rating: 1200, matches_played: 0, wins: 0, losses: 0 }]).select().single();

    console.log('Created both Nguyễn Mạnh Thắng players.');

    // 2. Reset other players
    const { data: others } = await supabase.from('players').select('*').not('name', 'eq', 'Nguyễn Mạnh Thắng');
    for (const p of others) {
        await supabase.from('players').update({ elo_rating: 1200, matches_played: 0, wins: 0, losses: 0 }).eq('id', p.id);
    }

    // 3. Clear tournament and matches
    const { data: oldTourney } = await supabase.from('tournaments').select('id').eq('name', 'Spring 2026').single();
    if (oldTourney) {
        await supabase.from('matches').delete().eq('tournament_id', oldTourney.id);
        await supabase.from('tournaments').delete().eq('id', oldTourney.id);
    }
    const { data: tournament } = await supabase.from('tournaments').insert([{ name: 'Spring 2026' }]).select().single();
    const tournamentId = tournament.id;

    // 4. Fetch all players for mapping
    const { data: allPlayers } = await supabase.from('players').select('*');
    const playerMap = {};
    allPlayers.forEach(p => {
        const key = p.name.toLowerCase().trim() + (p.user_ad ? `_${p.user_ad}` : '');
        playerMap[key] = p;
    });

    const resolvePlayer = (nameStr) => {
        if (!nameStr) return null;
        const cleanName = nameStr.toLowerCase().trim();
        
        // Specific logic for Nguyễn Mạnh Thắng
        if (cleanName.includes('nguyễn mạnh thắng')) {
            if (cleanName.includes('(8)')) return playerMap['nguyễn mạnh thắng_thangnm8'];
            if (cleanName.includes('(12)')) return playerMap['nguyễn mạnh thắng_thangnm12'];
            // Default to p8 if no suffix (might happen in knockouts)
            return playerMap['nguyễn mạnh thắng_thangnm8'];
        }
        
        const n = cleanName.replace(/\(\d+\)/g, '').trim();
        // Try to find by name only
        const match = allPlayers.find(p => p.name.toLowerCase().trim() === n);
        return match;
    };

    const resolveTeam = (teamStr) => {
        if (!teamStr) return [];
        const names = teamStr.split(/ - | & /);
        return names.map(n => resolvePlayer(n)).filter(Boolean);
    };

    // 5. Load matches from CSV
    const csvContent = fs.readFileSync('c:/Elo-rank/scratch/chuan_thi_dau.csv', 'utf-8');
    const records = csvContent.split('\n').map(line => line.split(','));
    const getRow = (idx) => records[idx + 1];
    const matches = [];
    const addMatch = (t1, s1, s2, t2, isK = false) => {
        if (t1 && t2 && !isNaN(s1) && !isNaN(s2)) matches.push({ team1: t1.trim().replace(/^"|"$/g, ''), team2: t2.trim().replace(/^"|"$/g, ''), score1: s1, score2: s2, is_knockout: isK });
    };

    for (let i = 8; i <= 13; i++) { const r = getRow(i); if (r) addMatch(r[3], parseInt(r[5]), parseInt(r[7]), r[8]); }
    for (let i = 8; i <= 13; i++) { const r = getRow(i); if (r) addMatch(r[19], parseInt(r[21]), parseInt(r[23]), r[24]); }
    for (let i = 32; i <= 37; i++) { const r = getRow(i); if (r) addMatch(r[3], parseInt(r[5]), parseInt(r[7]), r[8]); }
    for (let i = 32; i <= 41; i++) { const r = getRow(i); if (r) addMatch(r[19], parseInt(r[21]), parseInt(r[23]), r[24]); }

    // Knockouts
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Dương Viết Đức - Phan Hương Trà", true);
    addMatch("Tăng khánh Thiện - Nguyễn Ngọc Tuấn", 8, 15, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);
    addMatch("Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", 15, 8, "Nguyễn Hữu Tuấn Duy - Nguyễn Thị Thùy Dương", true);
    addMatch("Nguyễn Huy Hoàng - Nguyễn Viết Chính", 15, 8, "Nguyễn Thị Phương Thảo - Nguyễn Lê Anh", true);
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);
    addMatch("Nguyễn Huy Hoàng - Nguyễn Viết Chính", 15, 8, "Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", true);
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Nguyễn Huy Hoàng - Nguyễn Viết Chính", true);
    addMatch("Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", 15, 8, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);

    // 6. Record
    for (const m of matches) {
        const t1 = resolveTeam(m.team1);
        const t2 = resolveTeam(m.team2);
        if (t1.length === 0 || t2.length === 0) continue;
        const avg1 = t1.reduce((s, p) => s + p.elo_rating, 0) / t1.length;
        const avg2 = t2.reduce((s, p) => s + p.elo_rating, 0) / t2.length;
        const delta = calculateEloDelta(avg1, avg2, m.score1, m.score2);
        for (const p of t1) { p.elo_rating += delta; p.matches_played++; if (m.score1 > m.score2) p.wins++; else p.losses++; await supabase.from('players').update(p).eq('id', p.id); }
        for (const p of t2) { p.elo_rating -= delta; p.matches_played++; if (m.score2 > m.score1) p.wins++; else p.losses++; await supabase.from('players').update(p).eq('id', p.id); }
        await supabase.from('matches').insert({
            type: t1.length > 1 ? 'doubles' : 'singles',
            team1_player1_id: t1[0].id, team1_player2_id: t1[1]?.id || null,
            team2_player1_id: t2[0].id, team2_player2_id: t2[1]?.id || null,
            team1_score: m.score1, team2_score: m.score2,
            elo_delta_team1: delta, elo_delta_team2: -delta,
            tournament_id: tournamentId
        });
    }
    console.log('--- DONE ---');
}

run();
