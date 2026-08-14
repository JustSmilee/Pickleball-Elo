import React, { useState, useEffect } from 'react';
import { playerService, matchService, tournamentService } from '../services/api';
import { calculateEloDelta } from '../utils/elo';
import type { Player } from '../types';
import { Users, ArrowRight, X, Trophy, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [matchType, setMatchType] = useState<'singles' | 'doubles'>('doubles');

    const [p1, setP1] = useState('');
    const [p1b, setP1b] = useState('');
    const [p2, setP2] = useState('');
    const [p2b, setP2b] = useState('');
    const [s1, setS1] = useState<number | ''>('');
    const [s2, setS2] = useState<number | ''>('');
    const [tournamentId, setTournamentId] = useState('');
    const [tournamentElos, setTournamentElos] = useState<Record<string, number>>({});


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

    useEffect(() => {
        if (tournamentId) {
            tournamentService.getTournamentPlayerElos(tournamentId).then(setTournamentElos).catch(console.error);
        } else {
            setTournamentElos({});
        }
    }, [tournamentId]);


const compareVietnameseNames = (aName: string, bName: string): number => {
    const getSortKey = (fullName: string) => {
        const cleanName = fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
        const parts = cleanName.split(/\s+/);
        const givenName = parts[parts.length - 1] || '';
        return `${givenName} ${cleanName}`;
    };
    return getSortKey(aName).localeCompare(getSortKey(bName), 'vi');
};

const PlayerSelect: React.FC<{
    value: string;
    onChange: (id: string) => void;
    availablePlayers: Player[];
    placeholder?: string;
    accentColor?: string;
}> = ({ value, onChange, availablePlayers, placeholder = "Chọn người chơi...", accentColor = "var(--primary-neon)" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedPlayer = availablePlayers.find(p => p.id === value);

    const sortedPlayers = [...availablePlayers].sort((a, b) => compareVietnameseNames(a.name, b.name));

    const filtered = sortedPlayers.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.user_ad && p.user_ad.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: '#1e2337',
                    border: `1.5px solid ${value ? accentColor : 'var(--glass-border)'}`,
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                    boxShadow: value ? `0 0 10px ${accentColor}25` : 'none'
                }}
            >
                {selectedPlayer ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
                            {selectedPlayer.name}
                        </span>
                        {selectedPlayer.user_ad && (
                            <span style={{ fontSize: '0.7rem', color: accentColor, background: `${accentColor}18`, padding: '2px 6px', borderRadius: '6px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                @{selectedPlayer.user_ad}
                            </span>
                        )}
                    </div>
                ) : (
                    <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.9rem' }}>{placeholder}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {selectedPlayer && (
                        <X
                            size={16}
                            color="var(--text-dim)"
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            style={{ cursor: 'pointer', opacity: 0.8 }}
                        />
                    )}
                    <ChevronDown size={18} color="var(--text-dim)" />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setIsOpen(false); setSearch(''); }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 2000,
                            background: 'rgba(10, 12, 20, 0.85)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '520px',
                                maxHeight: '82vh',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '20px',
                                borderRadius: '24px',
                                border: `1px solid ${accentColor}44`,
                                background: '#121624',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Search size={18} color={accentColor} />
                                    <span>Chọn Vận Động Viên</span>
                                </div>
                                <button
                                    onClick={() => { setIsOpen(false); setSearch(''); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search Input Box */}
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Gõ tên hoặc @userad để tìm nhanh..."
                                    style={{
                                        width: '100%',
                                        padding: '12px 38px 12px 38px',
                                        borderRadius: '14px',
                                        background: '#1e2337',
                                        border: `2px solid ${accentColor}`,
                                        color: 'white',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        boxShadow: `0 0 12px ${accentColor}30`
                                    }}
                                />
                                <Search size={18} color={accentColor} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                {search && (
                                    <X
                                        size={16}
                                        color="var(--text-dim)"
                                        onClick={() => setSearch('')}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                    />
                                )}
                            </div>

                            {/* Info bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                                <span>Sắp xếp A - Z theo Tên</span>
                                <span>{filtered.length} VĐV khả dụng</span>
                            </div>

                            {/* Player List Container */}
                            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                                {filtered.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                        Không tìm thấy VĐV nào khớp với từ khóa "{search}"
                                    </div>
                                ) : (
                                    filtered.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => {
                                                onChange(p.id);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '14px',
                                                background: value === p.id ? `${accentColor}25` : 'rgba(255,255,255,0.03)',
                                                border: value === p.id ? `1px solid ${accentColor}` : '1px solid transparent',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}20`)}
                                            onMouseLeave={e => (e.currentTarget.style.background = value === p.id ? `${accentColor}25` : 'rgba(255,255,255,0.03)')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                                <div style={{
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '10px',
                                                    background: `${accentColor}20`,
                                                    color: accentColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 900,
                                                    fontSize: '0.9rem',
                                                    flexShrink: 0
                                                }}>
                                                    {p.name[0].toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                        {p.user_ad && (
                                                            <span style={{ fontSize: '0.7rem', color: accentColor, background: `${accentColor}18`, padding: '1px 5px', borderRadius: '5px', fontWeight: 700 }}>
                                                                @{p.user_ad}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                                                    {p.elo_rating}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: '3px' }}>Elo</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

    const getAvailablePlayers = (currentId: string) => {
        const selectedIds = [p1, p1b, p2, p2b].filter(id => id && id !== currentId);
        const available = players.filter(p => !selectedIds.includes(p.id));
        const currentSelected = players.find(p => p.id === currentId);
        if (currentSelected && !available.some(p => p.id === currentSelected.id)) {
            available.push(currentSelected);
        }
        return available.sort((a, b) => compareVietnameseNames(a.name, b.name));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (s1 === '' || s2 === '') return alert('Vui lòng nhập tỷ số');

        const selectedIds = [p1, p2];
        if (matchType === 'doubles') {
            selectedIds.push(p1b, p2b);
        }

        // Filter out empty IDs and check for duplicates
        const activeIds = selectedIds.filter(id => !!id);
        if (activeIds.length !== new Set(activeIds).size) {
            return alert('Một người chơi không thể xuất hiện 2 lần trong cùng một trận đấu');
        }

        if (activeIds.length < (matchType === 'singles' ? 2 : 4)) {
            return alert('Vui lòng chọn đầy đủ người chơi');
        }

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

                    <div style={{ width: '100%', maxWidth: '450px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}>
                            <Trophy size={16} color="var(--secondary-neon)" /> Chọn Giải đấu (Tùy chọn)
                        </label>
                        <select
                            value={tournamentId}
                            onChange={e => setTournamentId(e.target.value)}
                            style={{
                                width: '100%',
                                borderRadius: '18px',
                                background: tournamentId ? 'rgba(255, 215, 0, 0.08)' : '#1e2337',
                                border: tournamentId ? '2px solid gold' : '1px solid var(--glass-border)',
                                color: 'white',
                                fontWeight: 700,
                                padding: '12px 16px',
                                outline: 'none'
                            }}
                        >
                            <option value="">Không chọn (Chỉ tính Elo chung)</option>
                            {tournaments.map(t => (
                                <option key={t.id} value={t.id}>🏆 {t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Team 1 */}
                    <motion.div whileHover={{ y: -3 }} className="glass-card" style={{ padding: '20px', borderTop: '4px solid var(--primary-neon)', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ padding: '8px', background: 'hsla(var(--primary-neon-h), 100%, 50%, 0.1)', borderRadius: '12px' }}>
                                <Users color="var(--primary-neon)" size={20} />
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.2rem' }}>Team A</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Người chơi 1</label>
                                <PlayerSelect
                                    value={p1}
                                    onChange={setP1}
                                    availablePlayers={getAvailablePlayers(p1)}
                                    placeholder="Chọn người chơi..."
                                    accentColor="var(--primary-neon)"
                                />
                            </div>
                            {matchType === 'doubles' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Người chơi 2</label>
                                    <PlayerSelect
                                        value={p1b}
                                        onChange={setP1b}
                                        availablePlayers={getAvailablePlayers(p1b)}
                                        placeholder="Chọn người chơi thứ 2..."
                                        accentColor="var(--primary-neon)"
                                    />
                                </motion.div>
                            )}
                            <div style={{ marginTop: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Số điểm</label>
                                <input type="number" value={s1} onChange={e => setS1(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0"
                                    style={{ width: '100%', fontSize: '1.6rem', height: '56px', textAlign: 'center', fontWeight: 900, fontFamily: 'var(--font-heading)', border: '2px solid hsla(var(--primary-neon-h), 100%, 50%, 0.2)', borderRadius: '14px', padding: '0.4rem' }}
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Team 2 */}
                    <motion.div whileHover={{ y: -3 }} className="glass-card" style={{ padding: '20px', borderTop: '4px solid var(--secondary-neon)', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ padding: '8px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '12px' }}>
                                <Users color="var(--secondary-neon)" size={20} />
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.2rem' }}>Team B</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Người chơi 1</label>
                                <PlayerSelect
                                    value={p2}
                                    onChange={setP2}
                                    availablePlayers={getAvailablePlayers(p2)}
                                    placeholder="Chọn người chơi..."
                                    accentColor="var(--secondary-neon)"
                                />
                            </div>
                            {matchType === 'doubles' && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Người chơi 2</label>
                                    <PlayerSelect
                                        value={p2b}
                                        onChange={setP2b}
                                        availablePlayers={getAvailablePlayers(p2b)}
                                        placeholder="Chọn người chơi thứ 2..."
                                        accentColor="var(--secondary-neon)"
                                    />
                                </motion.div>
                            )}
                            <div style={{ marginTop: '6px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Số điểm</label>
                                <input type="number" value={s2} onChange={e => setS2(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0"
                                    style={{ width: '100%', fontSize: '1.6rem', height: '56px', textAlign: 'center', fontWeight: 900, fontFamily: 'var(--font-heading)', border: '2px solid hsla(var(--secondary-neon-h), 100%, 50%, 0.2)', borderRadius: '14px', padding: '0.4rem' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Elo Preview Section */}
                {(p1 && p2 && (matchType === 'singles' || (p1b && p2b)) && s1 !== '' && s2 !== '') && (() => {
                    // Global Elo Delta
                    let globalDelta = 0;
                    if (matchType === 'singles') {
                        const player1 = players.find(p => p.id === p1)!;
                        const player2 = players.find(p => p.id === p2)!;
                        if (player1 && player2) {
                            globalDelta = calculateEloDelta(player1.elo_rating, player2.elo_rating, Number(s1), Number(s2));
                        }
                    } else {
                        const player1a = players.find(p => p.id === p1);
                        const player1b_data = players.find(p => p.id === p1b);
                        const player2a = players.find(p => p.id === p2);
                        const player2b_data = players.find(p => p.id === p2b);
                        if (player1a && player1b_data && player2a && player2b_data) {
                            const team1Avg = (player1a.elo_rating + player1b_data.elo_rating) / 2;
                            const team2Avg = (player2a.elo_rating + player2b_data.elo_rating) / 2;
                            globalDelta = calculateEloDelta(team1Avg, team2Avg, Number(s1), Number(s2));
                        }
                    }

                    // Tournament Elo Delta
                    let tDelta = 0;
                    if (tournamentId) {
                        const r1a = tournamentElos[p1] ?? 1200;
                        const r1b = p1b ? (tournamentElos[p1b] ?? 1200) : 1200;
                        const r2a = tournamentElos[p2] ?? 1200;
                        const r2b = p2b ? (tournamentElos[p2b] ?? 1200) : 1200;
                        const t1Avg = matchType === 'doubles' ? (r1a + r1b) / 2 : r1a;
                        const t2Avg = matchType === 'doubles' ? (r2a + r2b) / 2 : r2a;
                        tDelta = calculateEloDelta(t1Avg, t2Avg, Number(s1), Number(s2));
                    }

                    const selectedTourneyName = tournaments.find(t => t.id === tournamentId)?.name;

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card"
                            style={{
                                padding: '24px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--glass-border)',
                                textAlign: 'center',
                                borderRadius: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}
                        >
                            <h4 style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
                                Dự kiến thay đổi điểm Elo
                            </h4>

                            {/* Global Elo Changes */}
                            <div style={{ background: 'rgba(0, 242, 255, 0.05)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(0, 242, 255, 0.15)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--primary-neon)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                                    🌐 Elo Chung (Toàn Hệ Thống)
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Team A</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: Number(s1) > Number(s2) ? 'var(--primary-neon)' : '#ff4d4d' }}>
                                            {globalDelta > 0 ? `+${globalDelta}` : globalDelta}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>vs</span>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Team B</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: Number(s2) > Number(s1) ? 'var(--secondary-neon)' : '#ff4d4d' }}>
                                            {-globalDelta > 0 ? `+${-globalDelta}` : -globalDelta}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tournament Elo Changes */}
                            {tournamentId && (
                                <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '16px', borderRadius: '18px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'gold', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        🏆 Elo Giải Đấu ({selectedTourneyName})
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Team A</span>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: Number(s1) > Number(s2) ? 'gold' : '#ff4d4d' }}>
                                                {tDelta > 0 ? `+${tDelta}` : tDelta}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>vs</span>
                                        <div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Team B</span>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: Number(s2) > Number(s1) ? 'gold' : '#ff4d4d' }}>
                                                {-tDelta > 0 ? `+${-tDelta}` : -tDelta}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })()}


                <button type="submit" disabled={submitting} className="neon-btn" style={{ height: '72px', fontSize: '1.2rem', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: submitting ? 0.5 : 1, borderRadius: '24px' }}>
                    {submitting ? 'Đang lưu...' : editingMatch ? 'Cập nhật trận đấu' : 'Lưu kết quả & tính điểm'} <ArrowRight size={24} />
                </button>
            </form>
        </div>
    );
};
