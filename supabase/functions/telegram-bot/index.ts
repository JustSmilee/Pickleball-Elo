import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

const K_FACTOR = 32

function calculateEloDelta(ratingA: number, ratingB: number, scoreA: number, scoreB: number): number {
    const winProbability = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
    const actualScore = scoreA > scoreB ? 1 : 0
    return Math.round(K_FACTOR * (actualScore - winProbability))
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup }),
    })
}

async function showMenu(chatId: number) {
    const menu = {
        inline_keyboard: [
            [{ text: "🏆 Bảng Xếp Hạng", callback_data: "intent:GET_LEADERBOARD" }, { text: "👤 Chỉ Số Của Tôi", callback_data: "intent:MY_STATS" }],
            [{ text: "⚖️ Chia Đội (4 người)", callback_data: "hint:BALANCE" }, { text: "🔮 Dự Đoán Tỉ Lệ", callback_data: "hint:PREDICT" }],
            [{ text: "🌐 Mở Trang Web", url: "https://pickleball-elo.vercel.app/" }]
        ]
    }
    await sendMessage(chatId, "🎾 <b>Pickleball Bot Menu</b>\nBạn muốn làm gì hôm nay?", menu)
}

async function handleIntent(chatId: number, intent: string, analysis: any, players: any[]) {
    // --- INTENT: GET_LEADERBOARD ---
    if (intent === "GET_LEADERBOARD") {
        const top = [...players].sort((a, b) => b.elo_rating - a.elo_rating).slice(0, 10)
        const list = top.map((p, i) => `${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1 + "."} <b>${p.name}</b>: <code>${p.elo_rating}</code> (${p.wins}W-${p.losses || 0}L)`).join("\n")
        await sendMessage(chatId, `🏆 <b>Bảng Xếp Hạng:</b>\n\n${list}\n\n<a href="https://pickleball-elo.vercel.app/">Xem chi tiết trên Web</a>`)
        return
    }

    // --- INTENT: GET_PLAYER_STATS ---
    if (intent === "GET_PLAYER_STATS") {
        const tgt = analysis.target?.toLowerCase().trim()
        const p = players.find(pl => 
            pl.name.toLowerCase().trim() === tgt || 
            (pl.user_ad && pl.user_ad.toLowerCase().trim() === tgt)
        )
        if (!p) {
            await sendMessage(chatId, `❌ Không thấy người chơi <b>"${analysis.target}"</b>.`)
            return
        }
        const badges = []
        if (p.elo_rating === Math.max(...players.map(pl => pl.elo_rating))) badges.push("👑 Số 1 Server")
        if (p.matches_played >= 10) badges.push("🎾 Lão Làng")
        if (p.wins >= 5) badges.push("🔥 Thắng Như Chẻ Tre")
        const badgeText = badges.length > 0 ? `\n\n🏅 <b>Huy chương:</b>\n${badges.map(b => `• ${b}`).join("\n")}` : ""
        await sendMessage(chatId, `👤 <b>${p.name}</b>\n\n📈 Elo: <code>${p.elo_rating}</code>\n🎮 Trận: ${p.matches_played}\n✅ Thắng: ${p.wins}\n❌ Thua: ${p.losses || 0}${badgeText}`)
        return
    }

    // --- INTENT: QUERY_H2H ---
    if (intent === "QUERY_H2H") {
        const n1 = analysis.p1?.toLowerCase().trim(), n2 = analysis.p2?.toLowerCase().trim()
        const findP = (name: string) => players.find(pl => 
            pl.name.toLowerCase().trim() === name || 
            (pl.user_ad && pl.user_ad.toLowerCase().trim() === name)
        )
        const p1 = findP(n1)
        const p2 = findP(n2)
        if (!p1 || !p2) {
            await sendMessage(chatId, `❌ Không thấy người chơi cần tìm.`)
            return
        }
        const { data: matches } = await supabase.from("matches").select("*")
            .or(`and(team1_player1_id.eq.${p1.id},team2_player1_id.eq.${p2.id}),and(team1_player1_id.eq.${p2.id},team2_player1_id.eq.${p1.id})`)
        const p1W = matches?.filter(m => (m.team1_player1_id === p1.id && m.team1_score > m.team2_score) || (m.team2_player1_id === p1.id && m.team2_score > m.team1_score)).length || 0
        const p2W = (matches?.length || 0) - p1W
        await sendMessage(chatId, `🤜🤛 <b>${p1.name} vs ${p2.name}</b>\n\nTổng: ${matches?.length || 0} trận\n- <b>${p1.name}</b>: ${p1W} thắng\n- <b>${p2.name}</b>: ${p2W} thắng\n\n${p1W > p2W ? `⭐ ${p1.name} nhỉnh hơn!` : p2W > p1W ? `⭐ ${p2.name} nhỉnh hơn!` : "⚖️ Huề!"}`)
        return
    }

    // --- INTENT: BALANCE_TEAMS ---
    if (intent === "BALANCE_TEAMS") {
        const names = (analysis.players || []).map((n: string) => n.toLowerCase().trim())
        const resolved = names.map((n: string) => players.find(p => p.name.toLowerCase().trim() === n)).filter(Boolean)
        if (resolved.length < 4) {
            await sendMessage(chatId, `❌ Cần ít nhất 4 người để chia đội.`)
            return
        }
        const p = resolved.slice(0, 4)
        const best = [
            { t1: [p[0], p[1]], t2: [p[2], p[3]] },
            { t1: [p[0], p[2]], t2: [p[1], p[3]] },
            { t1: [p[0], p[3]], t2: [p[1], p[2]] }
        ].sort((a, b) => Math.abs((a.t1[0].elo_rating + a.t1[1].elo_rating) - (a.t2[0].elo_rating + a.t2[1].elo_rating)) - Math.abs((b.t1[0].elo_rating + b.t1[1].elo_rating) - (b.t2[0].elo_rating + b.t2[1].elo_rating)))[0]
        const elo1 = best.t1[0].elo_rating + best.t1[1].elo_rating, elo2 = best.t2[0].elo_rating + best.t2[1].elo_rating
        await sendMessage(chatId, `⚖️ <b>Gợi ý chia đội:</b>\n\n🔵 <b>Đội 1:</b> ${best.t1[0].name} & ${best.t1[1].name} (${elo1})\n🔴 <b>Đội 2:</b> ${best.t2[0].name} & ${best.t2[1].name} (${elo2})`)
        return
    }

    // --- INTENT: PREDICT_MATCH ---
    if (intent === "PREDICT_MATCH") {
        const resolve = (names: string[]) => (names || []).map(n => players.find(p => p.name.toLowerCase().trim() === n.toLowerCase().trim())).filter(Boolean)
        const t1 = resolve(analysis.team1), t2 = resolve(analysis.team2)
        if (t1.length === 0 || t2.length === 0) {
            await sendMessage(chatId, "❌ Không đủ thông tin 2 đội.")
            return
        }
        const avg1 = t1.reduce((s, p) => s + p.elo_rating, 0) / t1.length, avg2 = t2.reduce((s, p) => s + p.elo_rating, 0) / t2.length
        const prob1 = 1 / (1 + Math.pow(10, (avg2 - avg1) / 400))
        await sendMessage(chatId, `🔮 <b>Dự đoán:</b>\n\n🔵 Đội 1: <b>${(prob1 * 100).toFixed(1)}%</b>\n🔴 Đội 2: <b>${((1 - prob1) * 100).toFixed(1)}%</b>`)
        return
    }

    // --- INTENT: RECORD_MATCH ---
    if (intent === "RECORD_MATCH") {
        const { team1, team2, score1, score2, tournament } = analysis
        const resolve = (names: string[]) => (names || []).map(n => {
            const tgt = n.toLowerCase().trim().replace(/^@/, '')
            return players.find(p => 
                p.name.toLowerCase().trim() === tgt || 
                (p.user_ad && p.user_ad.toLowerCase().trim() === tgt)
            )
        }).filter(Boolean)
        
        const res1 = resolve(team1), res2 = resolve(team2)
        if (res1.length === 0 || res2.length === 0) {
            await sendMessage(chatId, `❌ Không xác định được người chơi. Vui lòng kiểm tra lại tên hoặc @userad.`)
            return
        }

        const t1Avg = res1.reduce((s, p) => s + p.elo_rating, 0) / res1.length
        const t2Avg = res2.reduce((s, p) => s + p.elo_rating, 0) / res2.length
        const delta = calculateEloDelta(t1Avg, t2Avg, score1, score2)

        let tournamentId = null
        if (tournament) {
            const { data: tData } = await supabase.from("tournaments").select("id").ilike("name", `%${tournament}%`).limit(1)
            if (tData && tData.length > 0) tournamentId = tData[0].id
        }

        const { error: mErr } = await supabase.from("matches").insert({
            type: res1.length > 1 ? 'doubles' : 'singles',
            team1_player1_id: res1[0].id, team1_player2_id: res1[1]?.id || null,
            team2_player1_id: res2[0].id, team2_player2_id: res2[1]?.id || null,
            team1_score: score1, team2_score: score2, 
            elo_delta_team1: delta, elo_delta_team2: -delta,
            tournament_id: tournamentId
        })

        if (mErr) {
            await sendMessage(chatId, `❌ Lỗi khi lưu trận đấu: ${mErr.message}`)
            return
        }

        for (const p of res1) await supabase.from("players").update({ elo_rating: p.elo_rating + delta, wins: score1 > score2 ? (p.wins || 0) + 1 : p.wins, losses: score2 > score1 ? (p.losses || 0) + 1 : p.losses, matches_played: (p.matches_played || 0) + 1 }).eq("id", p.id)
        for (const p of res2) await supabase.from("players").update({ elo_rating: p.elo_rating - delta, wins: score2 > score1 ? (p.wins || 0) + 1 : p.wins, losses: score1 > score2 ? (p.losses || 0) + 1 : p.losses, matches_played: (p.matches_played || 0) + 1 }).eq("id", p.id)
        
        await sendMessage(chatId, `✅ <b>Ghi nhận thành công!</b>\n🏆 <b>${score1 > score2 ? team1.join(" & ") : team2.join(" & ")}</b> thắng.\n📈 Elo: <code>${delta > 0 ? "+" : ""}${delta}</code>\n${tournamentId ? `🏟️ Giải đấu: <i>${tournament}</i>` : ""}`)
    }
}

