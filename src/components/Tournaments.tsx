import React, { useState, useEffect } from 'react';
import { tournamentService } from '../services/api';
import type { Tournament } from '../types';
import { Trophy, Plus, Calendar, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = () => {
        tournamentService.getAllTournaments().then(data => {
            setTournaments(data);
            setLoading(false);
        });
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

    if (loading) return <div className="fade-in">Đang tải danh sách giải đấu...</div>;

    return (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h2 className="neon-text heading-font" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Giải Đấu</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Quản lý và theo dõi các giải đấu Pickleball</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="neon-btn" style={{ padding: '14px 28px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Plus size={20} /> Tạo giải mới
                </button>
            </div>

            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ padding: '32px', marginBottom: '40px', borderRadius: '32px' }}>
                        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '16px' }}>
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Tên giải đấu (Spring Cup 2024...)"
                                style={{ flex: 1, borderRadius: '20px' }}
                            />
                            <button type="submit" className="neon-btn" style={{ whiteSpace: 'nowrap', borderRadius: '20px' }}>Tạo giải</button>
                            <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0 24px', borderRadius: '20px', fontWeight: 600, cursor: 'pointer' }}>Hủy</button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
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
                            className="glass-card hover-row"
                            style={{ padding: '32px', position: 'relative', borderRadius: '32px' }}
                        >
                            <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                                {t.status === 'active' ? <Circle color="var(--primary-neon)" fill="var(--primary-neon)" size={12} /> : <CheckCircle2 color="var(--success)" size={24} />}
                            </div>
                            <div style={{ padding: '16px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '20px', width: 'fit-content', marginBottom: '20px' }}>
                                <Trophy color="var(--secondary-neon)" size={32} />
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.6rem', marginBottom: '12px' }}>{t.name}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>
                                <Calendar size={16} /> Bắt đầu: {new Date(t.start_date).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ marginTop: '24px', padding: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', fontSize: '0.8rem', color: t.status === 'active' ? 'var(--primary-neon)' : 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center', border: '1px solid var(--glass-border)' }}>
                                {t.status === 'active' ? 'ĐANG DIỄN RA' : 'ĐÃ KẾT THÚC'}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};
