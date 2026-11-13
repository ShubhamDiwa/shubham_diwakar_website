import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const reactions = ['Too Real', 'Same Here', 'HR Has Entered the Chat'];
const digest = value => createHash('sha256').update(value).digest();
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export function confessions(openStore) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
    const raw = await request.text();
    if (raw.length > 2000) return json({ error: 'Request too long.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
    const { action, token, target, reaction, key, postId } = body ?? {};
    if (typeof token !== 'string' || !/^[a-f0-9-]{36}$/i.test(token) ||
        !['list', 'post', 'react', 'report', 'remove'].includes(action)) return json({ error: 'Invalid request.' }, 400);
    const secret = process.env.BREAK_ROOM_MOD_KEY;
    const moderator = Boolean(secret && typeof key === 'string' && timingSafeEqual(digest(key), digest(secret)));
    if ((key || action === 'remove') && !moderator) return json({ error: 'Invalid moderator key.' }, 403);
    const actor = digest(token).toString('hex');
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (action === 'post' && (!text || text.length > 280 || /https?:\/\/|www\.|\b[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text) ||
        typeof postId !== 'string' || !/^[a-f0-9-]{36}$/i.test(postId))) {
      return json({ error: 'Write up to 280 characters without links or email addresses.' }, 400);
    }
    if (action === 'react' && !reactions.includes(reaction)) return json({ error: 'Unknown reaction.' }, 400);
    try {
      const store = openStore();
      for (let attempt = 0; attempt < 8; attempt++) {
        const saved = await store.getWithMetadata('board', { type: 'json' });
        const posts = saved?.data ?? [];
        if (action === 'post' && !posts.some(item => item.id === postId && item.actor === actor)) {
          if (posts.some(item => item.actor === actor && Date.now() - item.at < 30000)) return json({ error: 'Wait 30 seconds between confessions.' }, 429);
          posts.unshift({ id: postId || randomUUID(), actor, at: Date.now(), text, votes: {}, reports: [], removed: false });
          posts.length = Math.min(40, posts.length);
        }
        if (['react', 'report', 'remove'].includes(action)) {
          const post = posts.find(item => item.id === target);
          if (!post || post.removed || (post.reports.length >= 3 && !moderator)) return json({ error: 'Confession is unavailable.' }, 404);
          if (action === 'remove') post.removed = true;
          if (action === 'report' && !post.reports.includes(actor)) post.reports.push(actor);
          if (action === 'react') {
            if (!post.votes[actor] && Object.keys(post.votes).length >= 200) return json({ error: 'This post has reached its reaction limit.' }, 429);
            post.votes[actor] = reaction;
          }
        }
        if (action !== 'list') {
          const write = await store.setJSON('board', posts, saved ? { onlyIfMatch: saved.etag } : { onlyIfNew: true });
          if (!write.modified) continue;
        }
        return json({ moderator, posts: posts.filter(post => !post.removed && (moderator || post.reports.length < 3)).map(post => ({
          id: post.id, text: post.text, yourReaction: post.votes[actor], reported: post.reports.includes(actor),
          reactions: reactions.map(label => [label, Object.values(post.votes).filter(vote => vote === label).length]),
          ...(moderator ? { reports: post.reports.length } : {})
        })) });
      }
      return json({ error: 'The board is busy. Try again.' }, 503);
    } catch {
      return json({ error: 'Confessions are temporarily unavailable.' }, 503);
    }
  };
}

export default confessions(() => getStore({ name: 'office-confessions', consistency: 'strong' }));
