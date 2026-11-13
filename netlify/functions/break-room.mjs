import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const digest = value => createHash('sha256').update(value).digest();
const uuid = /^[a-f0-9-]{36}$/i;
const response = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});

export function createBreakRoomHandler(openStore) {
  return async request => {
    if (request.method !== 'POST') return response({ error: 'Use POST.' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return response({ error: 'Invalid origin.' }, 403);
    }
    let input;
    try {
      const raw = await request.text();
      if (raw.length > 3000) return response({ error: 'Message too long.' }, 413);
      input = JSON.parse(raw);
    } catch {
      return response({ error: 'Invalid request.' }, 400);
    }
    const { action, token, target, messageId, key } = input ?? {};
    const nickname = typeof input?.nickname === 'string' ? input.nickname.trim() : '';
    const text = typeof input?.text === 'string' ? input.text.trim() : '';
    if (typeof token !== 'string' || !uuid.test(token) || !nickname || nickname.length > 24 ||
        !['poll', 'send', 'leave', 'delete', 'mute'].includes(action)) {
      return response({ error: 'Choose a nickname of 1–24 characters.' }, 400);
    }
    if (action === 'send' && (!text || text.length > 280 || !uuid.test(messageId ?? ''))) {
      return response({ error: 'Write a message of 1–280 characters.' }, 400);
    }
    const ownerKey = process.env.BREAK_ROOM_MOD_KEY;
    const moderator = Boolean(ownerKey && typeof key === 'string' && timingSafeEqual(digest(key), digest(ownerKey)));
    if (['delete', 'mute'].includes(action) && !moderator) {
      return response({ error: 'Moderator key required.' }, 403);
    }
    const id = digest(token).toString('hex');

    try {
      const store = openStore();
      for (let attempt = 0; attempt < 8; attempt++) {
        const saved = await store.getWithMetadata('room', { type: 'json' });
        const room = saved?.data ?? { messages: [], members: {}, muted: {} };
        const now = Date.now();
        for (const [member, seen] of Object.entries(room.members)) {
          if (now - seen >= 45000) delete room.members[member];
        }
        for (const [member, until] of Object.entries(room.muted)) {
          if (until <= now) delete room.muted[member];
        }
        room.messages = room.messages.filter(message => now - message.at < 86400000);
        const refresh = now - (room.members[id] ?? 0) >= 15000;
        if (action === 'leave') {
          delete room.members[id];
        } else {
          if (!room.members[id] && Object.keys(room.members).length >= 100) {
            return response({ error: 'The Break Room is full. Try again shortly.' }, 429);
          }
          if (refresh) room.members[id] = now;
        }
        if (action === 'send') {
          if (room.muted[id]) return response({ error: 'You are muted.' }, 403);
          const previous = room.messages.findLast(message => message.sender === id);
          if (!room.messages.some(message => message.id === messageId && message.sender === id)) {
            if (previous && now - previous.at < 2500) return response({ error: 'Wait a few seconds before sending again.' }, 429);
            room.messages.push({ id: messageId, sender: id, nickname, text, at: now });
            room.messages = room.messages.slice(-50);
          }
        }
        if (action === 'delete') room.messages = room.messages.filter(message => message.id !== target);
        if (action === 'mute') {
          const message = room.messages.find(item => item.id === target);
          if (!message) return response({ error: 'That message is no longer in the room.' }, 404);
          room.muted[message.sender] = now + 3600000;
        }
        if (refresh || action !== 'poll') {
          const result = await store.setJSON('room', room, saved ? { onlyIfMatch: saved.etag } : { onlyIfNew: true });
          if (!result.modified) continue;
        }
        return response({
          online: Object.keys(room.members).length,
          messages: room.messages.map(({ sender, ...message }) => message),
          moderator
        });
      }
      return response({ error: 'The room is busy. Try again.' }, 503);
    } catch {
      return response({ error: 'The Break Room is temporarily unavailable.' }, 503);
    }
  };
}

export default createBreakRoomHandler(() => getStore({ name: 'break-room', consistency: 'strong' }));
