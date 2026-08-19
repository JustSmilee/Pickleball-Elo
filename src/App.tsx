import { useState, useEffect } from 'react';
import './index.css';
import { Leaderboard } from './components/Leaderboard';
import { MatchForm } from './components/MatchForm';
import { PlayerForm } from './components/PlayerForm';
import { History } from './components/History';
import { PlayerProfile } from './components/PlayerProfile';
import { Compare } from './components/Compare';
import { Tournaments } from './components/Tournaments';
import { InstallPrompt } from './components/InstallPrompt';
import { matchService, tournamentService } from './services/api';
import type { Tournament } from './types';
import { LayoutDashboard, Trophy, List, PlusCircle, Users, BarChart, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';

const StatsCard = ({ label, value, sub, color = 'var(--primary-neon)' }: { label: string, value: string | number, sub: string, color?: string }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="glass-card stat-card-inner"
    style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }}></div>
    <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontFamily: 'var(--font-cute)' }}>{label}</div>
    <div className="stat-value" style={{ color: 'white', fontWeight: 900, fontSize: '1.6rem', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{value}</div>
    <div className="stat-sub" style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '4px' }}>{sub}</div>
  </motion.div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalMatches: 0, activePlayers: 0 });
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  useEffect(() => {
    matchService.getStats().then(setStats).catch(console.error);
    tournamentService.getAllTournaments().then(all => {
      const active = all.filter(t => t.status === 'active');
      setActiveTournaments(active);
    }).catch(console.error);
  }, [activeTab]);

  const handleEditMatch = (match: any) => {
    setEditingMatch(match);
    setActiveTab('match');
  };

  const handleViewProfile = (player: any) => {
    setSelectedPlayer(player);
  };

  const handleOpenTournament = (tourneyId: string) => {
    setSelectedTournamentId(tourneyId);
    setActiveTab('tournaments');
  };

  const navItems = [
    { id: 'dashboard', label: 'Bảng tin', icon: LayoutDashboard },
    { id: 'match', label: 'Ghi trận', icon: PlusCircle },
    { id: 'history', label: 'Lịch sử', icon: List },
    { id: 'leaderboard', label: 'Xếp hạng', icon: Trophy },
    { id: 'compare', label: 'So sánh', icon: BarChart },
    { id: 'tournaments', label: 'Giải đấu', icon: Users },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(70px + var(--safe-bottom))' }}>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card desktop-nav"
        style={{
          margin: '12px auto',
          maxWidth: '860px',
          padding: '0.4rem 0.6rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          position: 'sticky',
          top: '12px',
          zIndex: 100,
          borderRadius: '16px'
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === item.id ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'transparent',
              color: activeTab === item.id ? '#000' : 'var(--text-dim)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-cute)'
            }}
          >
            <item.icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </motion.nav>

      <main className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ position: 'relative', zIndex: activeTab === 'tournaments' ? 3000 : 1 }}
          >

            {activeTab === 'dashboard' && (
              <div style={{ display: 'grid', gap: '20px' }}>
                <header style={{ textAlign: 'center', padding: '10px 0' }}>
                  <motion.h1
                    className="neon-text"
                    style={{ fontSize: '2.75rem', marginBottom: '0.2rem', fontWeight: 900 }}
                  >
                    PickleElo
                  </motion.h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', fontWeight: 500 }}>
                    Hệ thống xếp hạng Pickleball chuyên nghiệp
                  </p>
                </header>

                {/* Stats Cards Section (Responsive: 1 row on mobile for matches & players) */}
                <div className="stats-dashboard-grid">
                  <div className="stats-cards-pair">
                    <StatsCard label="Trận đấu" value={stats.totalMatches} sub="Đã ghi nhận" color="var(--primary-neon)" />
                    <StatsCard label="Người chơi" value={stats.activePlayers} sub="Đang thi đấu" color="var(--secondary-neon)" />
                  </div>
                  <motion.a
                    href="https://t.me/pickle_elo_rank_bot"
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ y: -4 }}
                    className="glass-card telegram-card"
                    style={{ 
                      padding: '14px 18px', 
                      position: 'relative', 
                      overflow: 'hidden', 
                      textDecoration: 'none', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(0, 136, 204, 0.2), rgba(0, 136, 204, 0.05))',
                      border: '1px solid rgba(0, 136, 204, 0.3)'
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#0088cc' }}></div>
                    <div style={{ color: '#0088cc', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontFamily: 'var(--font-cute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                      Kênh hỗ trợ
                    </div>
                    <div style={{ color: 'white', fontWeight: 900, fontSize: '1.3rem', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>Telegram Bot</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '4px' }}>@pickle_elo_rank_bot</div>
                  </motion.a>
                </div>

                {/* Active Tournaments on Dashboard */}
                {activeTournaments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-neon)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Giải đấu đang diễn ra
                      </span>
                      <span
                        onClick={() => setActiveTab('tournaments')}
                        style={{ fontSize: '0.75rem', color: 'gold', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Tất cả giải đấu →
                      </span>
                    </div>

                    {activeTournaments.map(t => (
                      <motion.div
                        key={t.id}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleOpenTournament(t.id)}
                        className="glass-card"
                        style={{
                          padding: '16px 20px',
                          borderRadius: '18px',
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.12), rgba(234, 179, 8, 0.08))',
                          border: '1.5px solid rgba(0, 242, 255, 0.3)',
                          boxShadow: '0 8px 30px rgba(0, 242, 255, 0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ padding: '10px', background: 'rgba(234, 179, 8, 0.18)', borderRadius: '14px', flexShrink: 0 }}>
                            <Trophy color="gold" size={22} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: 'var(--success)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                ĐANG DIỄN RA
                              </span>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={12} /> {new Date(t.start_date).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <h3 className="heading-font" style={{ fontSize: '1.15rem', color: 'white', margin: 0, fontWeight: 900 }}>
                              {t.name}
                            </h3>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'gold', fontWeight: 800, fontSize: '0.85rem' }}>
                          Vào trang giải đấu <ArrowRight size={16} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '0.5rem' }}>
                  <PlayerForm onSuccess={() => setActiveTab('leaderboard')} />
                </div>
              </div>
            )}

            {activeTab === 'match' && (
              <MatchForm
                onSuccess={() => { setEditingMatch(null); setActiveTab('history'); }}
                editingMatch={editingMatch}
                onCancel={() => { setEditingMatch(null); setActiveTab('history'); }}
              />
            )}

            {activeTab === 'history' && (
              <History onEdit={handleEditMatch} />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard onViewProfile={handleViewProfile} />
            )}

            {activeTab === 'compare' && (
              <Compare />
            )}

            {activeTab === 'tournaments' && (
              <Tournaments
                initialTournamentId={selectedTournamentId}
                onClearInitialTournament={() => setSelectedTournamentId(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selectedPlayer && (
            <PlayerProfile
              player={selectedPlayer}
              onClose={() => setSelectedPlayer(null)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav-container">
        <div
          className="glass-card mobile-nav"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 4px calc(12px + var(--safe-bottom))',
            borderRadius: '24px 24px 0 0',
            borderBottom: 'none'
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                color: activeTab === item.id ? 'var(--primary-neon)' : 'var(--text-dim)',
                transition: 'all 0.3s ease',
                flex: '1',
                minWidth: 0,
                padding: '4px 2px'
              }}
            >
              <div
                className="nav-icon-wrapper"
                style={{
                  padding: '8px',
                  borderRadius: '12px',
                  background: activeTab === item.id ? 'hsla(var(--primary-neon-h), 100%, 50%, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '2px'
                }}
              >
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span style={{ 
                fontSize: '0.6rem', 
                fontWeight: 700, 
                fontFamily: 'var(--font-cute)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                textAlign: 'center'
              }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
        <InstallPrompt />
      </div>

      <style>{`
        .desktop-nav { display: flex; }
        .mobile-nav-container { display: none; }

        .stats-dashboard-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 14px;
        }

        .stats-cards-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-container { 
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(15, 17, 26, 0.8);
            backdrop-filter: blur(10px);
          }
          .neon-text { font-size: 3rem !important; }
          
          .container {
            padding-left: 12px !important;
            padding-right: 12px !important;
          }

          .stats-dashboard-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .stats-cards-pair {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          .stat-card-inner {
            padding: 10px 12px !important;
          }

          .stat-label {
            font-size: 0.65rem !important;
            margin-bottom: 2px !important;
          }

          .stat-value {
            font-size: 1.35rem !important;
          }

          .stat-sub {
            font-size: 0.62rem !important;
            margin-top: 2px !important;
          }

          .telegram-card {
            padding: 10px 14px !important;
          }
        }

        @media (max-width: 380px) {
          .nav-item span {
            font-size: 0.55rem !important;
          }
          .nav-icon-wrapper {
            padding: 6px !important;
          }
          .stat-value {
            font-size: 1.2rem !important;
          }
        }
      `}</style>
      <Analytics />
    </div>
  );
}

export default App;
