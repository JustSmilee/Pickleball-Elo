import React, { useState, useEffect } from 'react';
import { matchService, tournamentService, DEFAULT_TEAM_ROSTERS } from '../services/api';
import { Clock, TrendingUp, TrendingDown, Users, User, Trash2, Edit2, Trophy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tournament } from '../types';

const playerToTeamMap = new Map<string, string>();
Object.values(DEFAULT_TEAM_ROSTERS).forEach(team => {
    team.memberIds.forEach(mId => playerToTeamMap.set(mId, team.id));
});

const getTeamForPlayer = (playerId?: string) => {
    if (!playerId) return null;
    const teamId = playerToTeamMap.get(playerId);
    return teamId ? DEFAULT_TEAM_ROSTERS[teamId] : null;
};

interface HistoryProps {
    onEdit?: (match: any) => void;
}

export const History: React.FC<HistoryProps> = ({ onEdit }) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMatches = () => {
        Promise.all([
            matchService.getRecentMatches(),
            tournamentService.getAllTournaments()
        ]).then(([matchesData, tournamentsData]) => {
            setMatches(matchesData);
            setTournaments(tournamentsData);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const filteredMatches = matches.filter(match => {
        const query = searchQuery.toLowerCase();
        const matchesPlayer = (
            match.p1?.name.toLowerCase().includes(query) ||
            match.p1b?.name.toLowerCase().includes(query) ||
            match.p2?.name.toLowerCase().includes(query) ||
            match.p2b?.name.toLowerCase().includes(query) ||
            match.p1?.user_ad?.toLowerCase().includes(query) ||
            match.p1b?.user_ad?.toLowerCase().includes(query) ||
            match.p2?.user_ad?.toLowerCase().includes(query) ||
            match.p2b?.user_ad?.toLowerCase().includes(query)
        );

        const matchesTournament = selectedTournamentId === 'all' || match.tournament_id === selectedTournamentId;

        return matchesPlayer && matchesTournament;
    });

    const handleDelete = async (matchId: string) => {
        if (!window.confirm('Bạn có chắc muốn xoá trận đấu này? Điểm Elo sẽ được hoàn tác.')) return;

        setIsDeleting(matchId);
        try {
            await matchService.deleteMatch(matchId);
            fetchMatches();
            alert('Đã xoá trận đấu và cập nhật lại bảng xếp hạng.');
        } catch (err) {
            console.error(err);
            alert('Lỗi khi xoá trận đấu.');
        } finally {
            setIsDeleting(null);
        }
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        return date.toLocaleDateString();
    };

    if (loading) return <div className="fade-in">Đang tải lịch sử...</div>;

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="history-header">
                <h2 className="neon-text heading-font history-title" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock color="var(--primary-neon)" /> Lịch sử trận đấu
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }} className="search-wrapper">
                    {/* Tournament Filter */}
                    <div style={{ position: 'relative', minWidth: '180px' }}>
                        <select
                            value={selectedTournamentId}
                            onChange={(e) => setSelectedTournamentId(e.target.value)}
                            style={{
                                width: '100%',
                                background: selectedTournamentId !== 'all' ? 'rgba(255, 215, 0, 0.1)' : '#1e2337',
                                border: selectedTournamentId !== 'all' ? '2px solid gold' : '2px solid var(--primary-neon)',
                                color: 'white',
                                padding: '10px 14px 10px 34px',
                                borderRadius: '24px',
                                fontSize: '0.85rem',
                                outline: 'none',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">Tất cả trận đấu</option>
                            {tournaments.map(t => (
                                <option key={t.id} value={t.id}>🏆 {t.name}</option>
                            ))}
                        </select>
                        <Filter size={14} color={selectedTournamentId !== 'all' ? 'gold' : 'var(--primary-neon)'} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>

                    <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <input
                            type="text"
                            placeholder="Tìm vận động viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input-history"
                            style={{
                                background: '#1e2337',
                                border: '2px solid var(--primary-neon)',
                                color: 'white',
                                padding: '10px 16px 10px 44px',
                                borderRadius: '24px',
                                fontSize: '0.9rem',
                                width: '100%',
                                transition: 'all 0.3s',
                                outline: 'none',
                                boxShadow: '0 0 15px rgba(0, 242, 255, 0.1)'
                            }}
                        />
                        <Users size={18} color="var(--primary-neon)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                        {filteredMatches.length} Trận
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <AnimatePresence>
                    {filteredMatches.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-dim)' }}>Không tìm thấy trận đấu nào phù hợp.</p>
                        </motion.div>
                    ) : (
                        filteredMatches.map((match, index) => {
                            const team1 = getTeamForPlayer(match.team1_player1_id) || getTeamForPlayer(match.team1_player2_id);
                            const team2 = getTeamForPlayer(match.team2_player1_id) || getTeamForPlayer(match.team2_player2_id);
                            const t1Win = match.team1_score > match.team2_score;
                            const t2Win = match.team2_score > match.team1_score;

                            return (
                                <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                    className="glass-card hover-row history-item-card"
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        position: 'relative',
                                        opacity: isDeleting === match.id ? 0.5 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                    }}
                                >
                                    {/* Top Meta Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-dim)', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                                <Clock size={11} /> {formatRelativeTime(match.created_at)}
                                            </span>
                                            {match.tournament?.name && (
                                                <span style={{
                                                    background: 'rgba(255, 215, 0, 0.1)',
                                                    color: 'gold',
                                                    border: '1px solid rgba(255, 215, 0, 0.25)',
                                                    padding: '1px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 800,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Trophy size={10} /> {match.tournament.name}
                                                </span>
                                            )}
                                            {team1 && team2 && (
                                                <span style={{
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    padding: '1px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 800,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <span style={{ color: team1.color }}>{team1.name}</span>
                                                    <span style={{ color: 'var(--text-dim)', fontSize: '0.55rem' }}>VS</span>
                                                    <span style={{ color: team2.color }}>{team2.name}</span>
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                {match.type === 'doubles' ? <Users size={10} /> : <User size={10} />}
                                                {match.type === 'doubles' ? 'Đôi' : 'Đơn'}
                                            </span>
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => onEdit?.(match)}
                                                title="Sửa trận đấu"
                                                style={{
                                                    background: 'rgba(0, 242, 255, 0.08)', border: '1px solid rgba(0, 242, 255, 0.2)', color: 'var(--primary-neon)', cursor: 'pointer',
                                                    padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 700
                                                }}
                                            >
                                                <Edit2 size={10} /> Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(match.id)}
                                                disabled={isDeleting !== null}
                                                title="Xóa trận đấu"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)', cursor: 'pointer',
                                                    padding: '2px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 700
                                                }}
                                            >
                                                <Trash2 size={10} /> Xoá
                                            </button>
                                        </div>
                                    </div>

                                    {/* Match Body */}
                                    <div className="match-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '8px' }}>
                                        {/* Side 1 */}
                                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', minWidth: 0 }}>
                                                <span
                                                    className="player-name"
                                                    style={{
                                                        fontWeight: t1Win ? 800 : 500,
                                                        fontSize: '0.88rem',
                                                        color: t1Win ? 'var(--primary-neon)' : 'white',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={`${match.p1?.name || ''}${match.p1b?.name ? ` & ${match.p1b.name}` : ''}`}
                                                >
                                                    {match.p1?.name}{match.p1b?.name ? ` & ${match.p1b.name}` : ''}
                                                </span>
                                                {team1 && (
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, color: team1.color, background: team1.badgeBg, padding: '1px 4px', borderRadius: '4px', border: `1px solid ${team1.color}30`, flexShrink: 0 }}>
                                                        {team1.id}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: t1Win ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', marginTop: '1px' }}>
                                                {t1Win ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                <span style={{ fontWeight: 700, fontSize: '0.68rem' }}>{match.elo_delta_team1 > 0 ? `+${match.elo_delta_team1}` : match.elo_delta_team1}</span>
                                            </div>
                                        </div>

                                        {/* Score Box */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}>
                                            <div className="score-box" style={{
                                                padding: '4px 12px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                fontFamily: 'var(--font-heading)',
                                                fontSize: '1.05rem',
                                                fontWeight: 900,
                                                letterSpacing: '0.05em',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                <span style={{ color: t1Win ? 'var(--primary-neon)' : 'white' }}>{match.team1_score}</span>
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>-</span>
                                                <span style={{ color: t2Win ? 'var(--secondary-neon)' : 'white' }}>{match.team2_score}</span>
                                            </div>
                                        </div>

                                        {/* Side 2 */}
                                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px', minWidth: 0 }}>
                                                {team2 && (
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 900, color: team2.color, background: team2.badgeBg, padding: '1px 4px', borderRadius: '4px', border: `1px solid ${team2.color}30`, flexShrink: 0 }}>
                                                        {team2.id}
                                                    </span>
                                                )}
                                                <span
                                                    className="player-name"
                                                    style={{
                                                        fontWeight: t2Win ? 800 : 500,
                                                        fontSize: '0.88rem',
                                                        color: t2Win ? 'var(--secondary-neon)' : 'white',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={`${match.p2?.name || ''}${match.p2b?.name ? ` & ${match.p2b.name}` : ''}`}
                                                >
                                                    {match.p2?.name}{match.p2b?.name ? ` & ${match.p2b.name}` : ''}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: t2Win ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '2px', marginTop: '1px' }}>
                                                {t2Win ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                <span style={{ fontWeight: 700, fontSize: '0.68rem' }}>{match.elo_delta_team2 > 0 ? `+${match.elo_delta_team2}` : match.elo_delta_team2}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <style>{`
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .history-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .history-title {
            font-size: 1.3rem !important;
          }
          .search-wrapper {
            width: 100% !important;
          }
          .search-input-history {
            width: 100% !important;
          }
          .player-name { font-size: 0.82rem !important; }
          .score-box { padding: 3px 8px !important; font-size: 0.95rem !important; }
          .history-item-card {
            padding: 8px 10px !important;
          }
        }
      `}</style>
        </div>
    );
};

