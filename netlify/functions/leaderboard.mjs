import { getStore } from '@netlify/blobs';

const games = ['Meeting Dodge', 'Chai Run', 'Deadline Dash', 'Typing Race'];
const roles = ['Developer', 'DevOps', 'Data Analyst', 'Business Analyst', 'Data Scientist', 'Project Manager', 'Sales & Support', 'HR & Admin', 'Finance', 'Operations', 'Marketing & Design', 'Tech & QA'];
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function leaderboard(openStore) {
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
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!games.includes(game) || !roles.includes(role) || !name || name.length > 24 ||
          !Number.isInteger(score) || score < 0 || score > (game === 'Typing Race' ? 300 : 100000) ||
          typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) {
        return json({ error: 'Invalid score entry.' }, 400);
      }
      for (let attempt = 0; attempt < 6; attempt++) {
        const saved = await store.getWithMetadata(game, { type: 'json' });
        const entries = saved?.data ?? [];
        if (entries.some(entry => entry.id === id)) return json({ entries });
        const ranked = [...entries, { id, name, role, score }].sort((a, b) => b.score - a.score).slice(0, 10);
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
