/**
 * Elo Rating Calculation with Margin of Victory (MOV) Scaling
 * Base formula: Ra' = Ra + K * (Sa - Ea) * movMultiplier
 * Ea = 1 / (1 + 10^((Rb - Ra) / 400))
 * 
 * Margin of Victory Multiplier:
 * - Scaled based on the point difference ratio: |scoreA - scoreB| / max(scoreA, scoreB)
 * - Winning with a blowout (e.g. 11-0, 11-1) awards up to +40% more Elo than base.
 * - Winning a very close match (e.g. 11-9, 12-10) awards ~25-35% less than base.
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
    const baseDelta = K_FACTOR * (actualScore - winProbability);

    // Calculate point difference & margin ratio
    const pointDiff = Math.abs(scoreA - scoreB);
    const maxScore = Math.max(scoreA, scoreB, 1);
    const marginRatio = pointDiff / maxScore; // e.g. 11-0 => 1.0; 11-5 => 0.545; 11-9 => 0.182

    // Multiplier smoothly ranges between 0.65 (close match) and 1.40 (blowout)
    const movMultiplier = 0.65 + 0.75 * marginRatio;
    const scaledDelta = baseDelta * movMultiplier;

    // Ensure winner always gains at least 1 point, loser always loses at least 1 point
    if (actualScore === 1) {
        return Math.max(1, Math.round(scaledDelta));
    } else {
        return Math.min(-1, Math.round(scaledDelta));
    }
}

export function calculateDoublesEloDelta(
    team1Avg: number,
    team2Avg: number,
    score1: number,
    score2: number
): number {
    return calculateEloDelta(team1Avg, team2Avg, score1, score2);
}
