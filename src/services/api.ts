import { supabase } from '../lib/supabase';
import type { Player, Match } from '../types';

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
    }
};

export const matchService = {
    async getRecentMatches(): Promise<any[]> {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('matches')
            .select(`
        *,
        p1:team1_player1_id(name),
        p1b:team1_player2_id(name),
        p2:team2_player1_id(name),
        p2b:team2_player2_id(name)
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
    }
};
