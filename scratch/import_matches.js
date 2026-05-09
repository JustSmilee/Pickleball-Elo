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
    console.log('--- RESETTING DATA FOR CLEAN IMPORT ---');
    // Clear old matches for Spring 2026 to avoid duplicates
    const { data: oldTourney } = await supabase.from('tournaments').select('id').eq('name', 'Spring 2026').single();
    if (oldTourney) {
        await supabase.from('matches').delete().eq('tournament_id', oldTourney.id);
        await supabase.from('tournaments').delete().eq('id', oldTourney.id);
    }
    
    // Reset player stats (simple approach for this task)
    const { data: players_raw } = await supabase.from('players').select('*');
    for (const p of players_raw) {
        await supabase.from('players').update({ elo_rating: 1200, matches_played: 0, wins: 0, losses: 0 }).eq('id', p.id);
    }

    // 1. Create Tournament
    const { data: tournament } = await supabase.from('tournaments').insert([{ name: 'Spring 2026' }]).select().single();
    const tournamentId = tournament.id;
    console.log(`Tournament 'Spring 2026' created.`);

    // 2. Fetch all players
    const { data: allPlayers } = await supabase.from('players').select('*');
    const playerMap = {};
    allPlayers.forEach(p => { playerMap[p.name.toLowerCase().trim()] = p; });

    const resolvePlayer = (name) => {
        if (!name) return null;
        const n = name.toLowerCase().trim().replace(/\(\d+\)/g, '').trim();
        return playerMap[n];
    };

    const resolveTeam = (teamStr) => {
        if (!teamStr) return [];
        const names = teamStr.split(/ - | & /);
        return names.map(n => resolvePlayer(n)).filter(Boolean);
    };

    // 3. Parse CSV manually
    const csvContent = fs.readFileSync('c:/Elo-rank/scratch/chuan_thi_dau.csv', 'utf-8');
    const records = csvContent.split('\n').map(line => {
        // Simple CSV split (not handling quotes, but our file is simple)
        return line.split(',');
    });

    const matches = [];

    // Helper to add match
    const addMatch = (team1Str, s1, s2, team2Str, isKnockout = false) => {
        if (!team1Str || !team2Str || isNaN(s1) || isNaN(s2)) return;
        matches.push({ team1: team1Str.trim().replace(/^"|"$/g, ''), team2: team2Str.trim().replace(/^"|"$/g, ''), score1: s1, score2: s2, is_knockout: isKnockout });
    };

    // Bảng A (Rows 8-13 in CSV are actually line index 8-13 since I have a header row from pandas)
    // Looking at the CSV content:
    // Line 1: header
    // Line 10 (index 8): match 1
    // Line 11 (index 9): match 2
    // ...
    // Wait, let's adjust indices. 
    // Line 10 (index 9) is row 8 in the original data.
    const getRow = (idx) => records[idx + 1]; // +1 for the header in CSV

    // Bảng A: Row 8-13 (Top Left)
    for (let i = 8; i <= 13; i++) {
        const row = getRow(i);
        if (row) addMatch(row[3], parseInt(row[5]), parseInt(row[7]), row[8]);
    }
    // Bảng C: Row 8-13 (Top Right)
    for (let i = 8; i <= 13; i++) {
        const row = getRow(i);
        if (row) addMatch(row[19], parseInt(row[21]), parseInt(row[23]), row[24]);
    }
    // Bảng B: Row 32-37 (Bottom Left)
    for (let i = 32; i <= 37; i++) {
        const row = getRow(i);
        if (row) addMatch(row[3], parseInt(row[5]), parseInt(row[7]), row[8]);
    }
    // Bảng D: Row 32-41 (Bottom Right)
    for (let i = 32; i <= 41; i++) {
        const row = getRow(i);
        if (row) addMatch(row[19], parseInt(row[21]), parseInt(row[23]), row[24]);
    }

    console.log(`Parsed ${matches.length} group stage matches.`);

    // Add Knockouts (Exactly 7 matches: 4 QF + 2 SF + 1 Final)
    // Tứ kết
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Dương Viết Đức - Phan Hương Trà", true);
    addMatch("Tăng khánh Thiện - Nguyễn Ngọc Tuấn", 8, 15, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);
    addMatch("Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", 15, 8, "Nguyễn Hữu Tuấn Duy - Nguyễn Thị Thùy Dương", true);
    addMatch("Nguyễn Huy Hoàng - Nguyễn Viết Chính", 15, 8, "Nguyễn Thị Phương Thảo - Nguyễn Lê Anh", true);

    // Bán kết
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);
    addMatch("Nguyễn Huy Hoàng - Nguyễn Viết Chính", 15, 8, "Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", true);

    // Chung kết
    addMatch("Trần Tuấn Hiệp - Hoàng Quang Vinh", 15, 8, "Nguyễn Huy Hoàng - Nguyễn Viết Chính", true);

    // Tranh Ba Tư
    addMatch("Nguyễn Tuấn Sơn - Hà Vũ Đức Anh", 15, 8, "Nguyễn Đức Xuân Bình - Nguyễn Bích Ngọc", true);

    console.log(`Total matches to import: ${matches.length}`);

    // 4. Record matches and update Elo
    for (const m of matches) {
        const t1 = resolveTeam(m.team1);
        const t2 = resolveTeam(m.team2);
        if (t1.length === 0 || t2.length === 0) continue;

        const score1 = m.score1;
        const score2 = m.score2;
        const avg1 = t1.reduce((s, p) => s + p.elo_rating, 0) / t1.length;
        const avg2 = t2.reduce((s, p) => s + p.elo_rating, 0) / t2.length;
        const delta = calculateEloDelta(avg1, avg2, score1, score2);

        const updatePlayer = async (p, d, won) => {
            const newElo = p.elo_rating + d;
            await supabase.from('players').update({
                elo_rating: newElo,
                matches_played: p.matches_played + 1,
                wins: won ? p.wins + 1 : p.wins,
                losses: won ? p.losses : p.losses + 1
            }).eq('id', p.id);
            p.elo_rating = newElo;
            p.matches_played += 1;
            if (won) p.wins += 1; else p.losses += 1;
        };

        for (const p of t1) await updatePlayer(p, delta, score1 > score2);
        for (const p of t2) await updatePlayer(p, -delta, score2 > score1);

        await supabase.from('matches').insert({
            type: t1.length > 1 ? 'doubles' : 'singles',
            team1_player1_id: t1[0].id,
            team1_player2_id: t1[1]?.id || null,
            team2_player1_id: t2[0].id,
            team2_player2_id: t2[1]?.id || null,
            team1_score: score1,
            team2_score: score2,
            elo_delta_team1: delta,
            elo_delta_team2: -delta,
            tournament_id: tournamentId
        });
        console.log(`Imported: ${m.team1} (${score1}) vs ${m.team2} (${score2})`);
    }

    console.log('--- ALL 28 GROUP MATCHES + KNOCKOUTS IMPORTED ---');
}

run();
