import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnekxppiibujqrnzddgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZWt4cHBpaWJ1anFybnpkZGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzY3MzcsImV4cCI6MjA4Njc1MjczN30.MeFj5BPAa5oMeCph0Q6L_rZbZflypRJNiK_9ykMat1M';

const supabase = createClient(supabaseUrl, supabaseKey);

const updateData = `
MB00031943 Nguyễn Mạnh Thắng thangnm8
MB00030569 Nguyễn Văn Hải hainv5
MB00006811 Bùi Minh Đức ducbm.ho
MB00036571 Bùi Tăng Bảo Ngọc ngocbtb2
MB00017590 Hoàng Quang Vinh vinhhq
MB00034699 Đinh Anh Tiến tienda
MB00036195 Hoàng Trần Xuân Sơn sonhtx
MB00030248 Dương Việt Anh anhdv9
MB00040539 Trần Mạnh Cường cuongtm3
MB00017581 Nguyễn Lâm Trường truongnl
MB00031942 Dương Viết Đức ducdv1
MB00028781 Phan Hoàng Anh anhph9
MB00034698 Trần Việt Tùng tungtv
MB00030720 Doãn Hữu Thăng thangdh
MB00042576 Nguyễn Lê Anh anhnl7
MB00043279 Nguyễn Ngọc Tuấn tuannn7
MB00026280 Trần Đức Nhân nhantd
MB00033774 Trần Tuấn Hiệp hieptt3
MB00031731 Nguyễn Viết Chính chinhnv3
MB00036193 Nguyễn Hữu Tuấn Duy duynht
MB00042575 Nguyễn Mạnh Thắng thangnm12
MB00037736 Hà Vũ Đức Anh anhhvd
MB00026901 Tăng Khánh Thiện thientk
MB00029691 Nguyễn Tuấn Sơn sonnt13
MB00042180 Nguyễn Hoàng Minh Hiển hiennhm
MB00006390 Trần Hoàng Thành thanhth.ho
MB00032044 Nguyễn Huy Hoàng hoangnh26
`;

async function updateUserAds() {
    console.log('--- UPDATING USERADS ---');
    
    const lines = updateData.trim().split('\n');
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 3) continue;
        
        const mbCode = parts[0];
        const userAd = parts[parts.length - 1];
        const name = parts.slice(1, parts.length - 1).join(' ');
        
        console.log(`Updating ${name} -> ${userAd}...`);
        
        // Find player by name
        const { data: players, error: findError } = await supabase
            .from('players')
            .select('id, name')
            .eq('name', name);
            
        if (findError) {
            console.error(`Error finding ${name}:`, findError.message);
            continue;
        }
        
        if (players.length === 0) {
            console.warn(`Player not found: ${name}. Creating new player...`);
            const { error: insertError } = await supabase.from('players').insert({
                name,
                user_ad: userAd,
                elo_rating: 1200,
                matches_played: 0,
                wins: 0,
                losses: 0
            });
            if (insertError) console.error(`Error creating ${name}:`, insertError.message);
            else console.log(`Created player: ${name} with user_ad ${userAd}`);
        } else if (players.length === 1) {
            const { error: updateError } = await supabase
                .from('players')
                .update({ user_ad: userAd })
                .eq('id', players[0].id);
            if (updateError) console.error(`Error updating ${name}:`, updateError.message);
            else console.log(`Updated ${name}`);
        } else {
            // Multiple players with same name (like Nguyễn Mạnh Thắng)
            // We'll update the first one that doesn't have a user_ad yet, or just update all if needed.
            // But since we want to be precise, maybe we should check if they already have a user_ad.
            console.warn(`Found multiple players named ${name}. Updating first one without user_ad...`);
            const { data: vacantPlayers } = await supabase
                .from('players')
                .select('id')
                .eq('name', name)
                .is('user_ad', null);
            
            if (vacantPlayers && vacantPlayers.length > 0) {
                await supabase.from('players').update({ user_ad: userAd }).eq('id', vacantPlayers[0].id);
                console.log(`Updated one of the ${name} players.`);
            } else {
                console.log(`All players named ${name} already have user_ads. Creating a new one for this specific entry...`);
                 await supabase.from('players').insert({
                    name,
                    user_ad: userAd,
                    elo_rating: 1200,
                    matches_played: 0,
                    wins: 0,
                    losses: 0
                });
            }
        }
    }
    
    console.log('--- DONE ---');
}

updateUserAds();
