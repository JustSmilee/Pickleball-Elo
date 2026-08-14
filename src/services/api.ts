import { supabase } from '../lib/supabase';
import type { Player, Match, TournamentPlayerStats } from '../types';
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

export const tournamentService = {
    async getAllTournaments(): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createTournament(name: string): Promise<void> {
        if (!supabase) return;
        const { error } = await supabase.from('tournaments').insert([{ name }]);
        if (error) throw error;
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
    }
};

