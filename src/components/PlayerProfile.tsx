import React, { useState, useEffect } from 'react';
import { matchService, playerService } from '../services/api';
import type { Player } from '../types';
import { X, TrendingUp, Target, Award, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface PlayerProfileProps {
    player: Player;
    onClose: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onClose }) => {
    const [trend, setTrend] = useState<{ date: string, elo: number }[]>([]);
    const [streak, setStreak] = useState(0);
    const [matches, setMatches] = useState<any[]>([]);
    const [bestPartner, setBestPartner] = useState<{ partner: Player; wins: number; total: number; winRate: number } | null>(null);

    useEffect(() => {
        playerService.getPlayerEloTrend(player.id).then(data => {
            setTrend(data);
        });
        playerService.calculateWinStreak(player.id).then(s => {
            setStreak(s);
        });
        playerService.getBestPartner(player.id).then(bp => {
            setBestPartner(bp);
        });
        matchService.getPlayerMatches(player.id).then(m => {
            setMatches(m);
        });
    }, [player.id]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                padding: '16px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative', borderRadius: '28px', border: 'none' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '12px' }}>
                    <X size={20} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px', marginBottom: '32px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', flexShrink: 0 }}>
                                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--bg-dark)' }}>{player.name[0].toUpperCase()}</span>
                            </div>
                            <div>
                                <h2 className="heading-font" style={{ fontSize: '2rem', marginBottom: '2px', lineHeight: 1 }}>{player.name}</h2>
                                {player.user_ad && (
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                                        MBBANK: @{player.user_ad}
                                    </div>
                                )}
                                <div style={{ color: 'var(--primary-neon)', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>{player.elo_rating} ELO</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.7rem', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    <Award size={14} /> TỈ LỆ THẮNG
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-heading)' }}>
                                    {player.matches_played ? Math.round((player.wins / player.matches_played) * 100) : 0}%
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.7rem', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    <Target size={14} /> TRẬN ĐẤU
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-heading)' }}>{player.matches_played}</div>
                            </div>
                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', gridColumn: 'span 2' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.7rem', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    🔥 CHUỖI THẮNG HIỆN TẠI
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FF4500', fontFamily: 'var(--font-heading)' }}>{streak} TRẬN</div>
                            </div>

                            {/* Best Doubles Partner Card */}
                            {bestPartner && (
                                <div className="glass-card" style={{
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(255, 138, 180, 0.05))',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255, 215, 0, 0.3)',
                                    gridColumn: 'span 2'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'gold', fontSize: '0.7rem', marginBottom: '8px', fontWeight: 800, letterSpacing: '0.05em' }}>
                                        <Award size={14} /> 🤝 CẠ ĐÁNH ĐÔI ĂN Ý NHẤT
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>
                                                {bestPartner.partner.name}
                                                {bestPartner.partner.user_ad && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-neon)', marginLeft: '6px', fontWeight: 700 }}>
                                                        @{bestPartner.partner.user_ad}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                Thắng {bestPartner.wins}/{bestPartner.total} trận đánh đôi cùng nhau
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'gold', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                                            {bestPartner.winRate}%
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '32px', border: '1px solid var(--glass-border)' }}>
                        <h3 className="heading-font" style={{ fontSize: '1.3rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={20} color="var(--primary-neon)" /> XU HƯỚNG ELO
                        </h3>
                        <div style={{ width: '100%', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--card-bg)', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: 'var(--primary-neon)', fontWeight: 800 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="elo"
                                        stroke="var(--primary-neon)"
                                        strokeWidth={5}
                                        dot={false}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '48px' }}>
                    <h3 className="heading-font" style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={24} color="var(--primary-neon)" /> LỊCH SỬ TRẬN ĐẤU GẦN ĐÂY
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {matches.length === 0 ? (
                            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                                Chưa có lịch sử trận đấu.
                            </div>
                        ) : (
                            matches.map((match: any) => {
                                const isTeam1 = [match.team1_player1_id, match.team1_player2_id].includes(player.id);
                                const won = (isTeam1 && match.team1_score > match.team2_score) || (!isTeam1 && match.team2_score > match.team1_score);
                                const delta = isTeam1 ? match.elo_delta_team1 : match.elo_delta_team2;

                                return (
                                    <div key={match.id} className="glass-card" style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                background: won ? 'var(--success)' : 'var(--error)',
                                                boxShadow: won ? '0 0 10px var(--success)' : '0 0 10px var(--error)'
                                            }} />
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                                                    {isTeam1 ? `${match.p2.name}${match.p2b ? ' & ' + match.p2b.name : ''}` : `${match.p1.name}${match.p1b ? ' & ' + match.p1b.name : ''}`}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                                                    {new Date(match.created_at).toLocaleDateString()} • {match.type === 'doubles' ? 'ĐÔI' : 'ĐƠN'}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, fontSize: '1.2rem', color: won ? 'var(--success)' : 'var(--error)' }}>
                                                {won ? '+' : ''}{delta}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>
                                                {match.team1_score} - {match.team2_score}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
