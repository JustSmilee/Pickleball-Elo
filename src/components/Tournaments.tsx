import React, { useState, useEffect } from 'react';
import { tournamentService, playerService } from '../services/api';
import type { Tournament, TournamentPlayerStats, TournamentFormat, TournamentFixture, TournamentStandingsRow, Player } from '../types';
import { Trophy, Plus, Calendar, CheckCircle2, Circle, X, Medal, ArrowRight, GitBranch, Repeat, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Tournaments: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    
    // Add Tournament Form State
    const [newName, setNewName] = useState('');
    const [selectedFormat, setSelectedFormat] = useState<TournamentFormat>('elo_only');
    const [enrolledPlayerIds, setEnrolledPlayerIds] = useState<string[]>([]);

    // Detail Modal State
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'bracket'>('leaderboard');
    const [tLeaderboard, setTLeaderboard] = useState<TournamentPlayerStats[]>([]);
    const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
    const [rrStandings, setRrStandings] = useState<TournamentStandingsRow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Score Entry Modal State
    const [activeFixture, setActiveFixture] = useState<TournamentFixture | null>(null);
    const [score1, setScore1] = useState<number | ''>('');
    const [score2, setScore2] = useState<number | ''>('');

    useEffect(() => {
        fetchTournaments();
        playerService.getAllPlayers().then(setPlayers).catch(console.error);
    }, []);

    const fetchTournaments = () => {
        tournamentService.getAllTournaments().then(data => {
            setTournaments(data);
            setLoading(false);
        });
    };

    const handleSelectTournament = async (t: Tournament) => {
        setSelectedTournament(t);
        setActiveTab(t.format && t.format !== 'elo_only' ? 'bracket' : 'leaderboard');
        setLoadingDetail(true);
        try {
            const board = await tournamentService.getTournamentLeaderboard(t.id);
            setTLeaderboard(board);

            const loadedFixtures = tournamentService.getTournamentFixtures(t.id);
            setFixtures(loadedFixtures);

            if (t.format === 'round_robin') {
                const standings = tournamentService.calculateRoundRobinStandings(loadedFixtures, players);
                setRrStandings(standings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleTogglePlayerEnrollment = (id: string) => {
        setEnrolledPlayerIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        if (selectedFormat !== 'elo_only' && enrolledPlayerIds.length < 2) {
            alert('Vui lòng chọn ít nhất 2 vận động viên tham gia giải đấu thể thức Vòng Tròn hoặc Loại Trực Tiếp.');
            return;
        }

        try {
            const enrolledObjs = players.filter(p => enrolledPlayerIds.includes(p.id));
            let generatedFixtures: TournamentFixture[] = [];

            if (selectedFormat === 'round_robin') {
                generatedFixtures = tournamentService.generateRoundRobinFixtures('temp', enrolledObjs);
            } else if (selectedFormat === 'knockout') {
                generatedFixtures = tournamentService.generateKnockoutFixtures('temp', enrolledObjs);
            }

            await tournamentService.createTournament(newName.trim(), selectedFormat, enrolledPlayerIds, generatedFixtures);

            setNewName('');
            setSelectedFormat('elo_only');
            setEnrolledPlayerIds([]);
            setShowAdd(false);
            fetchTournaments();
        } catch (err) {
            console.error(err);
            alert('Lỗi khi tạo giải đấu.');
        }
    };

    const handleSaveFixtureScore = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTournament || !activeFixture || score1 === '' || score2 === '') return;

        const updated = tournamentService.recordFixtureScore(
            selectedTournament.id,
            activeFixture.id,
            Number(score1),
            Number(score2)
        );

        setFixtures(updated);

        if (selectedTournament.format === 'round_robin') {
            const standings = tournamentService.calculateRoundRobinStandings(updated, players);
            setRrStandings(standings);
        }

        setActiveFixture(null);
        setScore1('');
        setScore2('');
    };

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy color="#FFD700" size={18} fill="#FFD700" />;
            case 1: return <Medal color="#C0C0C0" size={18} fill="#C0C0C0" />;
            case 2: return <Medal color="#CD7F32" size={18} fill="#CD7F32" />;
            default: return <span style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.8rem' }}>#{index + 1}</span>;
        }
    };

    const getFormatBadge = (format?: TournamentFormat) => {
        switch (format) {
            case 'round_robin':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 242, 255, 0.1)', color: 'var(--primary-neon)', border: '1px solid rgba(0, 242, 255, 0.3)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}><Repeat size={12} /> VÒNG TRÒN</span>;
            case 'knockout':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(189, 0, 255, 0.1)', color: 'var(--secondary-neon)', border: '1px solid rgba(189, 0, 255, 0.3)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}><GitBranch size={12} /> LOẠI TRỰC TIẾP</span>;
            default:
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 215, 0, 0.1)', color: 'gold', border: '1px solid rgba(255, 215, 0, 0.3)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}><Trophy size={12} /> ELO CHÍNH</span>;
        }
    };

    if (loading) return <div className="fade-in">Đang tải danh sách giải đấu...</div>;

    // Group fixtures by round
    const roundsMap: Record<number, TournamentFixture[]> = {};
    fixtures.forEach(f => {
        if (!roundsMap[f.round]) roundsMap[f.round] = [];
        roundsMap[f.round].push(f);
    });

    return (
        <div className="fade-in tournament-container" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div className="tournament-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 className="neon-text heading-font tournament-title" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Giải Đấu</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Quản lý thể thức giải đấu: Elo Hệ thống, Vòng Tròn & Cây Loại Trực Tiếp</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="neon-btn add-tournament-btn" style={{ padding: '10px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Plus size={18} /> Tạo giải mới
                </button>
            </div>

            {/* Create Tournament Form Modal */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card add-tournament-form" style={{ padding: '24px', marginBottom: '24px', borderRadius: '20px' }}>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Tên Giải Đấu</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="VD: Championship Summer 2026..."
                                    required
                                    style={{ borderRadius: '12px' }}
                                />
                            </div>

                            {/* Tournament Format Selector */}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Thể Thức Giải Đấu</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                    {[
                                        { id: 'elo_only', label: '🏆 Elo Hệ Thống', desc: 'Ghi trận tính Elo riêng tự do' },
                                        { id: 'round_robin', label: '🔄 Vòng Tròn (Round Robin)', desc: 'Xếp cặp đấu vòng tròn + BXH điểm' },
                                        { id: 'knockout', label: '⚡ Loại Trực Tiếp (Bracket)', desc: 'Vẽ sơ đồ cây đấu Knockout' },
                                    ].map(f => (
                                        <div
                                            key={f.id}
                                            onClick={() => setSelectedFormat(f.id as TournamentFormat)}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '14px',
                                                background: selectedFormat === f.id ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                                                border: selectedFormat === f.id ? '1.5px solid var(--primary-neon)' : '1px solid var(--glass-border)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: selectedFormat === f.id ? 'var(--primary-neon)' : 'white' }}>{f.label}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>{f.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Participant Enrollment Checkboxes (For Round Robin & Knockout) */}
                            {selectedFormat !== 'elo_only' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Chọn VĐV Tham Gia ({enrolledPlayerIds.length} đã chọn)</label>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--primary-neon)', cursor: 'pointer' }} onClick={() => setEnrolledPlayerIds(players.map(p => p.id))}>Chọn tất cả</span>
                                    </div>
                                    <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px', background: '#171b2c', padding: '10px', borderRadius: '12px' }}>
                                        {players.map(p => {
                                            const isSelected = enrolledPlayerIds.includes(p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleTogglePlayerEnrollment(p.id)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        background: isSelected ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                                                        border: isSelected ? '1px solid var(--primary-neon)' : '1px solid transparent',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.8rem',
                                                        color: isSelected ? 'white' : 'var(--text-dim)'
                                                    }}
                                                >
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                    {isSelected && <Check size={14} color="var(--primary-neon)" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Hủy</button>
                                <button type="submit" className="neon-btn" style={{ borderRadius: '12px', padding: '8px 20px', fontSize: '0.85rem' }}>Tạo Giải Đấu</button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tournament List Grid */}
            <div className="tournament-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {tournaments.length === 0 ? (
                    <div className="glass-card" style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', borderRadius: '20px' }}>
                        <p style={{ color: 'var(--text-dim)', fontSize: '1rem' }}>Chưa có giải đấu nào được tạo.</p>
                    </div>
                ) : (
                    tournaments.map((t, index) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -3 }}
                            onClick={() => handleSelectTournament(t)}
                            className="glass-card hover-row tournament-card"
                            style={{ padding: '20px', position: 'relative', borderRadius: '20px', cursor: 'pointer' }}
                        >
                            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                {t.status === 'active' ? <Circle color="var(--primary-neon)" fill="var(--primary-neon)" size={10} /> : <CheckCircle2 color="var(--success)" size={18} />}
                            </div>
                            <div style={{ padding: '10px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '14px', width: 'fit-content', marginBottom: '14px' }}>
                                <Trophy color="var(--secondary-neon)" size={24} />
                            </div>
                            <h3 className="heading-font tournament-card-title" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{t.name}</h3>
                            
                            <div style={{ marginBottom: '12px' }}>
                                {getFormatBadge(t.format)}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500 }}>
                                <Calendar size={14} /> Bắt đầu: {new Date(t.start_date).toLocaleDateString('vi-VN')}
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '0.65rem', color: t.status === 'active' ? 'var(--primary-neon)' : 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--glass-border)' }}>
                                    {t.status === 'active' ? 'ĐANG DIỄN RA' : 'ĐÃ KẾT THÚC'}
                                </span>
                                <span style={{ color: 'gold', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Chi tiết <ArrowRight size={14} />
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Tournament Detail Drawer Modal */}
            <AnimatePresence>
                {selectedTournament && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedTournament(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(10, 12, 20, 0.85)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                            cursor: 'pointer'
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
                                maxWidth: '820px',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '24px',
                                borderRadius: '24px',
                                position: 'relative',
                                cursor: 'default'
                            }}
                        >
                            <button
                                onClick={() => setSelectedTournament(null)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '16px' }}>
                                    <Trophy color="gold" size={28} />
                                </div>
                                <div>
                                    <h2 className="heading-font" style={{ fontSize: '1.6rem', color: 'gold', marginBottom: '2px' }}>{selectedTournament.name}</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getFormatBadge(selectedTournament.format)}
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Bắt đầu: {new Date(selectedTournament.start_date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Tab Switcher */}
                            {selectedTournament.format && selectedTournament.format !== 'elo_only' && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                                    <button
                                        onClick={() => setActiveTab('bracket')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: activeTab === 'bracket' ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'transparent',
                                            color: activeTab === 'bracket' ? '#000' : 'var(--text-dim)',
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        📅 {selectedTournament.format === 'round_robin' ? 'Lịch Đấu & BXH Bảng' : 'Cây Thi Đấu Bracket'}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('leaderboard')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: activeTab === 'leaderboard' ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'transparent',
                                            color: activeTab === 'leaderboard' ? '#000' : 'var(--text-dim)',
                                            fontWeight: 800,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        🏆 BXH Elo Giải Đấu
                                    </button>
                                </div>
                            )}

                            {loadingDetail ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải dữ liệu giải đấu...</div>
                            ) : (
                                <div>
                                    {/* Bracket / Fixtures Tab View */}
                                    {activeTab === 'bracket' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {/* Round Robin Live Standings Table */}
                                            {selectedTournament.format === 'round_robin' && (
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'gold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        📊 Bảng Xếp Hạng Vòng Tròn Tính Điểm
                                                    </h3>
                                                    {rrStandings.length === 0 ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                                            Chưa có trận vòng tròn nào hoàn thành.
                                                        </div>
                                                    ) : (
                                                        <div style={{ overflowX: 'auto', background: '#161928', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                                                <thead>
                                                                    <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                                                                        <th style={{ padding: '10px 14px' }}>Hạng</th>
                                                                        <th style={{ padding: '10px 14px' }}>Vận động viên</th>
                                                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>ST</th>
                                                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>T</th>
                                                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>B</th>
                                                                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>HS</th>
                                                                        <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--primary-neon)' }}>Điểm</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rrStandings.map((row, idx) => (
                                                                        <tr key={row.playerId} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                            <td style={{ padding: '10px 14px', fontWeight: 800 }}>#{idx + 1}</td>
                                                                            <td style={{ padding: '10px 14px', fontWeight: 700, color: 'white' }}>{row.name}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.played}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--success)' }}>{row.wins}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--error)' }}>{row.losses}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td>
                                                                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--primary-neon)', fontSize: '0.9rem' }}>{row.points}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Fixtures List / Bracket Tree */}
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
                                                    {selectedTournament.format === 'knockout' ? '⚡ Sơ Đồ Cây Thi Đấu Knockout' : '📅 Lịch Các Vòng Đấu'}
                                                </h3>
                                                {fixtures.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                                        Chưa có lịch thi đấu được khởi tạo cho giải này.
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {Object.keys(roundsMap).map(roundNumStr => {
                                                            const roundNum = Number(roundNumStr);
                                                            const roundFixtures = roundsMap[roundNum];
                                                            const roundLabel = selectedTournament.format === 'knockout'
                                                                ? (roundNum === Object.keys(roundsMap).length ? '🏆 TRẬN CHUNG KẾT' : `Vòng ${roundNum}`)
                                                                : `Vòng ${roundNum}`;

                                                            return (
                                                                <div key={roundNum} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-neon)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                        {roundLabel}
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                                                        {roundFixtures.map(fix => (
                                                                            <div
                                                                                key={fix.id}
                                                                                style={{
                                                                                    padding: '10px 12px',
                                                                                    borderRadius: '12px',
                                                                                    background: fix.status === 'completed' ? 'rgba(16, 185, 129, 0.05)' : '#1b2033',
                                                                                    border: fix.status === 'completed' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '6px'
                                                                                }}
                                                                            >
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                                                    <span style={{ fontWeight: fix.winner_id === fix.player1_id ? 900 : 600, color: fix.winner_id === fix.player1_id ? 'var(--primary-neon)' : 'white' }}>
                                                                                        {fix.player1_name || 'TBD'}
                                                                                    </span>
                                                                                    <span style={{ fontWeight: 900, color: 'gold' }}>{fix.score1 ?? '-'}</span>
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                                                    <span style={{ fontWeight: fix.winner_id === fix.player2_id ? 900 : 600, color: fix.winner_id === fix.player2_id ? 'var(--primary-neon)' : 'white' }}>
                                                                                        {fix.player2_name || 'TBD'}
                                                                                    </span>
                                                                                    <span style={{ fontWeight: 900, color: 'gold' }}>{fix.score2 ?? '-'}</span>
                                                                                </div>

                                                                                {/* Action button */}
                                                                                {fix.player1_id && fix.player2_id && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setActiveFixture(fix);
                                                                                            setScore1(fix.score1 ?? '');
                                                                                            setScore2(fix.score2 ?? '');
                                                                                        }}
                                                                                        style={{
                                                                                            marginTop: '4px',
                                                                                            padding: '4px 8px',
                                                                                            borderRadius: '8px',
                                                                                            border: 'none',
                                                                                            background: 'rgba(0, 242, 255, 0.1)',
                                                                                            color: 'var(--primary-neon)',
                                                                                            fontSize: '0.7rem',
                                                                                            fontWeight: 700,
                                                                                            cursor: 'pointer'
                                                                                        }}
                                                                                    >
                                                                                        {fix.status === 'completed' ? 'Sửa Tỷ Số' : '🎯 Nhập Tỷ Số'}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Leaderboard Tab View */}
                                    {activeTab === 'leaderboard' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                                                    🏆 Bảng Xếp Hạng Elo Giải Đấu ({tLeaderboard.length} VĐV)
                                                </h3>
                                                {tLeaderboard.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '0.85rem' }}>
                                                        Chưa có trận đấu nào được ghi nhận cho giải này.
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {tLeaderboard.map((player, idx) => (
                                                            <div
                                                                key={player.playerId}
                                                                style={{
                                                                    padding: '10px 14px',
                                                                    background: idx < 3 ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255,255,255,0.02)',
                                                                    border: idx === 0 ? '1px solid gold' : '1px solid var(--glass-border)',
                                                                    borderRadius: '14px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div style={{ width: '24px', textAlign: 'center' }}>
                                                                        {getRankIcon(idx)}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>
                                                                            {player.name}
                                                                            {player.user_ad && <span style={{ fontSize: '0.7rem', color: 'var(--primary-neon)', marginLeft: '6px' }}>@{player.user_ad}</span>}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                            {player.matches_played} trận | {player.wins} thắng - {player.losses} thua
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: 900, color: 'var(--primary-neon)', fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                                                                        {player.elo_rating}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Elo</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Score Entry Dialog */}
            <AnimatePresence>
                {activeFixture && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 3000,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 15 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '360px',
                                padding: '24px',
                                borderRadius: '20px',
                                border: '1px solid var(--primary-neon)'
                            }}
                        >
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '16px', textAlign: 'center' }}>
                                🎯 Nhập Tỷ Số Trận Đấu
                            </h3>
                            <form onSubmit={handleSaveFixtureScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-neon)', marginBottom: '6px' }}>{activeFixture.player1_name}</div>
                                        <input
                                            type="number"
                                            value={score1}
                                            onChange={e => setScore1(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0"
                                            required
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '50px', padding: '0' }}
                                        />
                                    </div>
                                    <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-dim)' }}>VS</span>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--secondary-neon)', marginBottom: '6px' }}>{activeFixture.player2_name}</div>
                                        <input
                                            type="number"
                                            value={score2}
                                            onChange={e => setScore2(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0"
                                            required
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '50px', padding: '0' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button type="button" onClick={() => setActiveFixture(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                                    <button type="submit" className="neon-btn" style={{ flex: 1, padding: '10px', borderRadius: '12px' }}>Lưu Tỷ Số</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
