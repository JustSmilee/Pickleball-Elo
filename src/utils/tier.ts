export interface TierBadge {
    name: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
    percentileLabel: string;
}

export const getPlayerTier = (elo: number, allElosSortedDesc: number[]): TierBadge => {
    if (!allElosSortedDesc || allElosSortedDesc.length === 0) {
        return { name: 'Vàng', icon: '🥇', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.4)', percentileLabel: 'Top 35%' };
    }

    const rankIndex = allElosSortedDesc.findIndex(e => e <= elo);
    const pos = rankIndex === -1 ? allElosSortedDesc.length : rankIndex + 1;
    const percentile = (pos / allElosSortedDesc.length) * 100;

    if (percentile <= 5) {
        return { name: 'Cao Thủ', icon: '👑', color: '#FF0055', bg: 'rgba(255, 0, 85, 0.18)', border: 'rgba(255, 0, 85, 0.5)', percentileLabel: 'Top 5%' };
    } else if (percentile <= 15) {
        return { name: 'Kim Cương', icon: '💎', color: '#00F2FF', bg: 'rgba(0, 242, 255, 0.18)', border: 'rgba(0, 242, 255, 0.5)', percentileLabel: 'Top 15%' };
    } else if (percentile <= 35) {
        return { name: 'Vàng', icon: '🥇', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.18)', border: 'rgba(255, 215, 0, 0.5)', percentileLabel: 'Top 35%' };
    } else if (percentile <= 65) {
        return { name: 'Bạc', icon: '🥈', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.18)', border: 'rgba(192, 192, 192, 0.5)', percentileLabel: 'Top 65%' };
    } else {
        return { name: 'Tập Sự', icon: '🔰', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.18)', border: 'rgba(205, 127, 50, 0.5)', percentileLabel: 'Nhập Môn' };
    }
};
