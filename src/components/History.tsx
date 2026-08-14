import React, { useState, useEffect } from 'react';
import { matchService, tournamentService } from '../services/api';
import { Clock, TrendingUp, TrendingDown, Users, User, Trash2, Edit2, Trophy, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tournament } from '../types';

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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                    {filteredMatches.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-dim)' }}>Không tìm thấy trận đấu nào phù hợp.</p>
                        </motion.div>
                    ) : (
                        filteredMatches.map((match, index) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card hover-row history-item-card"
                                style={{ padding: '16px 20px', position: 'relative', opacity: isDeleting === match.id ? 0.5 : 1, borderRadius: '16px' }}
                            >
                                {/* Actions (All matches) */}
                                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => onEdit?.(match)}
                                        style={{
                                            background: 'rgba(0, 242, 255, 0.05)', border: '1px solid hsla(183, 100%, 50%, 0.1)', color: 'var(--primary-neon)', cursor: 'pointer',
                                            padding: '6px 10px', borderRadius: '10px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700
                                        }}
                                    >
                                        <Edit2 size={12} /> Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(match.id)}
                                        disabled={isDeleting !== null}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', color: 'var(--error)', cursor: 'pointer',
                                            padding: '6px 10px', borderRadius: '10px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700
                                        }}
                                    >
                                        <Trash2 size={12} /> Xoá
                                    </button>
                                </div>

                                <div style={{ marginBottom: '12px', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} /> {formatRelativeTime(match.created_at)}
                                    </span>
                                    {match.tournament?.name && (
                                        <span style={{
                                            background: 'rgba(255, 215, 0, 0.1)',
                                            color: 'gold',
                                            border: '1px solid rgba(255, 215, 0, 0.3)',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Trophy size={11} /> {match.tournament.name}
                                        </span>
                                    )}
                                </div>


                                <div className="match-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div className="player-name" style={{ fontWeight: 900, fontSize: '1.15rem', color: match.team1_score > match.team2_score ? 'var(--primary-neon)' : 'white', lineHeight: 1.1 }}>
                                                {match.p1?.name}
                                            </div>
                                            {match.p1b && (
                                                <>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 800, margin: '-2px 0' }}>&</div>
                                                    <div className="player-name" style={{ fontWeight: 900, fontSize: '1.15rem', color: match.team1_score > match.team2_score ? 'var(--primary-neon)' : 'white', lineHeight: 1.1 }}>
                                                        {match.p1b.name}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: match.team1_score > match.team2_score ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            {match.team1_score > match.team2_score ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                            <span style={{ fontWeight: 800 }}>{match.elo_delta_team1 > 0 ? `+${match.elo_delta_team1}` : match.elo_delta_team1}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <div className="score-box" style={{
                                            padding: '8px 18px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                            fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.05em', color: 'white'
                                        }}>
                                            {match.team1_score} - {match.team2_score}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '10px' }}>
                                            {match.type === 'doubles' ? <Users size={12} /> : <User size={12} />} {match.type === 'doubles' ? 'Đôi' : 'Đơn'}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div className="player-name" style={{ fontWeight: 900, fontSize: '1.5rem', color: match.team2_score > match.team1_score ? 'var(--secondary-neon)' : 'white', lineHeight: 1 }}>
                                                {match.p2?.name}
                                            </div>
                                            {match.p2b && (
                                                <>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 800, margin: '-2px 0' }}>&</div>
                                                    <div className="player-name" style={{ fontWeight: 900, fontSize: '1.5rem', color: match.team2_score > match.team1_score ? 'var(--secondary-neon)' : 'white', lineHeight: 1 }}>
                                                        {match.p2b.name}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: match.team2_score > match.team1_score ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {match.team2_score > match.team1_score ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            <span style={{ fontWeight: 800 }}>{match.elo_delta_team2 > 0 ? `+${match.elo_delta_team2}` : match.elo_delta_team2}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <style>{`
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .history-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .history-title {
            font-size: 1.5rem !important;
          }
          .search-wrapper {
            width: 100% !important;
          }
          .search-input-history {
            width: 100% !important;
          }
          .match-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            text-align: center !important;
          }
          .match-grid > div { text-align: center !important; }
          .match-grid > div:nth-child(1) { order: 2; }
          .match-grid > div:nth-child(2) { order: 1; }
          .match-grid > div:nth-child(3) { order: 3; }
          .player-name { font-size: 1.2rem !important; }
          .score-box { padding: 10px 20px !important; font-size: 1.5rem !important; }
          .history-item-card {
            padding: 20px !important;
          }
        }
      `}</style>
        </div>
    );
};
