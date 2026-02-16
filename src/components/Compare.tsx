import React, { useState, useEffect } from 'react';
import { playerService, matchService } from '../services/api';
import type { Player } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Compare: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [p1Id, setP1Id] = useState('');
    const [p2Id, setP2Id] = useState('');
    const [loading, setLoading] = useState(true);
    const [h2hData, setH2HData] = useState<any>(null);

    useEffect(() => {
        playerService.getAllPlayers().then(data => {
            setPlayers(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (p1Id && p2Id) {
            calculateH2H();
        } else {
            setH2HData(null);
        }
    }, [p1Id, p2Id]);

    const calculateH2H = async () => {
        const matches = await matchService.getRecentMatches();
        const mutualMatches = matches.filter(m => {
            const team1 = [m.team1_player1_id, m.team1_player2_id];
            const team2 = [m.team2_player1_id, m.team2_player2_id];
            return (team1.includes(p1Id) && team2.includes(p2Id)) || (team1.includes(p2Id) && team2.includes(p1Id));
        });

        let p1Wins = 0;
        let p2Wins = 0;
        mutualMatches.forEach(m => {
            const t1Won = m.team1_score > m.team2_score;
            const p1InT1 = [m.team1_player1_id, m.team1_player2_id].includes(p1Id);
            if ((p1InT1 && t1Won) || (!p1InT1 && !t1Won)) p1Wins++;
            else p2Wins++;
        });

        setH2HData({
            total: mutualMatches.length,
            p1Wins,
            p2Wins,
            matches: mutualMatches.slice(0, 5)
        });
    };

    if (loading) return <div className="fade-in">Đang tải danh sách người chơi...</div>;

    const player1 = players.find(p => p.id === p1Id);
    const player2 = players.find(p => p.id === p2Id);

    return (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="neon-text heading-font" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Đối Đầu (H2H)</h2>
                <p style={{ color: 'var(--text-dim)' }}>So sánh chỉ số và lịch sử đối đầu giữa hai người chơi</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '32px', borderTop: '8px solid var(--primary-neon)', borderRadius: '32px' }}>
                    <select value={p1Id} onChange={e => setP1Id(e.target.value)} style={{ width: '100%', marginBottom: '20px', borderRadius: '18px' }}>
                        <option value="">Chọn người chơi 1...</option>
                        {players.filter(p => p.id !== p2Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {player1 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--primary-neon)', fontWeight: 900, fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>{player1.elo_rating}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em' }}>CHỈ SỐ ELO</div>
                        </div>
                    )}
                </motion.div>

                <div style={{ color: 'var(--text-dim)', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>VS</div>

                <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '32px', borderTop: '8px solid var(--secondary-neon)', borderRadius: '32px' }}>
                    <select value={p2Id} onChange={e => setP2Id(e.target.value)} style={{ width: '100%', marginBottom: '20px', borderRadius: '18px' }}>
                        <option value="">Chọn người chơi 2...</option>
                        {players.filter(p => p.id !== p1Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {player2 && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--secondary-neon)', fontWeight: 900, fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>{player2.elo_rating}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em' }}>CHỈ SỐ ELO</div>
                        </div>
                    )}
                </motion.div>
            </div>

            <AnimatePresence>
                {h2hData && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="glass-card" style={{ padding: '48px', textAlign: 'center', marginBottom: '40px', borderRadius: '40px' }}>
                            <h3 className="heading-font" style={{ fontSize: '1.6rem', marginBottom: '32px', color: 'var(--accent-cute)' }}>THỐNG KÊ ĐỐI ĐẦU</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
                                <div style={{ flex: 1, textAlign: 'right' }}>
                                    <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary-neon)', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{h2hData.p1Wins}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>BÀN THẮNG</div>
                                </div>
                                <div style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '7px', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ width: `${(h2hData.p1Wins / (h2hData.total || 1)) * 100}%`, background: 'var(--primary-neon)' }} />
                                    <div style={{ width: `${(h2hData.p2Wins / (h2hData.total || 1)) * 100}%`, background: 'var(--secondary-neon)' }} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--secondary-neon)', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{h2hData.p2Wins}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>BÀN THẮNG</div>
                                </div>
                            </div>
                            <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
                                Tổng số {h2hData.total} trận đối đầu
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 className="heading-font" style={{ fontSize: '1.1rem', color: 'var(--text-dim)', marginBottom: '8px' }}>LỊCH SỬ GẦN ĐÂY</h4>
                            {h2hData.matches.map((m: any) => {
                                const p1InT1 = [m.team1_player1_id, m.team1_player2_id].includes(p1Id);
                                const p1Won = (p1InT1 && m.team1_score > m.team2_score) || (!p1InT1 && m.team2_score > m.team1_score);
                                return (
                                    <motion.div whileHover={{ scale: 1.01 }} key={m.id} className="glass-card" style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ padding: '8px', borderRadius: '12px', background: p1Won ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                                {p1Won ? <TrendingUp color="var(--success)" size={20} /> : <TrendingDown color="var(--error)" size={20} />}
                                            </div>
                                            <span style={{ fontWeight: 800, color: p1Won ? 'var(--primary-neon)' : 'var(--secondary-neon)', fontSize: '1rem' }}>
                                                {p1Won ? (player1?.name || 'P1') + ' THẮNG' : (player2?.name || 'P2') + ' THẮNG'}
                                            </span>
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>
                                            {p1InT1 ? `${m.team1_score} - ${m.team2_score}` : `${m.team2_score} - ${m.team1_score}`}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                            {new Date(m.created_at).toLocaleDateString('vi-VN')}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
