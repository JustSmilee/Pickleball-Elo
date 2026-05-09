import React, { useState, useEffect } from 'react';
import { matchService } from '../services/api';
import { Clock, TrendingUp, TrendingDown, Users, User, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryProps {
    onEdit?: (match: any) => void;
}

export const History: React.FC<HistoryProps> = ({ onEdit }) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMatches = () => {
        matchService.getRecentMatches().then(data => {
            setMatches(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const filteredMatches = matches.filter(match => {
        const query = searchQuery.toLowerCase();
        return (
            match.p1?.name.toLowerCase().includes(query) ||
            match.p1b?.name.toLowerCase().includes(query) ||
            match.p2?.name.toLowerCase().includes(query) ||
            match.p2b?.name.toLowerCase().includes(query) ||
            match.p1?.user_ad?.toLowerCase().includes(query) ||
            match.p1b?.user_ad?.toLowerCase().includes(query) ||
            match.p2?.user_ad?.toLowerCase().includes(query) ||
            match.p2b?.user_ad?.toLowerCase().includes(query)
        );
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="neon-text heading-font" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock color="var(--primary-neon)" /> Lịch sử trận đấu
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm vận động viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                background: '#1e2337',
                                border: '2px solid var(--primary-neon)',
                                color: 'white',
                                padding: '12px 16px 12px 44px',
                                borderRadius: '24px',
                                fontSize: '1rem',
                                width: '300px',
                                transition: 'all 0.3s',
                                outline: 'none',
                                boxShadow: '0 0 15px rgba(0, 242, 255, 0.1)'
                            }}
                        />
                        <Users size={18} color="var(--primary-neon)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px' }}>
                        {filteredMatches.length} Trận đấu
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <AnimatePresence>
                    {filteredMatches.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
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
                                className="glass-card hover-row"
                                style={{ padding: '28px', position: 'relative', opacity: isDeleting === match.id ? 0.5 : 1, borderRadius: '28px' }}
                            >
                                {/* Actions (All matches) */}
                                <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => onEdit?.(match)}
                                        style={{
                                            background: 'rgba(0, 242, 255, 0.05)', border: '1px solid hsla(183, 100%, 50%, 0.1)', color: 'var(--primary-neon)', cursor: 'pointer',
                                            padding: '8px 12px', borderRadius: '12px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700
                                        }}
                                    >
                                        <Edit2 size={14} /> Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(match.id)}
                                        disabled={isDeleting !== null}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', color: 'var(--error)', cursor: 'pointer',
                                            padding: '8px 12px', borderRadius: '12px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700
                                        }}
                                    >
                                        <Trash2 size={14} /> Xoá
                                    </button>
                                </div>

                                <div style={{ marginBottom: '20px', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={14} /> {formatRelativeTime(match.created_at)}
                                </div>

                                <div className="match-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '24px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div className="player-name" style={{ fontWeight: 900, fontSize: '1.5rem', color: match.team1_score > match.team2_score ? 'var(--primary-neon)' : 'white', lineHeight: 1 }}>
                                                {match.p1?.name}
                                            </div>
                                            {match.p1b && (
                                                <>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 800, margin: '-2px 0' }}>&</div>
                                                    <div className="player-name" style={{ fontWeight: 900, fontSize: '1.5rem', color: match.team1_score > match.team2_score ? 'var(--primary-neon)' : 'white', lineHeight: 1 }}>
                                                        {match.p1b.name}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: match.team1_score > match.team2_score ? 'var(--success)' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                            {match.team1_score > match.team2_score ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            <span style={{ fontWeight: 800 }}>{match.elo_delta_team1 > 0 ? `+${match.elo_delta_team1}` : match.elo_delta_team1}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <div className="score-box" style={{
                                            padding: '14px 28px', borderRadius: '22px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                            fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.05em', color: 'white'
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
        @media (max-width: 768px) {
          .match-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            text-align: center !important;
          }
          .match-grid > div { text-align: center !important; }
          .match-grid > div:nth-child(1) { order: 2; }
          .match-grid > div:nth-child(2) { order: 1; }
          .match-grid > div:nth-child(3) { order: 3; }
          .player-name { fontSize: 1.2rem !important; }
          .score-box { padding: 10px 20px !important; font-size: 1.5rem !important; }
        }
      `}</style>
        </div>
    );
};
    );
};
