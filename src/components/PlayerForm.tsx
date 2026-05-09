import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus } from 'lucide-react';

export const PlayerForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const [name, setName] = useState('');
    const [userAd, setUserAd] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('players')
                .insert([{ 
                    name, 
                    user_ad: userAd.trim() || null,
                    elo_rating: 1200, 
                    matches_played: 0, 
                    wins: 0, 
                    losses: 0 
                }]);

            if (error) throw error;

            setName('');
            setUserAd('');
            alert('Đã thêm người chơi!');
            onSuccess();
        } catch (err) {
            console.error(err);
            alert('Lỗi khi thêm người chơi. Vui lòng kiểm tra lại cấu hình Supabase.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in glass-card" style={{ padding: '32px', border: 'none', background: 'hsla(var(--primary-neon-h), 100%, 50%, 0.05)' }}>
            <h3 className="neon-text" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem' }}>
                <UserPlus size={24} /> Thêm người chơi mới
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Tên người chơi</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="VD: Nguyễn Văn A..."
                        required
                        style={{ padding: '1.2rem' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>USERAD (Username MBBANK)</label>
                    <input
                        type="text"
                        value={userAd}
                        onChange={(e) => setUserAd(e.target.value)}
                        placeholder="VD: NGUYENVANA"
                        style={{ padding: '1.2rem' }}
                    />
                    <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        Dùng để bot Telegram nhận diện khi nhập liệu
                    </small>
                </div>
                <button
                    type="submit"
                    className="neon-btn"
                    disabled={loading}
                    style={{ width: '100%', gap: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px' }}
                >
                    <UserPlus size={20} /> {loading ? 'Đang thêm...' : 'Thêm vào hệ thống'}
                </button>
            </form>
        </div>
    );
};
