export interface Player {
  id: string;
  name: string;
  user_ad?: string;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  avatar_url?: string;
  current_streak?: number;
}

export interface Match {
  id: string;
  created_at: string;
  type: 'singles' | 'doubles';
  team1_player1_id: string;
  team1_player2_id?: string;
  team2_player1_id: string;
  team2_player2_id?: string;
  team1_score: number;
  team2_score: number;
  elo_delta_team1: number;
  elo_delta_team2: number;
  tournament_id?: string;
}

export type TournamentFormat = 'elo_only' | 'round_robin' | 'knockout';

export interface TournamentFixture {
  id: string;
  tournament_id: string;
  round: number;
  match_index: number;
  player1_id?: string;
  player2_id?: string;
  player1_name?: string;
  player2_name?: string;
  score1?: number;
  score2?: number;
  winner_id?: string;
  status: 'pending' | 'completed';
  next_fixture_id?: string;
}

export interface TournamentStandingsRow {
  playerId: string;
  name: string;
  user_ad?: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreDiff: number;
}

export interface Tournament {
  id: string;
  name: string;
  format?: TournamentFormat;
  status: 'active' | 'completed';
  start_date: string;
  created_at: string;
  participant_ids?: string[];
  fixtures?: TournamentFixture[];
}

export interface TournamentPlayerStats {
  playerId: string;
  name: string;
  user_ad?: string;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  current_streak: number;
}

