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

export interface Tournament {
  id: string;
  name: string;
  status: 'active' | 'completed';
  start_date: string;
  created_at: string;
}
