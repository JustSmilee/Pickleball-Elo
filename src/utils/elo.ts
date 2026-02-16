/**
 * Elo Rating Calculation
 * Formula: Ra' = Ra + K * (Sa - Ea)
 * Ea = 1 / (1 + 10^((Rb-Ra)/400))
 */

const K_FACTOR = 32;

export function calculateEloDelta(
    ratingA: number,
    ratingB: number,
    scoreA: number,
    scoreB: number
): number {
    const winProbability = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const actualScore = scoreA > scoreB ? 1 : 0;

    return Math.round(K_FACTOR * (actualScore - winProbability));
}

export function calculateDoublesEloDelta(
    team1Avg: number,
    team2Avg: number,
    score1: number,
    score2: number
): number {
    return calculateEloDelta(team1Avg, team2Avg, score1, score2);
}
