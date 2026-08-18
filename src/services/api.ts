import { supabase } from '../lib/supabase';
import type { Player, Match, TournamentPlayerStats, TournamentFormat, TournamentFixture, TournamentStandingsRow, TeamRoster, TeamMinigameStats } from '../types';
import { calculateEloDelta } from '../utils/elo';


export const playerService = {
    async getAllPlayers(): Promise<Player[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('elo_rating', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async updatePlayerRating(id: string, newElo: number, win: boolean): Promise<void> {
        if (!supabase) return;
        const { data: player } = await supabase.from('players').select('*').eq('id', id).single();
        if (!player) return;

        const { error } = await supabase
            .from('players')
            .update({
                elo_rating: newElo,
                matches_played: (player.matches_played || 0) + 1,
                wins: win ? (player.wins || 0) + 1 : (player.wins || 0),
                losses: win ? (player.losses || 0) : (player.losses || 0) + 1,
            })
            .eq('id', id);

        if (error) throw error;
    },

    async getPlayerEloTrend(playerId: string): Promise<{ date: string, elo: number }[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        let currentElo = 1200;
        const history = [{ date: 'Initial', elo: currentElo }];

        (data as any[]).forEach(match => {
            const isTeam1 = [match.team1_player1_id, match.team1_player2_id].includes(playerId);
            const delta = isTeam1 ? match.elo_delta_team1 : match.elo_delta_team2;
            currentElo += delta;
            history.push({
                date: new Date(match.created_at).toLocaleDateString(),
                elo: currentElo
            });
        });

        return history;
    },

    async calculateWinStreak(playerId: string): Promise<number> {
        if (!supabase) return 0;
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`)
            .order('created_at', { ascending: false });

        if (error || !data) return 0;

        let streak = 0;
        for (const match of data) {
            const isTeam1 = [match.team1_player1_id, match.team1_player2_id].includes(playerId);
            const team1Won = match.team1_score > match.team2_score;
            const won = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);

            if (won) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    },

    async calculateAllWinStreaks(): Promise<Record<string, number>> {
        if (!supabase) return {};
        const { data, error } = await supabase
            .from('matches')
            .select('team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, team1_score, team2_score')
            .order('created_at', { ascending: false });

        if (error || !data) return {};

        const streaks: Record<string, number> = {};
        const broken: Record<string, boolean> = {};

        data.forEach((match: any) => {
            const team1Won = match.team1_score > match.team2_score;
            const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
            const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);

            const updateStreak = (pid: string, won: boolean) => {
                if (broken[pid]) return;
                if (won) {
                    streaks[pid] = (streaks[pid] || 0) + 1;
                } else {
                    broken[pid] = true;
                    if (!streaks[pid]) streaks[pid] = 0;
                }
            };

            team1Players.forEach(pid => updateStreak(pid, team1Won));
            team2Players.forEach(pid => updateStreak(pid, !team1Won));
        });

        return streaks;
    },

    async getBestPartner(playerId: string): Promise<{
        partner: Player;
        wins: number;
        total: number;
        winRate: number;
    } | null> {
        if (!supabase) return null;
        const { data: matches, error } = await supabase
            .from('matches')
            .select(`
                *,
                p1:team1_player1_id(id, name, user_ad),
                p1b:team1_player2_id(id, name, user_ad),
                p2:team2_player1_id(id, name, user_ad),
                p2b:team2_player2_id(id, name, user_ad)
            `)
            .or(`team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`);

        if (error || !matches) return null;

        const partnerStats: Record<string, { partner: Player; wins: number; total: number }> = {};

        matches.forEach((m: any) => {
            let partnerObj: Player | null = null;
            let playerWon = false;

            const t1 = [m.team1_player1_id, m.team1_player2_id];
            const t2 = [m.team2_player1_id, m.team2_player2_id];

            if (t1.includes(playerId) && m.team1_player2_id) {
                partnerObj = m.team1_player1_id === playerId ? m.p1b : m.p1;
                playerWon = m.team1_score > m.team2_score;
            } else if (t2.includes(playerId) && m.team2_player2_id) {
                partnerObj = m.team2_player1_id === playerId ? m.p2b : m.p2;
                playerWon = m.team2_score > m.team1_score;
            }

            if (partnerObj && partnerObj.id) {
                if (!partnerStats[partnerObj.id]) {
                    partnerStats[partnerObj.id] = { partner: partnerObj, wins: 0, total: 0 };
                }
                partnerStats[partnerObj.id].total += 1;
                if (playerWon) {
                    partnerStats[partnerObj.id].wins += 1;
                }
            }
        });

        const partnerList = Object.values(partnerStats).map(s => ({
            ...s,
            winRate: Math.round((s.wins / s.total) * 100)
        }));

        // Require minimum 2 matches together (prefer 3+ if available)
        const min3Partners = partnerList.filter(p => p.total >= 3);
        const candidates = min3Partners.length > 0 ? min3Partners : partnerList.filter(p => p.total >= 2);

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => b.winRate - a.winRate || b.total - a.total || b.wins - a.wins);

        return candidates[0];
    }
};

export const matchService = {
    async getRecentMatches(): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('matches')
            .select(`
        *,
        p1:team1_player1_id(name, user_ad),
        p1b:team1_player2_id(name, user_ad),
        p2:team2_player1_id(name, user_ad),
        p2b:team2_player2_id(name, user_ad),
        tournament:tournament_id(name)
      `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getStats() {
        if (!supabase) return { totalMatches: 0, activePlayers: 0 };

        const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
        const { count: playerCount } = await supabase.from('players').select('*', { count: 'exact', head: true });

        return {
            totalMatches: matchCount || 0,
            activePlayers: playerCount || 0
        };
    },

    async recordMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('matches').insert([match]);
        if (error) throw error;
    },

    async deleteMatch(matchId: string): Promise<void> {
        if (!supabase) return;

        // 1. Fetch match details to get deltas and player IDs
        const { data: match, error: fetchError } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();

        if (fetchError || !match) throw fetchError || new Error('Match not found');

        // 2. Reverse Player Ratings
        const reverseRating = async (id: string, delta: number, wasWin: boolean) => {
            const { data: player } = await supabase.from('players').select('*').eq('id', id).single();
            if (!player) return;

            await supabase.from('players').update({
                elo_rating: player.elo_rating - delta,
                matches_played: Math.max(0, (player.matches_played || 1) - 1),
                wins: wasWin ? Math.max(0, (player.wins || 1) - 1) : player.wins,
                losses: !wasWin ? Math.max(0, (player.losses || 1) - 1) : player.losses
            }).eq('id', id);
        };

        const team1Won = match.team1_score > match.team2_score;

        await reverseRating(match.team1_player1_id, match.elo_delta_team1, team1Won);
        if (match.team1_player2_id) await reverseRating(match.team1_player2_id, match.elo_delta_team1, team1Won);

        await reverseRating(match.team2_player1_id, match.elo_delta_team2, !team1Won);
        if (match.team2_player2_id) await reverseRating(match.team2_player2_id, match.elo_delta_team2, !team1Won);

        // 3. Delete the match record
        const { error: deleteError } = await supabase.from('matches').delete().eq('id', matchId);
        if (deleteError) throw deleteError;
    },

    async getPlayerMatches(playerId: string): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                p1:team1_player1_id(name, user_ad),
                p1b:team1_player2_id(name, user_ad),
                p2:team2_player1_id(name, user_ad),
                p2b:team2_player2_id(name, user_ad),
                tournament:tournament_id(name)
            `)
            .or(`team1_player1_id.eq.${playerId},team1_player2_id.eq.${playerId},team2_player1_id.eq.${playerId},team2_player2_id.eq.${playerId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};

export const DEFAULT_TEAM_ROSTERS: Record<string, TeamRoster> = {
    A: {
        id: 'A',
        name: 'Đội A',
        color: '#00f2ff',
        badgeBg: 'rgba(0, 242, 255, 0.15)',
        memberIds: [
            'd99e3277-15f3-47de-a1e4-d810e8c49a68', // Bùi Tăng Bảo Ngọc
            '2d47f397-572a-402d-964c-0508328d01b5', // Tăng Khánh Thiện
            'ff060842-674f-42b0-9e62-f6ad584c54f5', // Nguyễn Bích Ngọc
            '51e0076f-5756-4165-b389-980cf0584b34', // Nguyễn Thị Phương Thảo
            '48b2732b-68cc-4ffb-9253-2b3c37201656', // Bảo Khang
        ]
    },
    B: {
        id: 'B',
        name: 'Đội B',
        color: '#10b981',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        memberIds: [
            '7945bd7a-3809-4e59-9301-dbc639eb6a4d', // Nguyễn Hồng Phong
            'c84da8d0-57f8-443c-ad23-280b9f6af558', // Dương Viết Đức
            'd36871b0-43f8-40e5-a197-ad51de3f5610', // Hà Vũ Đức Anh
            'ff46b5dd-a478-4ddc-ac4a-9d42b2759f59', // Phạm Thị Quỳnh
            'bb414b84-77a4-4162-952e-c1f28997c5a2', // Nguyễn Công Hoàn
        ]
    },
    C: {
        id: 'C',
        name: 'Đội C',
        color: '#f97316',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        memberIds: [
            '6c5ed1bd-140c-4bae-9d5f-575f6442209e', // Hà Quang Huy
            '036f1898-c112-4ebf-a586-cbf68426bd3b', // Nguyễn Huy Hoàng
            '1722524a-ae87-4997-af1c-63114efb5c29', // Nguyễn Lâm Trường
            'edad5c77-a968-40e3-9ae5-1e48e72fead9', // Phan Hương Trà
            'e1ee0755-3a04-48b7-99ab-66158cf5354d', // Hà Thị Hiên (Hiển)
        ]
    },
    D: {
        id: 'D',
        name: 'Đội D',
        color: '#a855f7',
        badgeBg: 'rgba(168, 85, 247, 0.15)',
        memberIds: [
            '1723d502-b7f5-4af1-9dc3-5bba1339d139', // Nguyễn Mạnh Thắng (12)
            'c3ccd79f-ad18-47b5-bdc2-b010a24981c4', // Doãn Hữu Thăng
            '2ba7e8d6-fa44-4787-94e7-1ef870fe59cc', // Hoàng Trần Xuân Sơn
            'afc3529a-6282-4384-8322-68be919fc349', // Lê Thị Thùy Linh
            'd762878f-8bcd-45b4-941a-8b6ff9671fc9', // Nguyễn Hoàng Minh Hiển
        ]
    }
};

export const tournamentService = {
    async getAllTournaments(): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((t: any) => {
            const storedFormat = localStorage.getItem(`tournament_format_${t.id}`);
            const format = (t.name && t.name.includes('H2 2026')) ? 'team_minigame' : (storedFormat || t.format || 'elo_only');
            return { ...t, format };
        });
    },

    async createTournament(
        name: string,
        format: TournamentFormat = 'elo_only',
        _participantIds: string[] = [],
        customFixtures: TournamentFixture[] = []
    ): Promise<any> {
        if (!supabase) return null;

        const { data: tourney, error } = await supabase
            .from('tournaments')
            .insert([{
                name,
                status: 'active',
                start_date: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;

        if (tourney) {
            localStorage.setItem(`tournament_format_${tourney.id}`, format);
        }

        // If fixtures were generated, store them in localStorage / database metadata
        if (customFixtures && customFixtures.length > 0) {
            const localStorageKey = `tournament_fixtures_${tourney.id}`;
            localStorage.setItem(localStorageKey, JSON.stringify(customFixtures));
        }

        return { ...tourney, format };
    },


    async getTournamentLeaderboard(tournamentId: string): Promise<TournamentPlayerStats[]> {
        if (!supabase) return [];

        const [matchesRes, playersRes] = await Promise.all([
            supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at', { ascending: true }),
            playerService.getAllPlayers()
        ]);

        if (matchesRes.error) throw matchesRes.error;
        const matches = matchesRes.data || [];
        const allPlayers = playersRes || [];

        const statsMap: Record<string, TournamentPlayerStats> = {};
        allPlayers.forEach(p => {
            statsMap[p.id] = {
                playerId: p.id,
                name: p.name,
                user_ad: p.user_ad,
                elo_rating: 1200,
                matches_played: 0,
                wins: 0,
                losses: 0,
                current_streak: 0
            };
        });

        matches.forEach((match: any) => {
            const p1 = match.team1_player1_id;
            const p1b = match.team1_player2_id;
            const p2 = match.team2_player1_id;
            const p2b = match.team2_player2_id;

            const isDoubles = match.type === 'doubles';
            const r1a = statsMap[p1]?.elo_rating ?? 1200;
            const r1b = p1b ? (statsMap[p1b]?.elo_rating ?? 1200) : 1200;
            const r2a = statsMap[p2]?.elo_rating ?? 1200;
            const r2b = p2b ? (statsMap[p2b]?.elo_rating ?? 1200) : 1200;

            const t1Avg = isDoubles ? (r1a + r1b) / 2 : r1a;
            const t2Avg = isDoubles ? (r2a + r2b) / 2 : r2a;

            const delta = calculateEloDelta(t1Avg, t2Avg, match.team1_score, match.team2_score);
            const team1Won = match.team1_score > match.team2_score;

            const updatePlayer = (pid: string, isWin: boolean, d: number) => {
                if (!statsMap[pid]) return;
                statsMap[pid].elo_rating += d;
                statsMap[pid].matches_played += 1;
                if (isWin) {
                    statsMap[pid].wins += 1;
                    statsMap[pid].current_streak = statsMap[pid].current_streak > 0 ? statsMap[pid].current_streak + 1 : 1;
                } else {
                    statsMap[pid].losses += 1;
                    statsMap[pid].current_streak = 0;
                }
            };

            updatePlayer(p1, team1Won, delta);
            if (p1b) updatePlayer(p1b, team1Won, delta);

            updatePlayer(p2, !team1Won, -delta);
            if (p2b) updatePlayer(p2b, !team1Won, -delta);
        });

        return Object.values(statsMap)
            .filter(p => p.matches_played > 0)
            .sort((a, b) => b.elo_rating - a.elo_rating || b.wins - a.wins);
    },

    async getTournamentPlayerElos(tournamentId: string): Promise<Record<string, number>> {
        const stats = await this.getTournamentLeaderboard(tournamentId);
        const map: Record<string, number> = {};
        stats.forEach(s => {
            map[s.playerId] = s.elo_rating;
        });
        return map;
    },

    async getTournamentMatches(tournamentId: string): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('matches')
            .select(`
                *,
                p1:team1_player1_id(name, user_ad),
                p1b:team1_player2_id(name, user_ad),
                p2:team2_player1_id(name, user_ad),
                p2b:team2_player2_id(name, user_ad)
            `)
            .eq('tournament_id', tournamentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    getTournamentFixtures(tournamentId: string): TournamentFixture[] {
        const raw = localStorage.getItem(`tournament_fixtures_${tournamentId}`);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },

    saveTournamentFixtures(tournamentId: string, fixtures: TournamentFixture[]): void {
        localStorage.setItem(`tournament_fixtures_${tournamentId}`, JSON.stringify(fixtures));
    },

    generateRoundRobinFixtures(tournamentId: string, enrolledPlayers: { id: string; name: string }[]): TournamentFixture[] {
        const fixtures: TournamentFixture[] = [];
        const list = [...enrolledPlayers];
        if (list.length % 2 !== 0) {
            list.push({ id: 'BYE', name: 'Nghỉ' });
        }

        const numPlayers = list.length;
        const numRounds = numPlayers - 1;
        const half = numPlayers / 2;

        let matchCounter = 1;

        for (let round = 0; round < numRounds; round++) {
            for (let i = 0; i < half; i++) {
                const p1 = list[i];
                const p2 = list[numPlayers - 1 - i];

                if (p1.id !== 'BYE' && p2.id !== 'BYE') {
                    fixtures.push({
                        id: `fix_${tournamentId}_r${round + 1}_m${matchCounter++}`,
                        tournament_id: tournamentId,
                        round: round + 1,
                        match_index: matchCounter,
                        player1_id: p1.id,
                        player1_name: p1.name,
                        player2_id: p2.id,
                        player2_name: p2.name,
                        status: 'pending'
                    });
                }
            }
            // Rotate array keeping list[0] fixed
            list.splice(1, 0, list.pop()!);
        }

        return fixtures;
    },

    generateKnockoutFixtures(tournamentId: string, enrolledPlayers: { id: string; name: string }[]): TournamentFixture[] {
        const fixtures: TournamentFixture[] = [];
        const n = enrolledPlayers.length;

        if (n < 2) return [];

        // Determine number of rounds needed (e.g. 4 players -> 2 rounds: Semis, Final)
        let numRounds = Math.ceil(Math.log2(n));
        let totalSlots = Math.pow(2, numRounds); // e.g. 4 or 8

        // Seed players into round 1

        // Create placeholders for all rounds
        let globalIndex = 1;
        const roundFixturesMap: Record<number, TournamentFixture[]> = {};

        for (let r = 1; r <= numRounds; r++) {
            const matchesInRound = totalSlots / Math.pow(2, r);
            roundFixturesMap[r] = [];

            for (let m = 0; m < matchesInRound; m++) {
                const fix: TournamentFixture = {
                    id: `fix_ko_${tournamentId}_r${r}_m${m + 1}`,
                    tournament_id: tournamentId,
                    round: r,
                    match_index: globalIndex++,
                    status: 'pending'
                };
                roundFixturesMap[r].push(fix);
            }
        }

        // Link next_fixture_id in knockout tree
        for (let r = 1; r < numRounds; r++) {
            const currentRound = roundFixturesMap[r];
            const nextRound = roundFixturesMap[r + 1];

            currentRound.forEach((fix, i) => {
                const nextMatch = nextRound[Math.floor(i / 2)];
                if (nextMatch) {
                    fix.next_fixture_id = nextMatch.id;
                }
            });
        }

        // Populate round 1 with players
        roundFixturesMap[1].forEach((fix, i) => {
            const p1 = enrolledPlayers[i * 2];
            const p2 = enrolledPlayers[i * 2 + 1];

            if (p1) {
                fix.player1_id = p1.id;
                fix.player1_name = p1.name;
            }
            if (p2) {
                fix.player2_id = p2.id;
                fix.player2_name = p2.name;
            }
        });

        // Flatten all fixtures into list
        for (let r = 1; r <= numRounds; r++) {
            fixtures.push(...roundFixturesMap[r]);
        }

        return fixtures;
    },

    recordFixtureScore(tournamentId: string, fixtureId: string, score1: number, score2: number): TournamentFixture[] {
        const fixtures = this.getTournamentFixtures(tournamentId);
        const fix = fixtures.find(f => f.id === fixtureId);
        if (!fix) return fixtures;

        fix.score1 = score1;
        fix.score2 = score2;
        fix.status = 'completed';
        fix.winner_id = score1 > score2 ? fix.player1_id : fix.player2_id;

        // If knockout format, advance winner to next fixture
        if (fix.next_fixture_id && fix.winner_id) {
            const nextFix = fixtures.find(f => f.id === fix.next_fixture_id);
            const winnerName = score1 > score2 ? fix.player1_name : fix.player2_name;

            if (nextFix) {
                if (!nextFix.player1_id) {
                    nextFix.player1_id = fix.winner_id;
                    nextFix.player1_name = winnerName;
                } else if (!nextFix.player2_id) {
                    nextFix.player2_id = fix.winner_id;
                    nextFix.player2_name = winnerName;
                }
            }
        }

        this.saveTournamentFixtures(tournamentId, fixtures);
        return fixtures;
    },

    calculateRoundRobinStandings(fixtures: TournamentFixture[], players: Player[]): TournamentStandingsRow[] {
        const map: Record<string, TournamentStandingsRow> = {};

        players.forEach(p => {
            map[p.id] = {
                playerId: p.id,
                name: p.name,
                user_ad: p.user_ad,
                played: 0,
                wins: 0,
                losses: 0,
                points: 0,
                scoreDiff: 0
            };
        });

        fixtures.filter(f => f.status === 'completed').forEach(f => {
            if (!f.player1_id || !f.player2_id || f.score1 === undefined || f.score2 === undefined) return;

            const p1 = map[f.player1_id];
            const p2 = map[f.player2_id];

            if (p1 && p2) {
                p1.played += 1;
                p2.played += 1;
                p1.scoreDiff += (f.score1 - f.score2);
                p2.scoreDiff += (f.score2 - f.score1);

                if (f.score1 > f.score2) {
                    p1.wins += 1;
                    p1.points += 3;
                    p2.losses += 1;
                } else if (f.score2 > f.score1) {
                    p2.wins += 1;
                    p2.points += 3;
                    p1.losses += 1;
                } else {
                    p1.points += 1;
                    p2.points += 1;
                }
            }
        });

        return Object.values(map)
            .filter(r => r.played > 0)
            .sort((a, b) => b.points - a.points || b.wins - a.wins || b.scoreDiff - a.scoreDiff);
    },

    async getTeamMinigameStandings(tournamentId: string): Promise<TeamMinigameStats[]> {
        if (!supabase) return [];

        const [matchesRes, playersRes] = await Promise.all([
            supabase
                .from('matches')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at', { ascending: true }),
            playerService.getAllPlayers()
        ]);

        if (matchesRes.error) throw matchesRes.error;
        const matches = matchesRes.data || [];
        const allPlayers = playersRes || [];

        const playerMap = new Map<string, Player>();
        allPlayers.forEach(p => playerMap.set(p.id, p));

        const playerToTeam = new Map<string, string>();
        Object.values(DEFAULT_TEAM_ROSTERS).forEach(team => {
            team.memberIds.forEach(mId => playerToTeam.set(mId, team.id));
        });

        const stats: Record<string, TeamMinigameStats> = {};
        Object.values(DEFAULT_TEAM_ROSTERS).forEach(team => {
            const members = team.memberIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
            stats[team.id] = {
                teamId: team.id,
                teamName: team.name,
                color: team.color,
                memberIds: team.memberIds,
                members,
                played: 0,
                wins: 0,
                losses: 0,
                ptsFor: 0,
                ptsAgainst: 0,
                scoreDiff: 0,
                matchPoints: 0,
                weeklyBonus: 0,
                totalPoints: 0,
                weeklyWins: { 1: 0, 2: 0, 3: 0 }
            };
        });

        // Weekly team stats tracking (to find the single best team per week):
        const weeklyTeamStats: Record<number, Record<string, { wins: number, losses: number, ptsFor: number, ptsAgainst: number, scoreDiff: number, played: number }>> = {
            1: { A: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, B: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, C: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, D: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 } },
            2: { A: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, B: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, C: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, D: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 } },
            3: { A: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, B: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, C: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 }, D: { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, scoreDiff: 0, played: 0 } }
        };

        matches.forEach((m: any) => {
            const t1 = playerToTeam.get(m.team1_player1_id) || playerToTeam.get(m.team1_player2_id || '');
            const t2 = playerToTeam.get(m.team2_player1_id) || playerToTeam.get(m.team2_player2_id || '');

            if (!t1 || !t2 || t1 === t2) return;

            const s1 = m.team1_score || 0;
            const s2 = m.team2_score || 0;

            if (stats[t1]) {
                stats[t1].played += 1;
                stats[t1].ptsFor += s1;
                stats[t1].ptsAgainst += s2;
                if (s1 > s2) {
                    stats[t1].wins += 1;
                    stats[t1].matchPoints += 1;
                } else if (s2 > s1) {
                    stats[t1].losses += 1;
                }
            }

            if (stats[t2]) {
                stats[t2].played += 1;
                stats[t2].ptsFor += s2;
                stats[t2].ptsAgainst += s1;
                if (s2 > s1) {
                    stats[t2].wins += 1;
                    stats[t2].matchPoints += 1;
                } else if (s1 > s2) {
                    stats[t2].losses += 1;
                }
            }

            // Week logic based on date or fallback
            const matchDate = new Date(m.created_at);
            let weekNum = 1;
            const day = matchDate.getUTCDate();
            const month = matchDate.getUTCMonth() + 1;
            if (month === 8) {
                if (day <= 15) weekNum = 1;
                else if (day <= 22) weekNum = 2;
                else weekNum = 3;
            }

            if (weeklyTeamStats[weekNum]) {
                if (weeklyTeamStats[weekNum][t1]) {
                    const wt1 = weeklyTeamStats[weekNum][t1];
                    wt1.played += 1;
                    wt1.ptsFor += s1;
                    wt1.ptsAgainst += s2;
                    if (s1 > s2) wt1.wins += 1;
                    else if (s2 > s1) wt1.losses += 1;
                    wt1.scoreDiff = wt1.ptsFor - wt1.ptsAgainst;
                }
                if (weeklyTeamStats[weekNum][t2]) {
                    const wt2 = weeklyTeamStats[weekNum][t2];
                    wt2.played += 1;
                    wt2.ptsFor += s2;
                    wt2.ptsAgainst += s1;
                    if (s2 > s1) wt2.wins += 1;
                    else if (s1 > s2) wt2.losses += 1;
                    wt2.scoreDiff = wt2.ptsFor - wt2.ptsAgainst;
                }
            }
        });

        // Compute scoreDiff
        Object.values(stats).forEach(st => {
            st.scoreDiff = st.ptsFor - st.ptsAgainst;
        });

        // Calculate weekly bonus (+2 points for the SINGLE best team of each week)
        Object.entries(weeklyTeamStats).forEach(([wStr, teamDataMap]) => {
            const wNum = Number(wStr);
            const candidates = Object.entries(teamDataMap)
                .map(([teamId, wStat]) => ({ teamId, ...wStat }))
                .filter(t => t.played > 0);

            if (candidates.length === 0) return;

            // Sort candidates to find the #1 best team in this week
            candidates.sort((a, b) =>
                b.wins - a.wins ||
                b.scoreDiff - a.scoreDiff ||
                b.ptsFor - a.ptsFor
            );

            const topTeam = candidates[0];
            if (topTeam && topTeam.wins > 0 && stats[topTeam.teamId]) {
                stats[topTeam.teamId].weeklyBonus += 2;
                stats[topTeam.teamId].weeklyWins[wNum] = 1;
            }
        });

        // Total points calculation
        Object.values(stats).forEach(st => {
            st.totalPoints = st.matchPoints + st.weeklyBonus;
        });

        return Object.values(stats).sort((a, b) =>
            b.totalPoints - a.totalPoints ||
            b.wins - a.wins ||
            b.scoreDiff - a.scoreDiff
        );
    }
};



