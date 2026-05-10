import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isStandalone) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, we show it after a small delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          zIndex: 2000,
        }}
      >
        {!isExpanded ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsExpanded(true)}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '21px',
              background: 'linear-gradient(135deg, var(--primary-neon), var(--secondary-neon))',
              border: 'none',
              boxShadow: '0 4px 15px rgba(0, 255, 159, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              cursor: 'pointer'
            }}
          >
            <Download size={20} />
          </motion.button>
        ) : (
          <motion.div 
            layoutId="install-card"
            className="glass-card"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              maxWidth: '280px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid var(--primary-neon)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: '20px'
            }}
          >
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>
                {isIOS ? 'Thêm vào MH chính' : 'Cài đặt PickleElo'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.2 }}>
                {isIOS 
                  ? 'Nhấn "Chia sẻ" -> "Thêm vào MH chính"' 
                  : 'Để truy cập nhanh & mượt hơn'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  style={{
                    background: 'var(--primary-neon)',
                    color: '#000',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cài
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};


