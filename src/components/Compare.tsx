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

        const player1 = players.find(p => p.id === p1Id);
        const player2 = players.find(p => p.id === p2Id);
        let winProb = 0.5;
        if (player1 && player2) {
            winProb = 1 / (1 + Math.pow(10, (player2.elo_rating - player1.elo_rating) / 400));
        }

        setH2HData({
            total: mutualMatches.length,
            p1Wins,
            p2Wins,
            winProb,
            matches: mutualMatches.slice(0, 5)
        });
    };

    if (loading) return <div className="fade-in">Đang tải danh sách người chơi...</div>;

    const player1 = players.find(p => p.id === p1Id);
    const player2 = players.find(p => p.id === p2Id);

    return (
        <div className="fade-in compare-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="neon-text heading-font compare-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Đối Đầu (H2H)</h2>
                <p style={{ color: 'var(--text-dim)' }}>So sánh chỉ số và lịch sử đối đầu giữa hai người chơi</p>
            </div>

            <div className="compare-selection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                <motion.div whileHover={{ y: -5 }} className="glass-card compare-card p1" style={{ padding: '32px', borderTop: '8px solid var(--primary-neon)', borderRadius: '32px' }}>
                    <select value={p1Id} onChange={e => setP1Id(e.target.value)} style={{ width: '100%', marginBottom: '20px', borderRadius: '18px' }}>
                        <option value="">Chọn người chơi 1...</option>
                        {players.filter(p => p.id !== p2Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {player1 && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="elo-value" style={{ color: 'var(--primary-neon)', fontWeight: 900, fontSize: '2.5rem' }}>{player1.elo_rating}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em' }}>CHỈ SỐ ELO</div>
                        </div>
                    )}
                </motion.div>

                <div className="vs-divider" style={{ color: 'var(--text-dim)', fontWeight: 900, fontSize: '1.5rem' }}>VS</div>

                <motion.div whileHover={{ y: -5 }} className="glass-card compare-card p2" style={{ padding: '32px', borderTop: '8px solid var(--secondary-neon)', borderRadius: '32px' }}>
                    <select value={p2Id} onChange={e => setP2Id(e.target.value)} style={{ width: '100%', marginBottom: '20px', borderRadius: '18px' }}>
                        <option value="">Chọn người chơi 2...</option>
                        {players.filter(p => p.id !== p1Id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {player2 && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="elo-value" style={{ color: 'var(--secondary-neon)', fontWeight: 900, fontSize: '2.5rem' }}>{player2.elo_rating}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.1em' }}>CHỈ SỐ ELO</div>
                        </div>
                    )}
                </motion.div>
            </div>

            <AnimatePresence>
                {h2hData && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="glass-card h2h-stats-card" style={{ padding: '48px', textAlign: 'center', marginBottom: '40px', borderRadius: '40px' }}>
                            <h3 style={{ fontSize: '1.6rem', marginBottom: '32px', color: 'var(--accent-cute)', fontWeight: 900 }}>THỐNG KÊ ĐỐI ĐẦU</h3>
                            <div className="h2h-wins-flex" style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
                                <div style={{ flex: 1, textAlign: 'right' }}>
                                    <div className="win-count" style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary-neon)', lineHeight: 1 }}>{h2hData.p1Wins}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>BÀN THẮNG</div>
                                </div>
                                <div className="win-progress-bar" style={{ width: '120px', height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '7px', overflow: 'hidden', display: 'flex', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ width: `${(h2hData.p1Wins / (h2hData.total || 1)) * 100}%`, background: 'var(--primary-neon)' }} />
                                    <div style={{ width: `${(h2hData.p2Wins / (h2hData.total || 1)) * 100}%`, background: 'var(--secondary-neon)' }} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div className="win-count" style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--secondary-neon)', lineHeight: 1 }}>{h2hData.p2Wins}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 700 }}>BÀN THẮNG</div>
                                </div>
                            </div>
                            <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 600 }}>
                                Tổng số {h2hData.total} trận đối đầu
                            </div>

                            <div style={{ marginTop: '48px' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', color: 'var(--primary-neon)', fontWeight: 900 }}>DỰ BÁO CHIẾN THẮNG (DỰA TRÊN ELO)</h3>
                                <div className="prob-flex" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1, textAlign: 'right', fontWeight: 900, fontSize: '1.2rem' }}>{Math.round(h2hData.winProb * 100)}%</div>
                                    <div className="prob-bar-container" style={{ width: '200px', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${h2hData.winProb * 100}%`, background: 'linear-gradient(90deg, var(--primary-neon), var(--secondary-neon))' }} />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left', fontWeight: 900, fontSize: '1.2rem' }}>{Math.round((1 - h2hData.winProb) * 100)}%</div>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Xác suất thắng dựa trên sự chênh lệch trình độ hiện tại</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h4 style={{ fontSize: '1.1rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 800 }}>LỊCH SỬ GẦN ĐÂY</h4>
                            {h2hData.matches.map((m: any) => {
                                const p1InT1 = [m.team1_player1_id, m.team1_player2_id].includes(p1Id);
                                const p1Won = (p1InT1 && m.team1_score > m.team2_score) || (!p1InT1 && m.team2_score > m.team1_score);
                                return (
                                    <motion.div whileHover={{ scale: 1.01 }} key={m.id} className="glass-card history-item" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px' }}>
                                        <div className="h-player p1" style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                            <div style={{ padding: '8px', borderRadius: '12px', background: p1Won ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', flexShrink: 0 }}>
                                                {p1Won ? <TrendingUp color="var(--success)" size={20} /> : <TrendingDown color="var(--error)" size={20} />}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontWeight: 900, color: p1Won ? 'var(--primary-neon)' : 'white', fontSize: '1.1rem', lineHeight: 1.1 }}>
                                                    {p1InT1 ? m.p1?.name : m.p2?.name}
                                                </div>
                                                {(p1InT1 ? m.p1b : m.p2b) && (
                                                    <div style={{ fontWeight: 900, color: p1Won ? 'var(--primary-neon)' : 'white', fontSize: '1.1rem', lineHeight: 1.1 }}>
                                                        {p1InT1 ? m.p1b.name : m.p2b.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-score" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white' }}>
                                                {p1InT1 ? `${m.team1_score} - ${m.team2_score}` : `${m.team2_score} - ${m.team1_score}`}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                                                {new Date(m.created_at).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>

                                        <div className="h-player p2" style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', flex: 1 }}>
                                            <div style={{ fontWeight: 900, color: !p1Won ? 'var(--secondary-neon)' : 'white', fontSize: '1.1rem', lineHeight: 1.1 }}>
                                                {p1InT1 ? m.p2?.name : m.p1?.name}
                                            </div>
                                            {(p1InT1 ? m.p2b : m.p1b) && (
                                                <div style={{ fontWeight: 900, color: !p1Won ? 'var(--secondary-neon)' : 'white', fontSize: '1.1rem', lineHeight: 1.1 }}>
                                                    {p1InT1 ? m.p2b.name : m.p1b.name}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @media (max-width: 768px) {
                    .compare-container { padding-bottom: 40px; }
                    .compare-title { font-size: 1.8rem !important; }
                    .compare-selection-grid { 
                        grid-template-columns: 1fr !important; 
                        gap: 12px !important;
                    }
                    .vs-divider { 
                        text-align: center;
                        margin: 10px 0;
                        font-size: 1.2rem !important;
                    }
                    .compare-card { padding: 24px !important; }
                    .elo-value { font-size: 2rem !important; }
                    
                    .h2h-stats-card { padding: 24px 16px !important; }
                    .h2h-wins-flex { 
                        gap: 12px !important; 
                        margin-bottom: 20px !important;
                    }
                    .win-count { font-size: 2.5rem !important; }
                    .win-progress-bar { width: 80px !important; height: 10px !important; }
                    
                    .prob-bar-container { width: 100px !important; }
                    
                    .history-item { 
                        padding: 16px !important;
                        gap: 10px !important;
                    }
                    .h-player { gap: 10px !important; }
                    .h-player div { font-size: 0.95rem !important; }
                    .h-score div:first-child { font-size: 1.3rem !important; }
                }

                @media (max-width: 480px) {
                    .h2h-wins-flex {
                        flex-direction: row !important;
                        justify-content: space-between !important;
                    }
                    .win-progress-bar { display: none !important; }
                    .history-item {
                        flex-direction: column !important;
                        text-align: center !important;
                    }
                    .h-player.p2 { text-align: center !important; }
                    .h-score { order: -1; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; width: 100%; }
                }
            `}</style>
        </div>
    );
};
