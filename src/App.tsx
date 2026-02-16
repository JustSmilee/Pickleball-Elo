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
                  <StatsCard label="Cập nhật" value={new Date().toLocaleDateString('vi-VN')} sub="Hôm nay" color="var(--accent-cute)" />
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
            justifyContent: 'space-around',
            padding: '12px 8px calc(12px + var(--safe-bottom))',
            borderRadius: '32px 32px 0 0',
            borderBottom: 'none'
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === item.id ? 'var(--primary-neon)' : 'var(--text-dim)',
                transition: 'all 0.3s ease',
                width: '60px'
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: '16px',
                  background: activeTab === item.id ? 'hsla(var(--primary-neon-h), 100%, 50%, 0.1)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-cute)' }}>{item.label}</span>
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
          }
          .neon-text { font-size: 3.5rem !important; }
        }
      `}</style>
    </div>
  );
}

export default App;
