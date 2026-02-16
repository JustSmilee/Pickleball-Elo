import React, { useState, useEffect } from 'react';
import { playerService } from '../services/api';
import type { Player } from '../types';
import { Trophy, Medal, Star, User, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardProps {
    onViewProfile?: (player: Player) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onViewProfile }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        playerService.getAllPlayers().then(data => {
            setPlayers(data);
            setLoading(false);
        });
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy color="#FFD700" size={24} fill="#FFD700" />;
            case 1: return <Medal color="#C0C0C0" size={24} fill="#C0C0C0" />;
            case 2: return <Medal color="#CD7F32" size={24} fill="#CD7F32" />;
            default: return <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>#{index + 1}</span>;
        }
    };

    if (loading) return <div className="fade-in">Đang tải bảng xếp hạng...</div>;

    return (
        <div className="fade-in glass-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="neon-text heading-font" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Star color="var(--primary-neon)" fill="var(--primary-neon)" /> Bảng xếp hạng
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px' }}>
                    {players.length} Người chơi
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {players.map((player, index) => (
                    <motion.div
                        key={player.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="glass-card hover-row"
                        style={{
                            padding: '20px 24px',
                            display: 'grid',
                            gridTemplateColumns: '60px 1fr 100px 140px 80px',
                            alignItems: 'center',
                            background: index < 3 ? 'hsla(var(--primary-neon-h), 100%, 50%, 0.03)' : 'transparent',
                            borderRadius: '24px',
                            border: index === 0 ? '2px solid gold' : '1px solid var(--glass-border)',
                            overflow: 'hidden',
                            gap: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '1.2rem' }}>
                            {getRankIcon(index)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                flexShrink: 0,
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <User size={24} color="var(--primary-neon)" />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--primary-neon)', fontWeight: 900, fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>
                                {player.elo_rating}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Elo Rating</div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', textAlign: 'right' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{player.matches_played || 0}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>Trận</div>
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>
                                    {player.matches_played ? Math.round((player.wins / player.matches_played) * 100) : 0}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>Thắng</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => onViewProfile?.(player)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <BarChart2 size={20} color="var(--primary-neon)" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style>{`
        @media (max-width: 600px) {
          .glass-card { 
            grid-template-columns: 40px 1fr 80px 40px !important;
          }
          div:nth-child(4) { display: none !important; }
        }
      `}</style>
        </div>
    );
};
