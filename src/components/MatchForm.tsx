import React, { useState, useEffect } from 'react';
import { playerService, matchService, tournamentService } from '../services/api';
import { calculateEloDelta } from '../utils/elo';
import type { Player } from '../types';
import { Users, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface MatchFormProps {
    onSuccess: () => void;
    onCancel?: () => void;
    editingMatch?: any;
}

export const MatchForm: React.FC<MatchFormProps> = ({ onSuccess, onCancel, editingMatch }) => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');

    const [p1, setP1] = useState('');
    const [p1b, setP1b] = useState('');
    const [p2, setP2] = useState('');
    const [p2b, setP2b] = useState('');
    const [s1, setS1] = useState<number | ''>('');
    const [s2, setS2] = useState<number | ''>('');
    const [tournamentId, setTournamentId] = useState('');

    useEffect(() => {
        Promise.all([
            playerService.getAllPlayers(),
            tournamentService.getAllTournaments()
        ]).then(([playersData, tournamentsData]) => {
            setPlayers(playersData);
            setTournaments(tournamentsData);
            setLoading(false);
        });

        if (editingMatch) {
            setMatchType(editingMatch.type);
            setP1(editingMatch.team1_player1_id);
            setP1b(editingMatch.team1_player2_id || '');
            setP2(editingMatch.team2_player1_id);
            setP2b(editingMatch.team2_player2_id || '');
            setS1(editingMatch.team1_score);
            setS2(editingMatch.team2_score);
            setTournamentId(editingMatch.tournament_id || '');
        }
    }, [editingMatch]);

    const getAvailablePlayers = (currentId: string) => {
        const selectedIds = [p1, p1b, p2, p2b].filter(id => id && id !== currentId);
        return players.filter(p => !selectedIds.includes(p.id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (s1 === '' || s2 === '') return alert('Vui lòng nhập tỷ số');

        const selectedIds = [p1, p2];
        if (matchType === 'doubles') selectedIds.push(p1b, p2b);

        if (selectedIds.some(id => !id)) return alert('Vui lòng chọn đầy đủ người chơi');

        setSubmitting(true);
        try {
            // 1. If editing, delete the old match first (reverses Elo)
            if (editingMatch) {
                await matchService.deleteMatch(editingMatch.id);
                // We need the FRESH ratings of players after deletion to calculate the NEW delta correctly.
                // Let's refetch players.
                const freshPlayers = await playerService.getAllPlayers();

                let delta = 0;
                if (matchType === 'singles') {
                    const player1 = freshPlayers.find(p => p.id === p1)!;
                    const player2 = freshPlayers.find(p => p.id === p2)!;
                    delta = calculateEloDelta(player1.elo_rating, player2.elo_rating, Number(s1), Number(s2));
                    await playerService.updatePlayerRating(p1, player1.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p2, player2.elo_rating - delta, Number(s2) > Number(s1));
                } else {
                    const player1a = freshPlayers.find(p => p.id === p1)!;
                    const player1b_data = freshPlayers.find(p => p.id === p1b)!;
                    const player2a = freshPlayers.find(p => p.id === p2)!;
                    const player2b_data = freshPlayers.find(p => p.id === p2b)!;
                    const team1Avg = (player1a.elo_rating + player1b_data.elo_rating) / 2;
                    const team2Avg = (player2a.elo_rating + player2b_data.elo_rating) / 2;
                    delta = calculateEloDelta(team1Avg, team2Avg, Number(s1), Number(s2));
                    await playerService.updatePlayerRating(p1, player1a.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p1b, player1b_data.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p2, player2a.elo_rating - delta, Number(s2) > Number(s1));
                    await playerService.updatePlayerRating(p2b, player2b_data.elo_rating - delta, Number(s2) > Number(s1));
                }

                await matchService.recordMatch({
                    type: matchType,
                    team1_player1_id: p1,
                    team1_player2_id: matchType === 'doubles' ? p1b : undefined,
                    team2_player1_id: p2,
                    team2_player2_id: matchType === 'doubles' ? p2b : undefined,
                    team1_score: Number(s1),
                    team2_score: Number(s2),
                    elo_delta_team1: delta,
                    elo_delta_team2: -delta,
                    tournament_id: tournamentId || undefined
                });
            } else {
                // Standard recording
                let delta = 0;
                if (matchType === 'singles') {
                    const player1 = players.find(p => p.id === p1)!;
                    const player2 = players.find(p => p.id === p2)!;
                    delta = calculateEloDelta(player1.elo_rating, player2.elo_rating, Number(s1), Number(s2));
                    await playerService.updatePlayerRating(p1, player1.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p2, player2.elo_rating - delta, Number(s2) > Number(s1));
                } else {
                    const player1a = players.find(p => p.id === p1)!;
                    const player1b_data = players.find(p => p.id === p1b)!;
                    const player2a = players.find(p => p.id === p2)!;
                    const player2b_data = players.find(p => p.id === p2b)!;
                    const team1Avg = (player1a.elo_rating + player1b_data.elo_rating) / 2;
                    const team2Avg = (player2a.elo_rating + player2b_data.elo_rating) / 2;
                    delta = calculateEloDelta(team1Avg, team2Avg, Number(s1), Number(s2));
                    await playerService.updatePlayerRating(p1, player1a.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p1b, player1b_data.elo_rating + delta, Number(s1) > Number(s2));
                    await playerService.updatePlayerRating(p2, player2a.elo_rating - delta, Number(s2) > Number(s1));
                    await playerService.updatePlayerRating(p2b, player2b_data.elo_rating - delta, Number(s2) > Number(s1));
                }

                await matchService.recordMatch({
                    type: matchType,
                    team1_player1_id: p1,
                    team1_player2_id: matchType === 'doubles' ? p1b : undefined,
                    team2_player1_id: p2,
                    team2_player2_id: matchType === 'doubles' ? p2b : undefined,
                    team1_score: Number(s1),
                    team2_score: Number(s2),
                    elo_delta_team1: delta,
                    elo_delta_team2: -delta,
                    tournament_id: tournamentId || undefined
                });
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Lỗi khi ghi nhận trận đấu.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="fade-in">Đang tải thông tin...</div>;

    return (
        <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative' }}>
                {editingMatch && (
                    <button
                        onClick={onCancel}
                        style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                )}
                <h2 className="neon-text heading-font" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    {editingMatch ? 'Chỉnh sửa kết quả' : 'Ghi nhận kết quả'}
                </h2>
                <p style={{ color: 'var(--text-dim)' }}>
                    {editingMatch ? 'Đang chỉnh sửa trận đấu cũ, điểm Elo sẽ được cập nhật lại.' : 'Nhập tỷ số để cập nhật bảng xếp hạng Elo'}
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                        {['singles', 'doubles'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                disabled={!!editingMatch}
                                onClick={() => { setMatchType(type as any); setP1b(''); setP2b(''); }}
                                style={{
                                    padding: '12px 28px', borderRadius: '18px', border: 'none', fontSize: '0.85rem',
                                    background: matchType === type ? 'var(--primary-neon)' : 'transparent',
                                    color: matchType === type ? '#000' : 'white',
                                    fontWeight: 800, cursor: !!editingMatch ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease', textTransform: 'uppercase', opacity: !!editingMatch && matchType !== type ? 0.3 : 1,
                                    fontFamily: 'var(--font-cute)'
                                }}
                            >
                                {type === 'singles' ? 'Đơn' : 'Đôi'}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: '100%', maxWidth: '400px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', textAlign: 'center', fontWeight: 600 }}>Gắn vào Giải đấu (Tùy chọn)</label>
                        <select value={tournamentId} onChange={e => setTournamentId(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '18px' }}>
                            <option value="">Không có / Trận giao hữu</option>
                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    {/* Team 1 */}
                    <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '32px', borderTop: '8px solid var(--primary-neon)', borderRadius: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ padding: '12px', background: 'hsla(var(--primary-neon-h), 100%, 50%, 0.1)', borderRadius: '18px' }}>
                                <Users color="var(--primary-neon)" size={28} />
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.6rem' }}>Team A</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Người chơi 1</label>
                                <select value={p1} onChange={e => setP1(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                                    <option value="">Chọn người chơi...</option>
                                    {getAvailablePlayers(p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {matchType === 'doubles' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Người chơi 2</label>
                                    <select value={p1b} onChange={e => setP1b(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                                        <option value="">Chọn người chơi...</option>
                                        {getAvailablePlayers(p1b).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </motion.div>
                            )}
                            <div style={{ marginTop: '12px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Số điểm</label>
                                <input type="number" value={s1} onChange={e => setS1(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0"
                                    style={{ width: '100%', fontSize: '2.5rem', height: '90px', textAlign: 'center', fontWeight: 900, fontFamily: 'var(--font-heading)', border: '2px solid hsla(var(--primary-neon-h), 100%, 50%, 0.2)', borderRadius: '24px' }}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Team 2 */}
                    <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '32px', borderTop: '8px solid var(--secondary-neon)', borderRadius: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ padding: '12px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '18px' }}>
                                <Users color="var(--secondary-neon)" size={28} />
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.6rem' }}>Team B</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Người chơi 1</label>
                                <select value={p2} onChange={e => setP2(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                                    <option value="">Chọn người chơi...</option>
                                    {getAvailablePlayers(p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {matchType === 'doubles' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Người chơi 2</label>
                                    <select value={p2b} onChange={e => setP2b(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                                        <option value="">Chọn người chơi...</option>
                                        {getAvailablePlayers(p2b).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </motion.div>
                            )}
                            <div style={{ marginTop: '12px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Số điểm</label>
                                <input type="number" value={s2} onChange={e => setS2(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0"
                                    style={{ width: '100%', fontSize: '2.5rem', height: '90px', textAlign: 'center', fontWeight: 900, fontFamily: 'var(--font-heading)', border: '2px solid hsla(var(--secondary-neon-h), 100%, 50%, 0.2)', borderRadius: '24px' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

                <button type="submit" disabled={submitting} className="neon-btn" style={{ height: '72px', fontSize: '1.2rem', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: submitting ? 0.5 : 1, borderRadius: '24px' }}>
                    {submitting ? 'Đang lưu...' : editingMatch ? 'Cập nhật trận đấu' : 'Lưu kết quả & tính điểm'} <ArrowRight size={24} />
                </button>
            </form>
        </div>
    );
};
