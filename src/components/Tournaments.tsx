import React, { useState, useEffect } from 'react';
import { tournamentService, playerService, DEFAULT_TEAM_ROSTERS } from '../services/api';
import type { Tournament, TournamentPlayerStats, TournamentFormat, TournamentFixture, TournamentStandingsRow, Player, TeamMinigameStats } from '../types';
import { Trophy, Plus, Calendar, CheckCircle2, Circle, X, Medal, ArrowRight, GitBranch, Repeat, Check, Users, BookOpen, ShieldAlert, Award, Settings } from 'lucide-react';
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
    const [teamTab, setTeamTab] = useState<'standings' | 'rosters' | 'schedule' | 'rules' | 'individual'>('standings');
    const [selectedWeek, setSelectedWeek] = useState<number>(1);

    const [tLeaderboard, setTLeaderboard] = useState<TournamentPlayerStats[]>([]);
    const [teamStandings, setTeamStandings] = useState<TeamMinigameStats[]>([]);
    const [tMatches, setTMatches] = useState<any[]>([]);
    const [fixtures, setFixtures] = useState<TournamentFixture[]>([]);
    const [rrStandings, setRrStandings] = useState<TournamentStandingsRow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Penalty Modal State
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    const [penaltyTeamId, setPenaltyTeamId] = useState<string>('A');
    const [penaltyValue, setPenaltyValue] = useState<number>(0);

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
        if (t.format === 'team_minigame') {
            setTeamTab('standings');
        } else {
            setActiveTab(t.format && t.format !== 'elo_only' ? 'bracket' : 'leaderboard');
        }
        setLoadingDetail(true);
        try {
            const [board, matches, teamBoard] = await Promise.all([
                tournamentService.getTournamentLeaderboard(t.id),
                tournamentService.getTournamentMatches(t.id),
                t.format === 'team_minigame' ? tournamentService.getTeamMinigameStandings(t.id) : Promise.resolve([])
            ]);
            setTLeaderboard(board);
            setTMatches(matches);
            setTeamStandings(teamBoard);

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

        if (selectedFormat !== 'elo_only' && selectedFormat !== 'team_minigame' && enrolledPlayerIds.length < 2) {
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

    const handleSavePenalty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTournament) return;
        tournamentService.setTeamPenalty(selectedTournament.id, penaltyTeamId, Number(penaltyValue));
        const updated = await tournamentService.getTeamMinigameStandings(selectedTournament.id);
        setTeamStandings(updated);
        setShowPenaltyModal(false);
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
            case 'team_minigame':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}><Users size={12} /> MINIGAME ĐỒNG ĐỘI</span>;
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

    // Helper for team badge color styling
    const getTeamBadge = (teamId: string) => {
        const roster = DEFAULT_TEAM_ROSTERS[teamId];
        if (!roster) return null;
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: roster.badgeBg,
                color: roster.color,
                border: `1px solid ${roster.color}40`
            }}>
                {roster.name}
            </span>
        );
    };

    // Filter matches for weekly schedule in team minigame
    const getMatchesForWeek = (week: number) => {
        return tMatches.filter(m => {
            const dt = new Date(m.created_at);
            const day = dt.getUTCDate();
            const month = dt.getUTCMonth() + 1;
            if (month !== 8) return week === 1;
            if (week === 1) return day <= 15;
            if (week === 2) return day > 15 && day <= 22;
            return day > 22;
        });
    };

    return (
        <div className="fade-in tournament-container" style={{ maxWidth: '860px', margin: '0 auto' }}>
            <div className="tournament-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 className="neon-text heading-font tournament-title" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Giải Đấu</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Quản lý giải đấu: Minigame Đồng Đội, Elo Hệ thống, Vòng Tròn & Knockout</p>
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
                                        { id: 'team_minigame', label: '👥 Minigame Đồng Đội (3 Tuần)', desc: 'Thi đấu 4 đội A-B-C-D theo tuần + BXH Lũy Kế' },
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
                            {selectedFormat !== 'elo_only' && selectedFormat !== 'team_minigame' && (
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

            {/* Tournament Detail Modal */}
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
                            background: 'rgba(10, 12, 20, 0.94)',
                            backdropFilter: 'blur(12px)',
                            zIndex: 2000,
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
                                maxWidth: '860px',
                                maxHeight: 'calc(100vh - 32px)',
                                overflowY: 'auto',
                                padding: '20px',
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
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Từ: {new Date(selectedTournament.start_date).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* TEAM MINIGAME SPECIAL SUB-TABS */}
                            {selectedTournament.format === 'team_minigame' ? (
                                <div>
                                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                                        {[
                                            { id: 'standings', label: '🏆 BXH Đồng Đội', icon: Award },
                                            { id: 'rosters', label: '👥 Danh Sách 4 Đội', icon: Users },
                                            { id: 'schedule', label: '📅 Lịch & Kết Quả 3 Tuần', icon: Calendar },
                                            { id: 'rules', label: '📜 Thể Lệ Giải', icon: BookOpen },
                                            { id: 'individual', label: '⭐ Elo Cá Nhân', icon: Trophy },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setTeamTab(tab.id as any)}
                                                style={{
                                                    padding: '8px 14px',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    background: teamTab === tab.id ? 'linear-gradient(135deg, #eab308, #f97316)' : 'rgba(255,255,255,0.03)',
                                                    color: teamTab === tab.id ? '#000' : 'var(--text-dim)',
                                                    fontWeight: 800,
                                                    fontSize: '0.78rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <tab.icon size={14} />
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {loadingDetail ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>Đang tải dữ liệu giải...</div>
                                    ) : (
                                        <div>
                                            {/* TEAM STANDINGS TAB */}
                                            {teamTab === 'standings' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {/* Top Leader Highlight Banner */}
                                                    {teamStandings.length > 0 && (
                                                        <div style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.05))', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <Trophy size={32} color="#eab308" fill="#eab308" />
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ĐẪU BẢNG LŨY KẾ HIỆN TẠI</div>
                                                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>{teamStandings[0].teamName}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#eab308', fontFamily: 'var(--font-heading)' }}>{teamStandings[0].totalPoints} <span style={{ fontSize: '0.9rem' }}>ĐIỂM</span></div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{teamStandings[0].wins} trận thắng (+{teamStandings[0].weeklyBonus}đ Nhất tuần)</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>Bảng Xếp Hạng Đồng Đội Lũy Kế</h3>
                                                        <button
                                                            onClick={() => setShowPenaltyModal(true)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                color: '#ef4444',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Settings size={14} /> Quản Lý Trừ Điểm (BTC)
                                                        </button>
                                                    </div>

                                                    <div style={{ overflowX: 'auto', background: '#161928', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                                                            <thead>
                                                                <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                                                    <th style={{ padding: '12px 14px' }}>Hạng</th>
                                                                    <th style={{ padding: '12px 14px' }}>Đội Thi Đấu</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>ST</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thắng</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hiệu Số</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#eab308' }}>Nhất Tuần (+2đ)</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#ef4444' }}>Trừ Điểm</th>
                                                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'gold' }}>Tổng Lũy Kế</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {teamStandings.map((t, idx) => (
                                                                    <tr key={t.teamId} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '12px 14px', fontWeight: 800 }}>
                                                                            {getRankIcon(idx)}
                                                                        </td>
                                                                        <td style={{ padding: '12px 14px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                {getTeamBadge(t.teamId)}
                                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                                                                    ({t.members.length} VĐV)
                                                                                </span>
                                                                            </div>
                                                                        </td>

                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>{t.played}</td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{t.wins}</td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: t.scoreDiff >= 0 ? 'var(--primary-neon)' : '#ef4444' }}>
                                                                            {t.scoreDiff > 0 ? `+${t.scoreDiff}` : t.scoreDiff}
                                                                        </td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#eab308' }}>
                                                                            +{t.weeklyBonus}đ
                                                                        </td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: t.penalties > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                                                                            {t.penalties > 0 ? `-${t.penalties}đ` : '0'}
                                                                        </td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, fontSize: '1.2rem', color: 'gold', fontFamily: 'var(--font-heading)' }}>
                                                                            {t.totalPoints}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TEAM ROSTERS TAB */}
                                            {teamTab === 'rosters' && (
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '14px' }}>Danh Sách 4 Đội Tham Dự Giải Pickleball</h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                                                        {Object.values(DEFAULT_TEAM_ROSTERS).map(roster => {
                                                            const tStat = teamStandings.find(s => s.teamId === roster.id);
                                                            return (
                                                                <div
                                                                    key={roster.id}
                                                                    style={{
                                                                        background: '#161928',
                                                                        borderRadius: '16px',
                                                                        border: `1.5px solid ${roster.color}40`,
                                                                        overflow: 'hidden'
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        background: roster.color,
                                                                        color: '#000',
                                                                        fontWeight: 900,
                                                                        fontSize: '1rem',
                                                                        textAlign: 'center',
                                                                        padding: '10px',
                                                                        letterSpacing: '0.05em'
                                                                    }}>
                                                                        {roster.name.toUpperCase()}
                                                                    </div>
                                                                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {tStat?.members.map(m => (
                                                                            <div key={m.id} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span style={{ color: roster.color }}>•</span> {m.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div style={{
                                                                        background: 'rgba(255,255,255,0.03)',
                                                                        padding: '8px 12px',
                                                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        fontSize: '0.75rem',
                                                                        color: 'var(--text-dim)'
                                                                    }}>
                                                                        <span>Tổng điểm team:</span>
                                                                        <span style={{ fontWeight: 800, color: 'white' }}>10</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* WEEKLY SCHEDULE TAB */}
                                            {teamTab === 'schedule' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {/* Week Switcher Buttons */}
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {[
                                                            { week: 1, label: 'Tuần 1 (12/08)', matchDesc: 'Đội A vs Đội B | Đội C vs Đội D' },
                                                            { week: 2, label: 'Tuần 2 (19/08)', matchDesc: 'Đội A vs Đội C | Đội B vs Đội D' },
                                                            { week: 3, label: 'Tuần 3 (26/08)', matchDesc: 'Đội A vs Đội D | Đội B vs Đội C' },
                                                        ].map(w => (
                                                            <button
                                                                key={w.week}
                                                                onClick={() => setSelectedWeek(w.week)}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '10px 12px',
                                                                    borderRadius: '12px',
                                                                    border: selectedWeek === w.week ? '1.5px solid var(--primary-neon)' : '1px solid var(--glass-border)',
                                                                    background: selectedWeek === w.week ? 'rgba(0, 242, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                                                                    color: selectedWeek === w.week ? 'var(--primary-neon)' : 'white',
                                                                    fontWeight: 800,
                                                                    fontSize: '0.8rem',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                <div>{w.label}</div>
                                                                <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px', fontWeight: 500 }}>{w.matchDesc}</div>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Week Matches List */}
                                                    <div>
                                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', marginBottom: '10px' }}>
                                                            Danh Sách Trận Đấu Tuần {selectedWeek} ({getMatchesForWeek(selectedWeek).length} trận)
                                                        </h3>

                                                        {getMatchesForWeek(selectedWeek).length === 0 ? (
                                                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '0.85rem' }}>
                                                                Chưa có trận đấu nào được ghi nhận cho Tuần {selectedWeek}.
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                                                                {getMatchesForWeek(selectedWeek).map((m: any, idx: number) => (
                                                                    <div
                                                                        key={m.id || idx}
                                                                        style={{
                                                                            padding: '12px 14px',
                                                                            borderRadius: '14px',
                                                                            background: '#171a2b',
                                                                            border: '1px solid var(--glass-border)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '6px'
                                                                        }}
                                                                    >
                                                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>Trận #{idx + 1}</span>
                                                                            <span>{new Date(m.created_at).toLocaleDateString('vi-VN')}</span>
                                                                        </div>

                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                                            <span style={{ fontWeight: m.team1_score > m.team2_score ? 900 : 500, color: m.team1_score > m.team2_score ? 'var(--primary-neon)' : 'white' }}>
                                                                                {m.p1?.name} & {m.p1b?.name || ''}
                                                                            </span>
                                                                            <span style={{ fontWeight: 900, color: 'gold', fontSize: '1rem' }}>{m.team1_score}</span>
                                                                        </div>

                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                                            <span style={{ fontWeight: m.team2_score > m.team1_score ? 900 : 500, color: m.team2_score > m.team1_score ? 'var(--primary-neon)' : 'white' }}>
                                                                                {m.p2?.name} & {m.p2b?.name || ''}
                                                                            </span>
                                                                            <span style={{ fontWeight: 900, color: 'gold', fontSize: '1rem' }}>{m.team2_score}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* RULES TAB */}
                                            {teamTab === 'rules' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                    <div style={{ background: '#161928', padding: '16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <h4 style={{ color: 'gold', fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>1. Thể thức thi đấu</h4>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <li>Giải gồm 04 đội (Đội A, Đội B, Đội C, Đội D), mỗi đội có 4-5 thành viên.</li>
                                                            <li>Thi đấu trong 03 tuần, mỗi tuần sử dụng 02 sân trong thời gian 02 giờ.</li>
                                                            <li><strong>Lịch thi đấu chính thức:</strong></li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 1 (12/08): Đội A vs Đội B | Đội C vs Đội D</li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 2 (19/08): Đội A vs Đội C | Đội B vs Đội D</li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 3 (26/08): Đội A vs Đội D | Đội B vs Đội C</li>
                                                            <li>Mỗi cặp đội thi đấu nhiều trận trong khung thời gian quy định.</li>
                                                            <li>Mỗi đội tự sắp xếp đội hình và phân bổ người chơi cho từng trận, đảm bảo mọi thành viên đều được tham gia và tuân thủ lịch thi đấu.</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{ background: '#161928', padding: '16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <h4 style={{ color: 'gold', fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px' }}>2. Quy tắc tính điểm</h4>
                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>Điểm thi đấu tuần:</div>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                                                            <li>Mỗi trận thắng: +1 điểm.</li>
                                                            <li>Mỗi trận thua: 0 điểm.</li>
                                                            <li>Kết thúc tuần, đội có tổng số trận thắng nhiều hơn trong cặp đối đầu được công nhận là <strong>Đội Nhất tuần</strong> và được thưởng <strong>+2 điểm</strong> vào bảng xếp hạng lũy kế.</li>
                                                        </ul>

                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>Điểm lũy kế chung cuộc:</div>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <li><strong>Điểm chung cuộc</strong> = Tổng điểm các trận thắng của 3 tuần + Điểm thưởng Nhất tuần - Điểm trừ.</li>
                                                            <li>Đội có tổng điểm cao nhất sau 3 tuần là <strong>Đội Vô địch</strong>.</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{ background: '#161928', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                        <h4 style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <ShieldAlert size={16} /> 3. Quy định trừ điểm & Xếp hạng bằng điểm
                                                        </h4>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                                                            <li>Đội không đủ 04 thành viên tham gia mà không báo trước Ban Tổ chức sẽ bị trừ 01 điểm vào tổng điểm lũy kế.</li>
                                                            <li>Các trường hợp đặc biệt sẽ do Ban Tổ chức xem xét và quyết định.</li>
                                                        </ul>
                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '4px' }}>Thứ tự ưu tiên xếp hạng khi bằng điểm:</div>
                                                        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <li>Tổng điểm lũy kế chung cuộc.</li>
                                                            <li>Tổng số trận thắng.</li>
                                                            <li>Hiệu số điểm ghi - điểm thua.</li>
                                                            <li>Kết quả đối đầu.</li>
                                                            <li>Quyết định của Ban Tổ chức.</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            )}

                                            {/* INDIVIDUAL ELO TAB */}
                                            {teamTab === 'individual' && (
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px', color: 'white' }}>
                                                        🏆 Bảng Xếp Hạng Elo Cá Nhân ({tLeaderboard.length} VĐV)
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
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* STANDARD FORMATS (ELO ONLY, ROUND ROBIN, KNOCKOUT) */
                                <div>
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
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Penalty Manager Dialog Modal */}
            <AnimatePresence>
                {showPenaltyModal && (
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
                                maxWidth: '380px',
                                padding: '24px',
                                borderRadius: '20px',
                                border: '1px solid rgba(239, 68, 68, 0.5)'
                            }}
                        >
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', marginBottom: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <ShieldAlert size={20} /> Quản Lý Trừ Điểm BTC
                            </h3>
                            <form onSubmit={handleSavePenalty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Chọn Đội Vi Phạm</label>
                                    <select
                                        value={penaltyTeamId}
                                        onChange={e => setPenaltyTeamId(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '12px', background: '#161928', border: '1px solid var(--glass-border)', color: 'white', fontWeight: 700 }}
                                    >
                                        <option value="A">Đội A</option>
                                        <option value="B">Đội B</option>
                                        <option value="C">Đội C</option>
                                        <option value="D">Đội D</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Số Điểm Trừ (Số nguyên dương)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={penaltyValue}
                                        onChange={e => setPenaltyValue(Number(e.target.value))}
                                        placeholder="VD: 1"
                                        required
                                        style={{ width: '100%', borderRadius: '12px', padding: '10px', fontSize: '1rem', fontWeight: 800 }}
                                    />
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                        Theo thể lệ: Trừ 1 điểm nếu đội không đủ 4 thành viên mà không báo trước BTC.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowPenaltyModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                                    <button type="submit" className="neon-btn" style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>Lưu Trừ Điểm</button>
                                </div>
                            </form>
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
