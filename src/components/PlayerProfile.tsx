import React, { useState, useEffect } from 'react';
import { playerService } from '../services/api';
import type { Player } from '../types';
import { X, TrendingUp, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface PlayerProfileProps {
    player: Player;
    onClose: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onClose }) => {
    const [trend, setTrend] = useState<{ date: string, elo: number }[]>([]);

    useEffect(() => {
        playerService.getPlayerEloTrend(player.id).then(data => {
            setTrend(data);
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
                padding: '20px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '48px', position: 'relative', borderRadius: '48px', border: 'none' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '10px', borderRadius: '14px' }}>
                    <X size={24} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '48px', marginBottom: '40px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                            <div style={{ width: '100px', height: '100px', borderRadius: '32px', background: 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--bg-dark)' }}>{player.name[0].toUpperCase()}</span>
                            </div>
                            <div>
                                <h2 className="heading-font" style={{ fontSize: '3rem', marginBottom: '4px', lineHeight: 1 }}>{player.name}</h2>
                                <div style={{ color: 'var(--primary-neon)', fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-heading)', marginTop: '8px' }}>{player.elo_rating} ELO</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="glass-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    <Award size={16} /> TỈ LỆ THẮNG
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)', fontFamily: 'var(--font-heading)' }}>
                                    {player.matches_played ? Math.round((player.wins / player.matches_played) * 100) : 0}%
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    <Target size={16} /> TRẬN ĐẤU
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', fontFamily: 'var(--font-heading)' }}>{player.matches_played}</div>
                            </div>
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

                <div className="glass-card" style={{ padding: '32px', background: 'hsla(var(--primary-neon-h), 100%, 50%, 0.05)', border: 'none', borderRadius: '24px' }}>
                    <p style={{ color: 'var(--text-dim)', fontSize: '1rem', textAlign: 'center', fontWeight: 500 }}>
                        Điểm Elo được tính toán dựa trên sức mạnh của đối thủ và kết quả trận đấu.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};