async function getLlmAnalysis(text: string, players: any[]) {
    if (!GEMINI_API_KEY) return null;
    
    const { data: tournaments } = await supabase.from("tournaments").select("name")
    const tContext = tournaments?.map(t => t.name).join(", ") || "None"
    const playerContext = players.map(p => `${p.name}${p.user_ad ? ` (@${p.user_ad})` : ''}`).join(", ")

    const prompt = `You are a Pickleball Tournament Assistant. Extract match details from the message.
    
    CONTEXT:
    - Available Players: ${playerContext}
    - Active Tournaments: ${tContext}
    
    MESSAGE: "${text}"
    
    INTENTS:
    1. RECORD_MATCH: {"intent": "RECORD_MATCH", "team1": ["Name/USERAD"], "team2": ["Name/USERAD"], "score1": 15, "score2": 8, "tournament": "Tournament Name if mentioned"}
    2. GET_LEADERBOARD: {"intent": "GET_LEADERBOARD"}
    3. GET_PLAYER_STATS: {"intent": "GET_PLAYER_STATS", "target": "Name or USERAD"}
    4. QUERY_H2H: {"intent": "QUERY_H2H", "p1": "Name or USERAD", "p2": "Name or USERAD"}
    5. BALANCE_TEAMS: {"intent": "BALANCE_TEAMS", "players": ["N1","N2","N3","N4"]}
    6. PREDICT_MATCH: {"intent": "PREDICT_MATCH", "team1": [], "team2": []}
    
    CRITICAL RULES:
    - If multiple players have the same name, use their @USERAD to disambiguate.
    - Match names/USERADs exactly to the provided Available Players list.
    - If the message says "Nguyễn Mạnh Thắng 8" or "Thắng 8", match to the one with user_ad '8'.
    - Return ONLY JSON.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) 
    });
    const data = await response.json();
    if (!data.candidates) return { error: "AI Error" };
    try {
        const raw = data.candidates[0].content.parts[0].text;
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "No JSON found" };
    } catch (e) { return { error: "Parse Error" }; }
}

serve(async (req) => {
    try {
        const body = await req.json()
        const { data: players } = await supabase.from("players").select("*")

        if (body.callback_query) {
            const cb = body.callback_query, chatId = cb.message.chat.id, data = cb.data
            if (data.startsWith("intent:")) {
                const intent = data.split(":")[1]
                if (intent === "GET_LEADERBOARD") await handleIntent(chatId, intent, {}, players!)
                else await sendMessage(chatId, "💡 Tính năng này yêu cầu bạn gõ lệnh cụ thể.")
            } else if (data.startsWith("hint:")) {
                const hint = data.split(":")[1]
                await sendMessage(chatId, hint === "BALANCE" ? "💡 Gõ: <i>'chia đội cho A, B, C, D'</i>" : "💡 Gõ: <i>'dự đoán A-B vs C-D'</i>")
            }
            return new Response("ok")
        }

        const message = body.message
        if (!message || !message.text) return new Response("ok")
        const chatId = message.chat.id, text = message.text.toLowerCase().trim()

        if (text === "/start" || text === "/menu" || text === "menu") { await showMenu(chatId); return new Response("ok"); }

        const analysis = await getLlmAnalysis(message.text, players!)
        if (!analysis || analysis.error) { if (text.length > 3) await sendMessage(chatId, "🤔 Bot chưa hiểu ý bạn."); return new Response("ok"); }
        await handleIntent(chatId, analysis.intent, analysis, players!)
    } catch (err) { console.error(err) }
    return new Response("ok")
})
