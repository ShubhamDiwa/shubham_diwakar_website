import { publicName } from '../../assets/public-name.mjs';
import { getStore } from '@netlify/blobs';
import { openSocialStore } from './social-games.mjs';

const games = ['Meeting Dodge', 'Chai Run', 'Deadline Dash', 'Typing Race', 'Local Tic-Tac-Toe',
  'Online Tic-Tac-Toe', 'Corporate Bingo', 'Corporate Wordle', 'Office Detective',
  'Corporate Plot Twist', 'Friday Half-Day Heist', 'Office Bluff', 'Snake Xenzia'];
const limits = { 'Typing Race': 300, 'Corporate Wordle': 6, 'Corporate Plot Twist': 20, 'Friday Half-Day Heist': 90001, 'Office Bluff': 7 };
const roles = ['Developer', 'DevOps', 'Data Analyst', 'Business Analyst', 'Data Scientist', 'Project Manager', 'Sales & Support', 'HR & Admin', 'Finance', 'Operations', 'Marketing & Design', 'Tech & QA'];
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function leaderboard(openStore, openRooms = openSocialStore) {
  return async request => {
    try {
      const store = openStore();
      if (request.method === 'GET') {
        const game = new URL(request.url).searchParams.get('game');
        if (!games.includes(game)) return json({ error: 'Choose a game.' }, 400);
        return json({ entries: await store.get(game, { type: 'json' }) ?? [] });
      }
      if (request.method !== 'POST') return json({ error: 'Use GET or POST.' }, 405);
      if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
      const body = await request.json().catch(() => null);
      const { game, role, score, id } = body ?? {};
      const name = publicName(body?.name);
      if (!games.includes(game) || !roles.includes(role) || !name || name.length > 24 ||
          !Number.isInteger(score) || score < (game === 'Deadline Dash' ? -100000 : 0) ||
          score > (limits[game] ?? 100000) ||
          typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) {
        return json({ error: 'Invalid score entry.' }, 400);
      }
      const badge = body.chaiRegular === true;
      let entry = { id, name, role, score, ...(badge ? { chaiRegular: true } : {}) };
      if (game === 'Friday Half-Day Heist') {
        if (typeof body.roomCode !== 'string' || !/^[A-F0-9]{8}$/.test(body.roomCode)) return json({ error: 'Invalid heist room.' }, 400);
        const room = await openRooms().get(body.roomCode, { type: 'json' });
        if (!room?.escaped || !room.proof || room.proof !== body.proof ||
            score !== 90001 - (room.finished - room.started) ||
            !room.players.some(player => player.name === name && player.role === role)) {
          return json({ error: 'Invalid heist result.' }, 400);
        }
        entry = {
          id: room.proof, score,
          name: room.players.map(player => player.name).join(' & '),
          role: room.players.map(player => player.role).join(' & ')
        };
      }
      for (let attempt = 0; attempt < 6; attempt++) {
        const saved = await store.getWithMetadata(game, { type: 'json' });
        const entries = saved?.data ?? [];
        const previous = entries.find(savedEntry => savedEntry.id === entry.id && savedEntry.name === entry.name && savedEntry.role === entry.role);
        if (previous && previous.score >= score && (!entry.chaiRegular || previous.chaiRegular)) return json({ entries });
        const updated = previous ? { ...previous, ...entry, score: Math.max(previous.score, score) } : entry;
        const ranked = [...entries.filter(savedEntry => savedEntry !== previous), updated]
          .sort((a, b) => b.score - a.score).slice(0, 10);
        const result = await store.setJSON(game, ranked, saved ? { onlyIfMatch: saved.etag } : { onlyIfNew: true });
        if (result.modified) return json({ entries: ranked });
      }
      return json({ error: 'Leaderboard busy. Try again.' }, 503);
    } catch {
      return json({ error: 'Leaderboard temporarily unavailable.' }, 503);
    }
  };
}

export default leaderboard(() => getStore({ name: 'office-leaderboard', consistency: 'strong' }));
