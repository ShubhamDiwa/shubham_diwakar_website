import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { prompts, wordsPerMinute } from '../../assets/typing-prompts.mjs';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const codePattern = /^[A-F0-9]{10}$/;

function view(code, room, player, now) {
  return json({
    code, token: room.players[player], player: player + 1,
    wait: room.start ? Math.max(0, room.start - now) : null,
    prompt: room.start && now >= room.start ? prompts[room.prompt] : '',
    scores: room.scores, winner: room.winner
  });
}

export function makeTypingHandler(openStore) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
    const body = await request.json().catch(() => null);
    const { action, code, token, text } = body ?? {};
    try {
      const store = openStore();
      if (action === 'create') {
        const code = randomBytes(5).toString('hex').toUpperCase();
        const now = Date.now();
        const room = { players: [randomUUID(), null], scores: [null, null], winner: null, start: null, created: now, prompt: randomInt(prompts.length) };
        if (!(await store.setJSON(code, room, { onlyIfNew: true })).modified) return json({ error: 'Try creating again.' }, 409);
        return view(code, room, 0, now);
      }
      if (typeof code !== 'string' || !codePattern.test(code)) return json({ error: 'Enter a valid room code.' }, 400);
      for (let attempt = 0; attempt < 6; attempt++) {
        const saved = await store.getWithMetadata(code, { type: 'json' });
        const room = saved?.data;
        const now = Date.now();
        if (!room || now - room.created >= 3600000) return json({ error: 'Room missing or expired.' }, 404);
        let player = typeof token === 'string' ? room.players.indexOf(token) : -1;
        if (action === 'join' && player < 0) {
          if (room.players[1]) return json({ error: 'This room already has two players.' }, 409);
          player = 1;
          room.players[1] = randomUUID();
          room.start = now + 4000;
        } else {
          if (player < 0) return json({ error: 'Join this room first.' }, 403);
          if (action === 'poll' || action === 'join' || (action === 'finish' && room.scores[player] !== null)) return view(code, room, player, now);
          if (action !== 'finish') return json({ error: 'Unknown action.' }, 400);
          if (!room.start || now < room.start) return json({ error: 'Wait for the race to start.' }, 409);
          if (text !== prompts[room.prompt]) return json({ error: 'Match the prompt exactly to finish.' }, 400);
          room.scores[player] = wordsPerMinute(text, now - room.start);
          room.winner ??= player + 1;
        }
        if ((await store.setJSON(code, room, { onlyIfMatch: saved.etag })).modified) return view(code, room, player, now);
      }
      return json({ error: 'Room busy. Try again.' }, 503);
    } catch {
      return json({ error: 'Typing Race temporarily unavailable.' }, 503);
    }
  };
}

export default makeTypingHandler(() => getStore({ name: 'office-typing-race', consistency: 'strong' }));
