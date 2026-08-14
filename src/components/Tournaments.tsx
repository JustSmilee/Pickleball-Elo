import React, { useState, useEffect } from 'react';
import { tournamentService } from '../services/api';
import type { Tournament, TournamentPlayerStats } from '../types';
import { Trophy, Plus, Calendar, CheckCircle2, Circle, X, Medal, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [tLeaderboard, setTLeaderboard] = useState<TournamentPlayerStats[]>([]);
    const [tMatches, setTMatches] = useState<any[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = () => {
        tournamentService.getAllTournaments().then(data => {
            setTournaments(data);
            setLoading(false);
        });
    };

    const handleSelectTournament = async (t: Tournament) => {
        setSelectedTournament(t);
        setLoadingDetail(true);
        try {
            const [board, matches] = await Promise.all([
                tournamentService.getTournamentLeaderboard(t.id),
                tournamentService.getTournamentMatches(t.id)
            ]);
            setTLeaderboard(board);
            setTMatches(matches);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        try {
            await tournamentService.createTournament(newName);
            setNewName('');
            setShowAdd(false);
            fetchTournaments();
        } catch (err) {
            console.error(err);
            alert('Lỗi khi tạo giải đấu.');
        }
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy color="#FFD700" size={20} fill="#FFD700" />;
            case 1: return <Medal color="#C0C0C0" size={20} fill="#C0C0C0" />;
            case 2: return <Medal color="#CD7F32" size={20} fill="#CD7F32" />;
            default: return <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>#{index + 1}</span>;
        }
    };

    if (loading) return <div className="fade-in">Đang tải danh sách giải đấu...</div>;

    return (
        <div className="fade-in tournament-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="tournament-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h2 className="neon-text heading-font tournament-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Giải Đấu</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Quản lý và xem Bảng xếp hạng Elo riêng theo từng giải đấu</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="neon-btn add-tournament-btn" style={{ padding: '14px 28px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Plus size={20} /> Tạo giải mới
                </button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card add-tournament-form" style={{ padding: '32px', marginBottom: '40px', borderRadius: '32px' }}>
                        <form onSubmit={handleCreate} className="tournament-form-inner" style={{ display: 'flex', gap: '16px' }}>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Tên giải đấu (Spring Cup 2024...)"
                                style={{ flex: 1, borderRadius: '20px' }}
                            />
                            <div className="form-buttons" style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" className="neon-btn" style={{ whiteSpace: 'nowrap', borderRadius: '20px' }}>Tạo</button>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0 24px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="tournament-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {tournaments.length === 0 ? (
                    <div className="glass-card" style={{ gridColumn: '1/-1', padding: '80px', textAlign: 'center', borderRadius: '32px' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>Chưa có giải đấu nào được tạo.</p>
                    </div>
                ) : (
                    tournaments.map((t, index) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -4 }}
                            onClick={() => handleSelectTournament(t)}
                            className="glass-card hover-row tournament-card"
                            style={{ padding: '32px', position: 'relative', borderRadius: '32px', cursor: 'pointer' }}
                        >
                            <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                                {t.status === 'active' ? <Circle color="var(--primary-neon)" fill="var(--primary-neon)" size={12} /> : <CheckCircle2 color="var(--success)" size={24} />}
                            </div>
                            <div style={{ padding: '16px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '20px', width: 'fit-content', marginBottom: '20px' }}>
                                <Trophy color="var(--secondary-neon)" size={32} />
                            </div>
                            <h3 className="heading-font tournament-card-title" style={{ fontSize: '1.6rem', marginBottom: '12px' }}>{t.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>
                                <Calendar size={16} /> Bắt đầu: {new Date(t.start_date).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', fontSize: '0.75rem', color: t.status === 'active' ? 'var(--primary-neon)' : 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid var(--glass-border)' }}>
                                    {t.status === 'active' ? 'ĐANG DIỄN RA' : 'ĐÃ KẾT THÚC'}
                                </span>
                                <span style={{ color: 'gold', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Xem Xếp Hạng <ArrowRight size={16} />
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Tournament Detail Modal */}
            <AnimatePresence>
                {selectedTournament && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(10, 12, 20, 0.85)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '750px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '32px',
                                borderRadius: '32px',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setSelectedTournament(null)}
                                style={{
                                    position: 'absolute',
                                    top: '24px',
                                    right: '24px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ padding: '16px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '20px' }}>
                                    <Trophy color="gold" size={36} />
                                </div>
                                <div>
                                    <h2 className="heading-font" style={{ fontSize: '2rem', color: 'gold' }}>{selectedTournament.name}</h2>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Bảng xếp hạng Elo và lịch sử các trận đấu thuộc giải đấu này</p>
                                </div>
                            </div>

                            {loadingDetail ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải dữ liệu giải đấu...</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* Leaderboard Section */}
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                                            🏆 Bảng Xếp Hạng Elo Giải Đấu ({tLeaderboard.length} VĐV)
                                        </h3>
                                        {tLeaderboard.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '20px' }}>
                                                Chưa có trận đấu nào được ghi nhận cho giải này.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {tLeaderboard.map((player, idx) => (
                                                    <div
                                                        key={player.playerId}
                                                        style={{
                                                            padding: '14px 20px',
                                                            background: idx < 3 ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255,255,255,0.02)',
                                                            border: idx === 0 ? '1px solid gold' : '1px solid var(--glass-border)',
                                                            borderRadius: '18px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                            <div style={{ width: '28px', textAlign: 'center' }}>
                                                                {getRankIcon(idx)}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                                                                    {player.name}
                                                                    {player.user_ad && <span style={{ fontSize: '0.75rem', color: 'var(--primary-neon)', marginLeft: '6px' }}>@{player.user_ad}</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                                                    {player.matches_played} trận | {player.wins} thắng - {player.losses} thua
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'gold', fontFamily: 'var(--font-heading)' }}>
                                                                {player.elo_rating}
                                                            </div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Tournament Elo</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Matches Section */}
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                                            <Clock size={20} color="var(--primary-neon)" /> Trận Đấu Trong Giải ({tMatches.length})
                                        </h3>
                                        {tMatches.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '20px' }}>
                                                Chưa có trận đấu nào.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {tMatches.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        style={{
                                                            padding: '16px 20px',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            border: '1px solid var(--glass-border)',
                                                            borderRadius: '18px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div style={{ flex: 1, textAlign: 'right', fontWeight: 800, color: m.team1_score > m.team2_score ? 'gold' : 'white' }}>
                                                            {m.p1?.name} {m.p1b ? `& ${m.p1b.name}` : ''}
                                                        </div>
                                                        <div style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>
                                                            {m.team1_score} - {m.team2_score}
                                                        </div>
                                                        <div style={{ flex: 1, textAlign: 'left', fontWeight: 800, color: m.team2_score > m.team1_score ? 'gold' : 'white' }}>
                                                            {m.p2?.name} {m.p2b ? `& ${m.p2b.name}` : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @media (max-width: 768px) {
                    .tournament-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 20px;
                    }
                    .tournament-title { font-size: 2rem !important; }
                    .add-tournament-btn { width: 100%; justify-content: center; }
                    
                    .tournament-form-inner {
                        flex-direction: column;
                    }
                    .form-buttons {
                        width: 100%;
                    }
                    .form-buttons button {
                        flex: 1;
                        padding: 14px 0 !important;
                    }
                    
                    .tournament-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .tournament-card { padding: 24px !important; }
                    .tournament-card-title { font-size: 1.4rem !important; }
                }
            `}</style>
        </div>
    );
};

