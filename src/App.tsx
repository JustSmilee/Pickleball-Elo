import { useState, useEffect } from 'react';
import './index.css';
import { Leaderboard } from './components/Leaderboard';
import { MatchForm } from './components/MatchForm';
import { PlayerForm } from './components/PlayerForm';
import { History } from './components/History';
import { PlayerProfile } from './components/PlayerProfile';
import { Compare } from './components/Compare';
import { Tournaments } from './components/Tournaments';
import { matchService } from './services/api';
import { LayoutDashboard, Trophy, List, PlusCircle, Users, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StatsCard = ({ label, value, sub, color = 'var(--primary-neon)' }: { label: string, value: string | number, sub: string, color?: string }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="glass-card"
    style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: color }}></div>
    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-cute)' }}>{label}</div>
    <div style={{ color: 'white', fontWeight: 900, fontSize: '2.5rem', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>{value}</div>
    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '8px' }}>{sub}</div>
  </motion.div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalMatches: 0, activePlayers: 0 });
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    matchService.getStats().then(setStats).catch(console.error);
  }, [activeTab]);

  const handleEditMatch = (match: any) => {
    setEditingMatch(match);
    setActiveTab('match');
  };

  const handleViewProfile = (player: any) => {
    setSelectedPlayer(player);
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
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bottom))' }}>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card desktop-nav"
        style={{
          margin: '20px auto',
          maxWidth: '1000px',
          padding: '0.6rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          position: 'sticky',
          top: '20px',
          zIndex: 100
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '12px 20px',
              borderRadius: '18px',
              border: 'none',
              background: activeTab === item.id ? 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))' : 'transparent',
              color: activeTab === item.id ? '#000' : 'var(--text-dim)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-cute)'
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </motion.nav>

      <main className="container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {activeTab === 'dashboard' && (
              <div style={{ display: 'grid', gap: '40px' }}>
                <header style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.h1
                    className="neon-text"
                    style={{ fontSize: '5rem', marginBottom: '0.5rem', fontWeight: 900 }}
                  >
                    PickleElo
                  </motion.h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', fontWeight: 500 }}>
                    Hệ thống xếp hạng Pickleball chuyên nghiệp
                  </p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <StatsCard label="Trận đấu" value={stats.totalMatches} sub="Đã ghi nhận" color="var(--primary-neon)" />
                  <StatsCard label="Người chơi" value={stats.activePlayers} sub="Đang thi đấu" color="var(--secondary-neon)" />
                  <motion.a
                    href="https://t.me/pickle_elo_rank_bot"
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="glass-card"
                    style={{ 
                      padding: '24px', 
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
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: '#0088cc' }}></div>
                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }}>
                      <svg width="100" height="100" viewBox="0 0 24 24" fill="#0088cc">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                    </div>
                    <div style={{ color: '#0088cc', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', fontFamily: 'var(--font-cute)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                      Kênh hỗ trợ
                    </div>
                    <div style={{ color: 'white', fontWeight: 900, fontSize: '1.8rem', fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>Telegram Bot</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '8px' }}>@pickle_elo_rank_bot</div>
                  </motion.a>
                </div>

                <div style={{ marginTop: '1rem' }}>
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
              <Tournaments />
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
      </div>

      <style>{`
        .desktop-nav { display: flex; }
        .mobile-nav-container { display: none; }

        @media (max-width: 768px) {
          .desktop-nav { display: none; }
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
        }

        @media (max-width: 380px) {
          .nav-item span {
            font-size: 0.55rem !important;
          }
          .nav-icon-wrapper {
            padding: 6px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
