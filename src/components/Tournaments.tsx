import React, { useState, useEffect, useRef } from 'react';
import { tournamentService, playerService, scheduleService, DEFAULT_TEAM_ROSTERS } from '../services/api';

import type { Tournament, TournamentPlayerStats, TournamentFormat, TournamentFixture, TournamentStandingsRow, Player, TeamMinigameStats, MatchSchedule } from '../types';
import { Trophy, Plus, Calendar, CheckCircle2, Circle, X, Medal, ArrowRight, GitBranch, Repeat, Check, Users, BookOpen, ShieldAlert, Award, ChevronLeft, ClipboardList, Pencil, Trash2 } from 'lucide-react';

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

    // Detail View State (replaces modal)
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

    // Match Schedules (pre-scheduled fixtures)
    const [matchSchedules, setMatchSchedules] = useState<MatchSchedule[]>([]);

    // Add Fixture Form State
    const [showAddFixture, setShowAddFixture] = useState(false);
    const [newFixtures, setNewFixtures] = useState<Array<{
        court: string;
        match_order: number;
        matchup_label: string;
        team1_player1_id: string;
        team1_player2_id: string;
        team2_player1_id: string;
        team2_player2_id: string;
    }>>([{
        court: '',
        match_order: 1,
        matchup_label: '',
        team1_player1_id: '',
        team1_player2_id: '',
        team2_player1_id: '',
        team2_player2_id: '',
    }]);
    const [newFixtureWeek, setNewFixtureWeek] = useState<number>(1);
    const [newFixtureDate, setNewFixtureDate] = useState<string>('');

    // Score Entry Modal for Schedules
    const [activeSchedule, setActiveSchedule] = useState<MatchSchedule | null>(null);
    const [schedScore1, setSchedScore1] = useState<number | ''>('');
    const [schedScore2, setSchedScore2] = useState<number | ''>('');
    const [submittingScore, setSubmittingScore] = useState(false);

    // Score Entry Modal State (existing fixtures)
    const [activeFixture, setActiveFixture] = useState<TournamentFixture | null>(null);
    const [score1, setScore1] = useState<number | ''>('');
    const [score2, setScore2] = useState<number | ''>('');

    const detailRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTournaments();
        playerService.getAllPlayers().then(setPlayers).catch(console.error);
    }, []);

    // Scroll to top of detail view when tournament changes
    useEffect(() => {
        if (selectedTournament && detailRef.current) {
            detailRef.current.scrollTop = 0;
            // Also scroll window to top of the section
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedTournament]);

    const fetchTournaments = () => {
        tournamentService.getAllTournaments().then(data => {
            setTournaments(data);
            setLoading(false);
        });
    };

    const handleSelectTournament = async (t: Tournament) => {
        const format = (t.name && t.name.includes('H2 2026')) ? 'team_minigame' : (t.format || 'elo_only');
        const activeT = { ...t, format: format as TournamentFormat };
        setSelectedTournament(activeT);
        if (format === 'team_minigame') {
            setTeamTab('standings');
        } else {
            setActiveTab(format !== 'elo_only' ? 'bracket' : 'leaderboard');
        }
        setLoadingDetail(true);
        try {
            const [board, matches, teamBoard, schedules] = await Promise.all([
                tournamentService.getTournamentLeaderboard(t.id),
                tournamentService.getTournamentMatches(t.id),
                format === 'team_minigame' ? tournamentService.getTeamMinigameStandings(t.id) : Promise.resolve([]),
                format === 'team_minigame' ? scheduleService.getSchedules(t.id) : Promise.resolve([]),
            ]);
            setTLeaderboard(board);
            setTMatches(matches);
            setTeamStandings(teamBoard);
            setMatchSchedules(schedules);

            const loadedFixtures = tournamentService.getTournamentFixtures(t.id);
            setFixtures(loadedFixtures);

            if (format === 'round_robin') {
                const standings = tournamentService.calculateRoundRobinStandings(loadedFixtures, players);
                setRrStandings(standings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleBack = () => {
        setSelectedTournament(null);
        setTLeaderboard([]);
        setTMatches([]);
        setTeamStandings([]);
        setFixtures([]);
        setRrStandings([]);
        setMatchSchedules([]);
        setShowAddFixture(false);
    };

    const handleTogglePlayerEnrollment = (id: string) => {
        setEnrolledPlayerIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    // ─── Schedule Handlers ────────────────────────────────────────────────────
    const handleSaveNewFixtures = async () => {
        if (!selectedTournament) return;
        const valid = newFixtures.filter(f => f.team1_player1_id && f.team2_player1_id);
        if (!valid.length) { alert('Vui lòng điền ít nhất 1 trận với người chơi đầy đủ.'); return; }

        try {
            const payload = valid.map((f, i) => ({
                tournament_id: selectedTournament.id,
                week: newFixtureWeek,
                court: f.court || undefined,
                match_order: f.match_order || i + 1,
                matchup_label: f.matchup_label || undefined,
                team1_player1_id: f.team1_player1_id || undefined,
                team1_player2_id: f.team1_player2_id || undefined,
                team2_player1_id: f.team2_player1_id || undefined,
                team2_player2_id: f.team2_player2_id || undefined,
                scheduled_date: newFixtureDate || undefined,
            }));
            const created = await scheduleService.createSchedules(payload);
            setMatchSchedules(prev => [...prev, ...created]);
            setShowAddFixture(false);
            setNewFixtures([{ court: '', match_order: 1, matchup_label: '', team1_player1_id: '', team1_player2_id: '', team2_player1_id: '', team2_player2_id: '' }]);
        } catch (err) {
            console.error(err);
            alert('Lỗi khi lưu lịch trận.');
        }
    };

    const handleRecordScheduleScore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTournament || !activeSchedule || schedScore1 === '' || schedScore2 === '') return;
        setSubmittingScore(true);
        try {
            const freshPlayers = await playerService.getAllPlayers();
            const { updatedSchedule } = await scheduleService.recordScheduleScore(
                activeSchedule.id, activeSchedule,
                Number(schedScore1), Number(schedScore2),
                selectedTournament.id, freshPlayers
            );
            setMatchSchedules(prev => prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
            // Refresh standings
            const [newMatches, newStandings] = await Promise.all([
                tournamentService.getTournamentMatches(selectedTournament.id),
                tournamentService.getTeamMinigameStandings(selectedTournament.id),
            ]);
            setTMatches(newMatches);
            setTeamStandings(newStandings);
            setActiveSchedule(null);
            setSchedScore1('');
            setSchedScore2('');
        } catch (err) {
            console.error(err);
            alert('Lỗi khi ghi nhận kết quả.');
        } finally {
            setSubmittingScore(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('Xóa trận này khỏi lịch?')) return;
        try {
            await scheduleService.deleteSchedule(id);
            setMatchSchedules(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
            alert('Lỗi khi xóa lịch trận.');
        }
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

    const playerToTeamMap = new Map<string, string>();
    Object.values(DEFAULT_TEAM_ROSTERS).forEach(team => {
        team.memberIds.forEach(mId => playerToTeamMap.set(mId, team.id));
    });

    const getTeamForPlayer = (playerId?: string) => {
        if (!playerId) return null;
        const teamId = playerToTeamMap.get(playerId);
        return teamId ? DEFAULT_TEAM_ROSTERS[teamId] : null;
    };

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

    // ─── LOADING SKELETON ───────────────────────────────────────────────────────
    const DetailSkeleton = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-row" style={{
                    height: '64px',
                    borderRadius: '14px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                    border: '1px solid rgba(255,255,255,0.05)'
                }} />
            ))}
        </div>
    );

    // ─── PLAYER LEADERBOARD LIST ─────────────────────────────────────────────────
    const PlayerLeaderboardList = ({ players: playerList }: { players: TournamentPlayerStats[] }) => (
        playerList.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.08)' }}>
                📭 Chưa có trận đấu nào được ghi nhận cho giải này.
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {playerList.map((player, idx) => (
                    <motion.div
                        key={player.playerId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        style={{
                            padding: '12px 16px',
                            background: idx === 0
                                ? 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))'
                                : idx < 3 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                            border: idx === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid var(--glass-border)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '28px', textAlign: 'center', flexShrink: 0 }}>
                                {getRankIcon(idx)}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>
                                    {player.name}
                                    {player.user_ad && <span style={{ fontSize: '0.7rem', color: 'var(--primary-neon)', marginLeft: '6px' }}>@{player.user_ad}</span>}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                                    {player.matches_played} trận · {player.wins} thắng · {player.losses} thua
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 900, color: 'var(--primary-neon)', fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                                {player.elo_rating}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ELO</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )
    );

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative' }}>

            <AnimatePresence mode="wait">

                {/* ═══════════════════════════════════════════════════════════════
                    TOURNAMENT LIST VIEW
                ═══════════════════════════════════════════════════════════════ */}
                {!selectedTournament && (
                    <motion.div
                        key="list-view"
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="fade-in"
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 className="neon-text heading-font" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Giải Đấu</h2>
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Quản lý giải đấu: Minigame Đồng Đội, Elo Hệ thống, Vòng Tròn & Knockout</p>
                            </div>
                            <button onClick={() => setShowAdd(true)} className="neon-btn" style={{ padding: '10px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', flexShrink: 0 }}>
                                <Plus size={18} /> Tạo giải mới
                            </button>
                        </div>

                        {/* Create Tournament Form */}
                        <AnimatePresence>
                            {showAdd && (
                                <motion.div
                                    initial={{ opacity: 0, y: -12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    className="glass-card"
                                    style={{ padding: '24px', marginBottom: '24px', borderRadius: '20px' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                        <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>✨ Tạo Giải Đấu Mới</h3>
                                        <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                                            <X size={18} />
                                        </button>
                                    </div>
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

                        {/* Tournament Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
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
                                        whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}
                                        onClick={() => handleSelectTournament(t)}
                                        className="glass-card hover-row"
                                        style={{ padding: '20px', position: 'relative', borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                            {t.status === 'active' ? <Circle color="var(--primary-neon)" fill="var(--primary-neon)" size={10} /> : <CheckCircle2 color="var(--success)" size={18} />}
                                        </div>
                                        <div style={{ padding: '10px', background: 'hsla(var(--secondary-neon-h), 100%, 50%, 0.1)', borderRadius: '14px', width: 'fit-content', marginBottom: '14px' }}>
                                            <Trophy color="var(--secondary-neon)" size={24} />
                                        </div>
                                        <h3 className="heading-font" style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'white' }}>{t.name}</h3>

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
                                                Xem chi tiết <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                    TOURNAMENT DETAIL VIEW (REPLACES MODAL)
                ═══════════════════════════════════════════════════════════════ */}
                {selectedTournament && (
                    <motion.div
                        key="detail-view"
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        ref={detailRef}
                    >
                        {/* ── BREADCRUMB NAV BAR ─────────────────────────────────────── */}
                        <div style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            background: 'rgba(15, 17, 26, 0.92)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            marginBottom: '20px',
                            padding: '12px 0',
                            borderBottom: '1px solid rgba(255,255,255,0.07)',
                        }}>
                            {/* Back button + title */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <motion.button
                                    whileTap={{ scale: 0.93 }}
                                    onClick={handleBack}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'white',
                                        padding: '8px 14px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        flexShrink: 0,
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                    <span className="back-btn-text">Danh sách</span>
                                </motion.button>

                                {/* Divider */}
                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem' }}>/</span>

                                {/* Tournament name + badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                    <div style={{ padding: '6px', background: 'rgba(255,215,0,0.1)', borderRadius: '10px', flexShrink: 0 }}>
                                        <Trophy color="gold" size={18} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="heading-font" style={{ fontWeight: 900, color: 'white', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {selectedTournament.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                            {getFormatBadge(selectedTournament.format)}
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>{new Date(selectedTournament.start_date).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status pill */}
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '10px',
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: selectedTournament.status === 'active' ? 'var(--primary-neon)' : 'var(--success)',
                                    background: selectedTournament.status === 'active' ? 'rgba(0,242,255,0.08)' : 'rgba(16,185,129,0.08)',
                                    border: `1px solid ${selectedTournament.status === 'active' ? 'rgba(0,242,255,0.25)' : 'rgba(16,185,129,0.25)'}`,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {selectedTournament.status === 'active'
                                        ? <><Circle size={6} fill="var(--primary-neon)" color="var(--primary-neon)" /> ĐANG DIỄN RA</>
                                        : <><CheckCircle2 size={12} /> KẾT THÚC</>
                                    }
                                </span>
                            </div>
                        </div>

                        {/* ── CONTENT AREA ──────────────────────────────────────────── */}
                        {selectedTournament.format === 'team_minigame' ? (
                            /* ════ TEAM MINIGAME FORMAT ════ */
                            <div>
                                {/* Subtabs — sticky below breadcrumb */}
                                <div style={{
                                    position: 'sticky',
                                    top: '73px',
                                    zIndex: 90,
                                    background: 'rgba(15,17,26,0.92)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    paddingBottom: '12px',
                                    marginBottom: '20px',
                                }}>
                                    <div className="no-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                                        {[
                                            { id: 'standings', label: 'BXH Đồng Đội', emoji: '🏆', icon: Award },
                                            { id: 'rosters', label: 'Danh Sách Đội', emoji: '👥', icon: Users },
                                            { id: 'schedule', label: 'Lịch & Kết Quả', emoji: '📅', icon: Calendar },
                                            { id: 'rules', label: 'Thể Lệ', emoji: '📜', icon: BookOpen },
                                            { id: 'individual', label: 'Elo Cá Nhân', emoji: '⭐', icon: Trophy },
                                        ].map(tab => {
                                            const isActive = teamTab === tab.id;
                                            return (
                                                <motion.button
                                                    key={tab.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setTeamTab(tab.id as any)}
                                                    style={{
                                                        padding: '9px 16px',
                                                        borderRadius: '12px',
                                                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                                        background: isActive ? 'linear-gradient(135deg, #eab308, #f97316)' : 'rgba(255,255,255,0.04)',
                                                        color: isActive ? '#000' : 'var(--text-dim)',
                                                        fontWeight: 800,
                                                        fontSize: '0.78rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        whiteSpace: 'nowrap',
                                                        transition: 'all 0.18s ease',
                                                        boxShadow: isActive ? '0 4px 12px rgba(234,179,8,0.3)' : 'none',
                                                    }}
                                                >
                                                    <span>{tab.emoji}</span>
                                                    <span>{tab.label}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Tab content */}
                                {loadingDetail ? (
                                    <DetailSkeleton />
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={teamTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* TEAM STANDINGS */}
                                            {teamTab === 'standings' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {/* Leader Banner */}
                                                    {teamStandings.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.97 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(249,115,22,0.06))', padding: '18px 20px', borderRadius: '18px', border: '1px solid rgba(234,179,8,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                <Trophy size={36} color="#eab308" fill="#eab308" />
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#eab308', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ĐẦU BẢNG LŨY KẾ</div>
                                                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{teamStandings[0].teamName}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#eab308', fontFamily: 'var(--font-heading)' }}>
                                                                    {teamStandings[0].totalPoints} <span style={{ fontSize: '0.9rem' }}>ĐIỂM</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{teamStandings[0].wins} trận thắng · +{teamStandings[0].weeklyBonus}đ thưởng tuần</div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>Bảng Xếp Hạng Đồng Đội Lũy Kế</h3>

                                                    <div style={{ overflowX: 'auto', background: '#161928', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <table className="standings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', minWidth: '460px' }}>
                                                            <thead>
                                                                <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                                                                    <th style={{ padding: '12px 14px' }}>Hạng</th>
                                                                    <th style={{ padding: '12px 14px' }}>Đội</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>ST</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thắng</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hiệu Số</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#eab308' }}>+Thưởng Tuần</th>
                                                                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'gold' }}>Tổng</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {teamStandings.map((ts, idx) => (
                                                                    <tr key={ts.teamId} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '12px 14px', fontWeight: 800 }}>{getRankIcon(idx)}</td>
                                                                        <td style={{ padding: '12px 14px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                {getTeamBadge(ts.teamId)}
                                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({ts.members.length} VĐV)</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>{ts.played}</td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{ts.wins}</td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: ts.scoreDiff >= 0 ? 'var(--primary-neon)' : '#ef4444' }}>
                                                                            {ts.scoreDiff > 0 ? `+${ts.scoreDiff}` : ts.scoreDiff}
                                                                        </td>
                                                                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#eab308' }}>+{ts.weeklyBonus}đ</td>
                                                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, fontSize: '1.25rem', color: 'gold', fontFamily: 'var(--font-heading)' }}>{ts.totalPoints}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* TEAM ROSTERS */}
                                            {teamTab === 'rosters' && (
                                                <div>
                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', marginBottom: '14px' }}>Danh Sách 4 Đội Tham Dự</h3>
                                                    <div className="team-roster-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                                                        {Object.values(DEFAULT_TEAM_ROSTERS).map(roster => {
                                                            const tStat = teamStandings.find(s => s.teamId === roster.id);
                                                            return (
                                                                <motion.div
                                                                    key={roster.id}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    style={{ background: '#161928', borderRadius: '16px', border: `1.5px solid ${roster.color}40`, overflow: 'hidden' }}
                                                                >
                                                                    <div style={{ background: roster.color, color: '#000', fontWeight: 900, fontSize: '1rem', textAlign: 'center', padding: '10px', letterSpacing: '0.05em' }}>
                                                                        {roster.name.toUpperCase()}
                                                                    </div>
                                                                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {tStat?.members.map(m => (
                                                                            <div key={m.id} style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <span style={{ color: roster.color }}>•</span> {m.name}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* WEEKLY SCHEDULE */}
                                            {teamTab === 'schedule' && (() => {
                                                const weekSchedules = matchSchedules.filter(s => s.week === selectedWeek);
                                                const courtGroups: Record<string, MatchSchedule[]> = {};
                                                weekSchedules.forEach(s => {
                                                    const c = s.court || 'Khác';
                                                    if (!courtGroups[c]) courtGroups[c] = [];
                                                    courtGroups[c].push(s);
                                                });
                                                const completedCount = weekSchedules.filter(s => s.status === 'completed').length;
                                                const pendingCount = weekSchedules.filter(s => s.status === 'pending').length;

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        {/* Week Switcher */}
                                                        <div className="weekly-switcher" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                                            {[
                                                                { week: 1, label: 'Tuần 1', date: '12/08', matchDesc: 'A vs B · C vs D' },
                                                                { week: 2, label: 'Tuần 2', date: '19/08', matchDesc: 'A vs C · B vs D' },
                                                                { week: 3, label: 'Tuần 3', date: '26/08', matchDesc: 'A vs D · B vs C' },
                                                            ].map(w => {
                                                                const isActive = selectedWeek === w.week;
                                                                const wCount = matchSchedules.filter(s => s.week === w.week).length;
                                                                const wDone = matchSchedules.filter(s => s.week === w.week && s.status === 'completed').length;
                                                                return (
                                                                    <motion.button
                                                                        key={w.week}
                                                                        whileTap={{ scale: 0.96 }}
                                                                        onClick={() => setSelectedWeek(w.week)}
                                                                        style={{
                                                                            padding: '12px',
                                                                            borderRadius: '14px',
                                                                            border: isActive ? '1.5px solid var(--primary-neon)' : '1px solid var(--glass-border)',
                                                                            background: isActive ? 'rgba(0,242,255,0.1)' : 'rgba(255,255,255,0.02)',
                                                                            color: isActive ? 'var(--primary-neon)' : 'white',
                                                                            fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                                                            textAlign: 'center', transition: 'all 0.18s ease',
                                                                            boxShadow: isActive ? '0 4px 16px rgba(0,242,255,0.15)' : 'none',
                                                                        }}
                                                                    >
                                                                        <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{w.label}</div>
                                                                        <div style={{ fontSize: '0.72rem', color: isActive ? 'rgba(0,242,255,0.7)' : 'var(--text-dim)', marginTop: '2px' }}>📅 {w.date}</div>
                                                                        <div style={{ fontSize: '0.65rem', opacity: 0.75, marginTop: '2px' }}>{w.matchDesc}</div>
                                                                        {wCount > 0 && (
                                                                            <div style={{ marginTop: '6px', fontSize: '0.65rem', background: isActive ? 'rgba(0,242,255,0.15)' : 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px 6px', display: 'inline-block', fontWeight: 700 }}>
                                                                                {wDone}/{wCount} trận
                                                                            </div>
                                                                        )}
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Header + Add Button */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                                            <div>
                                                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <ClipboardList size={16} color="var(--primary-neon)" /> Lịch Tuần {selectedWeek}
                                                                </h3>
                                                                {weekSchedules.length > 0 && (
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                                                                        <span style={{ color: '#10b981' }}>✓ {completedCount} có KQ</span>
                                                                        {pendingCount > 0 && <span style={{ marginLeft: '8px', color: '#f97316' }}>⏳ {pendingCount} chờ KQ</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => { setNewFixtureWeek(selectedWeek); setShowAddFixture(true); }}
                                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(0,242,255,0.05))', border: '1px solid rgba(0,242,255,0.3)', color: 'var(--primary-neon)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                                            >
                                                                <Plus size={14} /> Thêm lịch trận
                                                            </motion.button>
                                                        </div>

                                                        {/* Add Fixture Form */}
                                                        <AnimatePresence>
                                                            {showAddFixture && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -10 }}
                                                                    style={{ background: '#111827', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--primary-neon)', fontSize: '0.9rem' }}>📋 Nhập lịch thi đấu Tuần {newFixtureWeek}</h4>
                                                                        <button onClick={() => setShowAddFixture(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
                                                                    </div>

                                                                    {/* Meta: Week + Date */}
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Tuần</label>
                                                                            <select value={newFixtureWeek} onChange={e => setNewFixtureWeek(Number(e.target.value))}
                                                                                style={{ width: '100%', background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '10px', padding: '8px 10px', fontSize: '0.82rem' }}>
                                                                                <option value={1}>Tuần 1 (12/08)</option>
                                                                                <option value={2}>Tuần 2 (19/08)</option>
                                                                                <option value={3}>Tuần 3 (26/08)</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Ngày thi đấu</label>
                                                                            <input type="date" value={newFixtureDate} onChange={e => setNewFixtureDate(e.target.value)}
                                                                                style={{ width: '100%', background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '10px', padding: '8px 10px', fontSize: '0.82rem', boxSizing: 'border-box' }} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Fixture rows */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                                                                        {newFixtures.map((f, i) => {
                                                                            const sideATeamId = playerToTeamMap.get(f.team1_player1_id) || null;
                                                                            const sideBTeamId = playerToTeamMap.get(f.team2_player1_id) || null;
                                                                            const allPlayersA = sideATeamId ? players.filter(p => playerToTeamMap.get(p.id) === sideATeamId) : players;
                                                                            const allPlayersB = sideBTeamId ? players.filter(p => playerToTeamMap.get(p.id) === sideBTeamId && playerToTeamMap.get(p.id) !== sideATeamId) : players.filter(p => playerToTeamMap.get(p.id) !== sideATeamId);

                                                                            const updateFixture = (key: string, val: string | number) => {
                                                                                setNewFixtures(prev => prev.map((row, idx) => idx === i ? { ...row, [key]: val } : row));
                                                                            };

                                                                            return (
                                                                                <div key={i} style={{ background: '#161928', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-dim)' }}>Trận #{i + 1}</span>
                                                                                        {newFixtures.length > 1 && (
                                                                                            <button onClick={() => setNewFixtures(prev => prev.filter((_, idx) => idx !== i))}
                                                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                                                                                                <Trash2 size={14} />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Sân + Thứ tự + Nhãn đội */}
                                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px', gap: '8px', marginBottom: '10px' }}>
                                                                                        <div>
                                                                                            <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Sân</label>
                                                                                            <input value={f.court} onChange={e => updateFixture('court', e.target.value)} placeholder="Sân 6"
                                                                                                style={{ width: '100%', background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>#Thứ tự</label>
                                                                                            <input type="number" value={f.match_order} onChange={e => updateFixture('match_order', Number(e.target.value))} min={1}
                                                                                                style={{ width: '100%', background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>Cặp đội</label>
                                                                                            <input value={f.matchup_label} onChange={e => updateFixture('matchup_label', e.target.value)} placeholder="A-C"
                                                                                                style={{ width: '100%', background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.8rem', boxSizing: 'border-box' }} />
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* Players */}
                                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary-neon)' }}>Bên 1</label>
                                                                                            <select value={f.team1_player1_id} onChange={e => updateFixture('team1_player1_id', e.target.value)}
                                                                                                style={{ background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.78rem' }}>
                                                                                                <option value="">-- VĐV 1 --</option>
                                                                                                {players.filter(p => playerToTeamMap.get(p.id) !== sideBTeamId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                            </select>
                                                                                            <select value={f.team1_player2_id} onChange={e => updateFixture('team1_player2_id', e.target.value)}
                                                                                                style={{ background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.78rem' }}>
                                                                                                <option value="">-- VĐV 2 (đôi) --</option>
                                                                                                {allPlayersA.filter(p => p.id !== f.team1_player1_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                            <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--secondary-neon)' }}>Bên 2</label>
                                                                                            <select value={f.team2_player1_id} onChange={e => updateFixture('team2_player1_id', e.target.value)}
                                                                                                style={{ background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.78rem' }}>
                                                                                                <option value="">-- VĐV 1 --</option>
                                                                                                {players.filter(p => playerToTeamMap.get(p.id) !== sideATeamId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                            </select>
                                                                                            <select value={f.team2_player2_id} onChange={e => updateFixture('team2_player2_id', e.target.value)}
                                                                                                style={{ background: '#1e2337', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '6px 8px', fontSize: '0.78rem' }}>
                                                                                                <option value="">-- VĐV 2 (đôi) --</option>
                                                                                                {allPlayersB.filter(p => p.id !== f.team2_player1_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                                        <button
                                                                            onClick={() => setNewFixtures(prev => [...prev, { court: prev[prev.length - 1]?.court || '', match_order: (prev[prev.length - 1]?.match_order || 0) + 1, matchup_label: '', team1_player1_id: '', team1_player2_id: '', team2_player1_id: '', team2_player2_id: '' }])}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'var(--text-dim)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                                                        >
                                                                            <Plus size={13} /> Thêm trận
                                                                        </button>
                                                                        <button
                                                                            onClick={handleSaveNewFixtures}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary-neon), #00b4d8)', border: 'none', color: '#000', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                                                                        >
                                                                            <Check size={14} /> Lưu lịch ({newFixtures.filter(f => f.team1_player1_id && f.team2_player1_id).length} trận)
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                                                        {/* Schedule List grouped by court */}
                                                        {weekSchedules.length === 0 ? (
                                                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                                                📭 Chưa có lịch trận nào. Bấm <strong style={{ color: 'var(--primary-neon)' }}>+ Thêm lịch trận</strong> để nhập lịch.
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                                                {Object.entries(courtGroups).sort(([a], [b]) => a.localeCompare(b)).map(([court, matches]) => (
                                                                    <div key={court}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-neon)', display: 'inline-block', flexShrink: 0 }} />
                                                                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'white' }}>{court}</span>
                                                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{matches.length} trận đấu</span>
                                                                        </div>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                                                                            {matches.map((s, idx) => {
                                                                                const t1 = getTeamForPlayer(s.team1_player1_id) || getTeamForPlayer(s.team1_player2_id);
                                                                                const t2 = getTeamForPlayer(s.team2_player1_id) || getTeamForPlayer(s.team2_player2_id);
                                                                                const isPending = s.status === 'pending';

                                                                                return (
                                                                                    <motion.div
                                                                                        key={s.id}
                                                                                        initial={{ opacity: 0, y: 6 }}
                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                        transition={{ delay: idx * 0.03 }}
                                                                                        style={{
                                                                                            padding: '12px 14px',
                                                                                            borderRadius: '14px',
                                                                                            background: isPending ? '#12151f' : '#171a2b',
                                                                                            border: isPending ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(16,185,129,0.25)',
                                                                                            display: 'flex', flexDirection: 'column', gap: '8px',
                                                                                            position: 'relative',
                                                                                        }}
                                                                                    >
                                                                                        {/* Card header */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                {s.matchup_label && (
                                                                                                    <span style={{ fontWeight: 800, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '5px' }}>{s.matchup_label}</span>
                                                                                                )}
                                                                                                <span style={{ color: isPending ? '#f97316' : '#10b981', fontWeight: 800 }}>
                                                                                                    {isPending ? '⏳ Chờ KQ' : '✓ Có KQ'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                                                {isPending && (
                                                                                                    <button
                                                                                                        onClick={() => { setActiveSchedule(s); setSchedScore1(''); setSchedScore2(''); }}
                                                                                                        title="Nhập kết quả"
                                                                                                        style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.3)', color: 'var(--primary-neon)', borderRadius: '6px', padding: '3px 7px', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                                                                                                    >
                                                                                                        <Pencil size={10} /> KQ
                                                                                                    </button>
                                                                                                )}
                                                                                                <button
                                                                                                    onClick={() => handleDeleteSchedule(s.id)}
                                                                                                    title="Xóa"
                                                                                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '6px', padding: '3px 5px', cursor: 'pointer' }}
                                                                                                >
                                                                                                    <Trash2 size={10} />
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Team matchup badge */}
                                                                                        {t1 && t2 && (
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                                                <span style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 800, background: t1.badgeBg, color: t1.color, border: `1px solid ${t1.color}40` }}>{t1.name}</span>
                                                                                                <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 800 }}>VS</span>
                                                                                                <span style={{ padding: '1px 7px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 800, background: t2.badgeBg, color: t2.color, border: `1px solid ${t2.color}40` }}>{t2.name}</span>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Bên 1 */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                                                                {t1 && <span style={{ fontSize: '0.62rem', fontWeight: 900, color: t1.color, background: t1.badgeBg, padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>{t1.id}</span>}
                                                                                                <span style={{
                                                                                                    fontWeight: !isPending && s.match_id ? 900 : 600,
                                                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                                                    color: 'white',
                                                                                                }}>
                                                                                                    {s.p1?.name || '—'}{s.p1b?.name ? ` & ${s.p1b.name}` : ''}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Bên 2 */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                                                                {t2 && <span style={{ fontSize: '0.62rem', fontWeight: 900, color: t2.color, background: t2.badgeBg, padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>{t2.id}</span>}
                                                                                                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>
                                                                                                    {s.p2?.name || '—'}{s.p2b?.name ? ` & ${s.p2b.name}` : ''}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Score (if completed) */}
                                                                                        {!isPending && (
                                                                                            <div style={{ marginTop: '2px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                                                                                                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 900, color: 'gold', letterSpacing: '0.1em' }}>
                                                                                                    {/* Score shown via tMatches lookup */}
                                                                                                    {(() => {
                                                                                                        const m = tMatches.find(tm => tm.id === s.match_id);
                                                                                                        return m ? `${m.team1_score} – ${m.team2_score}` : '— – —';
                                                                                                    })()}
                                                                                                </span>
                                                                                            </div>
                                                                                        )}
                                                                                    </motion.div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* RULES TAB */}
                                            {teamTab === 'rules' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                    <div style={{ background: '#161928', padding: '18px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <h4 style={{ color: 'gold', fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>1.</span> Thể thức thi đấu
                                                        </h4>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '7px', lineHeight: 1.6 }}>
                                                            <li>Giải gồm 04 đội (Đội A, Đội B, Đội C, Đội D), mỗi đội có 4-5 thành viên.</li>
                                                            <li>Thi đấu trong 03 tuần, mỗi tuần sử dụng 02 sân trong thời gian 02 giờ.</li>
                                                            <li><strong style={{ color: 'white' }}>Lịch thi đấu chính thức:</strong></li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 1 (12/08): Đội A vs Đội B | Đội C vs Đội D</li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 2 (19/08): Đội A vs Đội C | Đội B vs Đội D</li>
                                                            <li style={{ paddingLeft: '14px', color: 'var(--primary-neon)' }}>• Tuần 3 (26/08): Đội A vs Đội D | Đội B vs Đội C</li>
                                                            <li>Mỗi cặp đội thi đấu nhiều trận trong khung thời gian quy định.</li>
                                                            <li>Mỗi đội tự sắp xếp đội hình và phân bổ người chơi, đảm bảo mọi thành viên đều tham gia.</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{ background: '#161928', padding: '18px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                        <h4 style={{ color: 'gold', fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px' }}>2. Quy tắc tính điểm</h4>
                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>Điểm thi đấu tuần:</div>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                                                            <li>Mỗi trận thắng: +1 điểm.</li>
                                                            <li>Mỗi trận thua: 0 điểm.</li>
                                                            <li>Đội có tổng trận thắng nhiều hơn được công nhận <strong style={{ color: '#eab308' }}>Đội Nhất tuần</strong> và thưởng <strong style={{ color: '#eab308' }}>+2 điểm</strong> lũy kế.</li>
                                                        </ul>
                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>Điểm lũy kế chung cuộc:</div>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            <li><strong>Điểm chung cuộc</strong> = Tổng điểm các trận thắng của 3 tuần + Điểm thưởng Nhất tuần − Điểm trừ.</li>
                                                            <li>Đội có tổng điểm cao nhất sau 3 tuần là <strong style={{ color: '#eab308' }}>Đội Vô địch</strong>.</li>
                                                        </ul>
                                                    </div>

                                                    <div style={{ background: '#161928', padding: '18px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                        <h4 style={{ color: '#ef4444', fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <ShieldAlert size={16} /> 3. Quy định trừ điểm & Xếp hạng bằng điểm
                                                        </h4>
                                                        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                                                            <li>Đội không đủ 04 thành viên mà không báo trước Ban Tổ chức sẽ bị trừ 01 điểm lũy kế.</li>
                                                            <li>Các trường hợp đặc biệt sẽ do Ban Tổ chức xem xét và quyết định.</li>
                                                        </ul>
                                                        <div style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>Thứ tự ưu tiên khi bằng điểm:</div>
                                                        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            <li>Tổng điểm lũy kế.</li>
                                                            <li>Tổng số trận thắng.</li>
                                                            <li>Hiệu số điểm ghi − điểm thua.</li>
                                                            <li>Kết quả đối đầu trực tiếp.</li>
                                                            <li>Quyết định của Ban Tổ chức.</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            )}

                                            {/* INDIVIDUAL ELO */}
                                            {teamTab === 'individual' && (
                                                <div>
                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px', color: 'white' }}>
                                                        🏆 Bảng Xếp Hạng Elo Cá Nhân ({tLeaderboard.length} VĐV)
                                                    </h3>
                                                    <PlayerLeaderboardList players={tLeaderboard} />
                                                </div>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        ) : (
                            /* ════ STANDARD FORMATS (ELO_ONLY / ROUND_ROBIN / KNOCKOUT) ════ */
                            <div>
                                {/* Tabs (for non-elo_only formats) */}
                                {selectedTournament.format && selectedTournament.format !== 'elo_only' && (
                                    <div style={{
                                        position: 'sticky',
                                        top: '73px',
                                        zIndex: 90,
                                        background: 'rgba(15,17,26,0.92)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        paddingBottom: '12px',
                                        marginBottom: '20px',
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <motion.button
                                                whileTap={{ scale: 0.96 }}
                                                onClick={() => setActiveTab('bracket')}
                                                style={{
                                                    padding: '9px 18px',
                                                    borderRadius: '12px',
                                                    border: activeTab === 'bracket' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                    background: activeTab === 'bracket' ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'rgba(255,255,255,0.04)',
                                                    color: activeTab === 'bracket' ? '#000' : 'var(--text-dim)',
                                                    fontWeight: 800,
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    boxShadow: activeTab === 'bracket' ? '0 4px 12px rgba(0,242,255,0.2)' : 'none',
                                                    transition: 'all 0.18s ease',
                                                }}
                                            >
                                                📅 {selectedTournament.format === 'round_robin' ? 'Lịch Đấu & BXH Bảng' : 'Cây Thi Đấu Bracket'}
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.96 }}
                                                onClick={() => setActiveTab('leaderboard')}
                                                style={{
                                                    padding: '9px 18px',
                                                    borderRadius: '12px',
                                                    border: activeTab === 'leaderboard' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                    background: activeTab === 'leaderboard' ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'rgba(255,255,255,0.04)',
                                                    color: activeTab === 'leaderboard' ? '#000' : 'var(--text-dim)',
                                                    fontWeight: 800,
                                                    fontSize: '0.85rem',
                                                    cursor: 'pointer',
                                                    boxShadow: activeTab === 'leaderboard' ? '0 4px 12px rgba(0,242,255,0.2)' : 'none',
                                                    transition: 'all 0.18s ease',
                                                }}
                                            >
                                                🏆 BXH Elo Giải Đấu
                                            </motion.button>
                                        </div>
                                    </div>
                                )}

                                {loadingDetail ? (
                                    <DetailSkeleton />
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* BRACKET TAB */}
                                            {activeTab === 'bracket' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                    {/* Round Robin Live Standings */}
                                                    {selectedTournament.format === 'round_robin' && (
                                                        <div>
                                                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'gold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                📊 Bảng Xếp Hạng Vòng Tròn
                                                            </h3>
                                                            {rrStandings.length === 0 ? (
                                                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                                                    Chưa có trận vòng tròn nào hoàn thành.
                                                                </div>
                                                            ) : (
                                                                <div style={{ overflowX: 'auto', background: '#161928', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                                                        <thead>
                                                                            <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                                <th style={{ padding: '10px 14px' }}>Hạng</th>
                                                                                <th style={{ padding: '10px 14px' }}>VĐV</th>
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
                                                                                    <td style={{ padding: '10px 14px', fontWeight: 800 }}>{getRankIcon(idx)}</td>
                                                                                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'white' }}>{row.name}</td>
                                                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.played}</td>
                                                                                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--success)' }}>{row.wins}</td>
                                                                                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--error)' }}>{row.losses}</td>
                                                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}</td>
                                                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: 'var(--primary-neon)' }}>{row.points}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Fixtures */}
                                                    <div>
                                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', marginBottom: '12px' }}>
                                                            {selectedTournament.format === 'knockout' ? '⚡ Sơ Đồ Cây Thi Đấu Knockout' : '📅 Lịch Các Vòng Đấu'}
                                                        </h3>
                                                        {fixtures.length === 0 ? (
                                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                                                Chưa có lịch thi đấu được khởi tạo.
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                {Object.keys(roundsMap).map(roundNumStr => {
                                                                    const roundNum = Number(roundNumStr);
                                                                    const roundFixtures = roundsMap[roundNum];
                                                                    const totalRounds = Object.keys(roundsMap).length;
                                                                    const roundLabel = selectedTournament.format === 'knockout'
                                                                        ? (roundNum === totalRounds ? '🏆 TRẬN CHUNG KẾT' : `Vòng ${roundNum}`)
                                                                        : `Vòng ${roundNum}`;
                                                                    return (
                                                                        <div key={roundNum} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                                                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-neon)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                                                {roundLabel}
                                                                            </div>
                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                                                                {roundFixtures.map(fix => (
                                                                                    <div
                                                                                        key={fix.id}
                                                                                        style={{
                                                                                            padding: '12px 14px',
                                                                                            borderRadius: '12px',
                                                                                            background: fix.status === 'completed' ? 'rgba(16,185,129,0.05)' : '#1b2033',
                                                                                            border: fix.status === 'completed' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
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
                                                                                        {fix.player1_id && fix.player2_id && (
                                                                                            <motion.button
                                                                                                whileTap={{ scale: 0.95 }}
                                                                                                onClick={() => { setActiveFixture(fix); setScore1(fix.score1 ?? ''); setScore2(fix.score2 ?? ''); }}
                                                                                                style={{ marginTop: '4px', padding: '5px 10px', borderRadius: '8px', border: 'none', background: 'rgba(0,242,255,0.1)', color: 'var(--primary-neon)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                                                            >
                                                                                                {fix.status === 'completed' ? '✏️ Sửa Tỷ Số' : '🎯 Nhập Tỷ Số'}
                                                                                            </motion.button>
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

                                            {/* LEADERBOARD TAB */}
                                            {activeTab === 'leaderboard' && (
                                                <div>
                                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        🏆 Bảng Xếp Hạng Elo Giải Đấu
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>({tLeaderboard.length} VĐV)</span>
                                                    </h3>
                                                    <PlayerLeaderboardList players={tLeaderboard} />
                                                </div>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        )}

                        {/* Bottom back button (for long content) */}
                        <div style={{ marginTop: '32px', paddingBottom: '16px' }}>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={handleBack}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--text-dim)',
                                    padding: '10px 18px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    margin: '0 auto',
                                }}
                            >
                                <ChevronLeft size={16} /> Quay lại danh sách giải đấu
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SCORE ENTRY DIALOG ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {activeFixture && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveFixture(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 10000,
                            background: 'rgba(0,0,0,0.82)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.88, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.88, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '360px', padding: '24px', borderRadius: '22px', border: '1px solid rgba(0,242,255,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>🎯 Nhập Tỷ Số</h3>
                                <button onClick={() => setActiveFixture(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveFixtureScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary-neon)', marginBottom: '8px' }}>{activeFixture.player1_name}</div>
                                        <input
                                            type="number"
                                            value={score1}
                                            onChange={e => setScore1(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0"
                                            required
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '54px', padding: '0' }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-dim)' }}>VS</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--secondary-neon)', marginBottom: '8px' }}>{activeFixture.player2_name}</div>
                                        <input
                                            type="number"
                                            value={score2}
                                            onChange={e => setScore2(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0"
                                            required
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '54px', padding: '0' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={() => setActiveFixture(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                                    <button type="submit" className="neon-btn" style={{ flex: 1, padding: '11px', borderRadius: '12px' }}>Lưu Tỷ Số</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SCHEDULE SCORE ENTRY MODAL ──────────────────────────────────────── */}
            <AnimatePresence>
                {activeSchedule && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { setActiveSchedule(null); }}
                        style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
                    >
                        <motion.div
                            initial={{ scale: 0.88, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.88, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '380px', padding: '24px', borderRadius: '22px', border: '1px solid rgba(0,242,255,0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>🎯 Nhập Kết Quả Trận</h3>
                                <button onClick={() => setActiveSchedule(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            {activeSchedule.matchup_label && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
                                    Cặp đội: <strong style={{ color: 'gold' }}>{activeSchedule.matchup_label}</strong>
                                    {activeSchedule.court && <> · {activeSchedule.court}</>}
                                </div>
                            )}
                            <form onSubmit={handleRecordScheduleScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                    {/* Side 1 */}
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        {(() => {
                                            const t1 = getTeamForPlayer(activeSchedule.team1_player1_id) || getTeamForPlayer(activeSchedule.team1_player2_id);
                                            return t1 && <div style={{ fontSize: '0.65rem', fontWeight: 900, color: t1.color, background: t1.badgeBg, padding: '1px 6px', borderRadius: '5px', display: 'inline-block', marginBottom: '4px' }}>{t1.name}</div>;
                                        })()}
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--primary-neon)', marginBottom: '8px', lineHeight: 1.3 }}>
                                            {activeSchedule.p1?.name || '—'}
                                            {activeSchedule.p1b?.name && <><br /><span style={{ fontSize: '0.72rem' }}>{activeSchedule.p1b.name}</span></>}
                                        </div>
                                        <input
                                            type="number" min={0} value={schedScore1}
                                            onChange={e => setSchedScore1(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0" required autoFocus
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '54px', padding: '0', width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'center', paddingTop: '52px' }}>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-dim)' }}>VS</div>
                                    </div>
                                    {/* Side 2 */}
                                    <div style={{ flex: 1, textAlign: 'center' }}>
                                        {(() => {
                                            const t2 = getTeamForPlayer(activeSchedule.team2_player1_id) || getTeamForPlayer(activeSchedule.team2_player2_id);
                                            return t2 && <div style={{ fontSize: '0.65rem', fontWeight: 900, color: t2.color, background: t2.badgeBg, padding: '1px 6px', borderRadius: '5px', display: 'inline-block', marginBottom: '4px' }}>{t2.name}</div>;
                                        })()}
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--secondary-neon)', marginBottom: '8px', lineHeight: 1.3 }}>
                                            {activeSchedule.p2?.name || '—'}
                                            {activeSchedule.p2b?.name && <><br /><span style={{ fontSize: '0.72rem' }}>{activeSchedule.p2b.name}</span></>}
                                        </div>
                                        <input
                                            type="number" min={0} value={schedScore2}
                                            onChange={e => setSchedScore2(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="0" required
                                            style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, height: '54px', padding: '0', width: '100%' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={() => setActiveSchedule(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Hủy</button>
                                    <button type="submit" className="neon-btn" disabled={submittingScore} style={{ flex: 1, padding: '11px', borderRadius: '12px', opacity: submittingScore ? 0.7 : 1 }}>
                                        {submittingScore ? 'Đang lưu...' : 'Lưu Kết Quả'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                @media (max-width: 768px) {
                    .weekly-switcher { grid-template-columns: 1fr !important; gap: 8px !important; }
                    .team-roster-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
                    .standings-table th, .standings-table td { padding: 8px 6px !important; font-size: 0.72rem !important; }
                    .back-btn-text { display: none; }
                }

                @media (max-width: 480px) {
                    .team-roster-grid { grid-template-columns: 1fr !important; }
                    .weekly-switcher { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};
