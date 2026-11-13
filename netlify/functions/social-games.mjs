import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const times = ['1:15 PM', '1:40 PM', '2:05 PM', '2:30 PM', '2:55 PM', '3:20 PM'];
const prompts = [
  'Why did you miss the 9 a.m. stand-up?',
  'Why is the file still called final_final_v12?',
  'Why did a five-minute call take an hour?',
  'Why did you leave the all-hands halfway through?',
  'Why is your status set to “in a meeting” all day?',
  'Why did the shared spreadsheet lose its totals?'
];
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const invalid = message => json({ error: message }, 400);
const uuid = /^[a-f0-9-]{36}$/i;

function heistPuzzle() {
  const safe = randomInt(times.length);
  const blocked = times.filter((_, i) => i !== safe);
  for (let i = blocked.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [blocked[i], blocked[j]] = [blocked[j], blocked[i]];
  }
  const split = 2 + randomInt(2);
  return { safe: times[safe], blocks: [blocked.slice(0, split).sort(), blocked.slice(split).sort()] };
}

function view(code, room, player, now) {
  const { game, phase, players, started, finished } = room;
  const state = { code, game, phase, names: players.map(member => member.name), host: player === players[0] };
  if (phase === 'lobby') return state;
  if (game === 'heist') {
    return {
      ...state, times, assignment: state.host ? 'Calendar' : 'Manager’s messages',
      blocked: room.puzzle.blocks[state.host ? 0 : 1], pick: player.pick ?? null,
      remaining: Math.max(0, 90000 - (now - started)), attempts: room.attempts,
      ...(finished ? { escaped: room.escaped, elapsed: finished - started, safe: room.puzzle.safe, team: players.map(({ name, role }) => ({ name, role })), proof: room.escaped ? room.proof : null } : {})
    };
  }
  const submitted = player.excuse !== undefined;
  const voted = player.vote !== undefined;
  return {
    ...state, prompt: room.prompt, submitted, voted,
    count: players.filter(member => phase === 'write' ? member.excuse !== undefined : member.vote !== undefined).length,
    ...(phase === 'vote' || phase === 'done' ? {
      excuses: room.order.map(index => ({
        index, text: players[index].excuse, yours: players[index] === player,
        ...(phase === 'done' ? {
          author: players[index].name,
          votes: players.filter(member => member.vote === index).length
        } : {})
      }))
    } : {}),
    ...(phase === 'done' ? { score: players.filter(member => member.vote === players.indexOf(player)).length } : {})
  };
}

function play(room, player, body, now) {
  const { game, players, phase } = room;
  const host = player === players[0];
  if (body.action === 'start') {
    if (!host || phase !== 'lobby' || players.length < (game === 'heist' ? 2 : 3)) return 'Wait for more players. The host starts the round.';
    room.started = now;
    room.phase = game === 'heist' ? 'pick' : 'write';
    if (game === 'heist') room.puzzle = heistPuzzle();
    else room.prompt = prompts[randomInt(prompts.length)];
  } else if (body.action === 'pick') {
    if (game !== 'heist' || phase !== 'pick' || player.pick || !times.includes(body.choice)) return 'This exit choice is unavailable.';
    if (body.attempt !== room.attempts) return 'The round advanced. Check the new clues before picking again.';
    player.pick = body.choice;
    if (players.every(member => member.pick)) {
      if (players.every(member => member.pick === room.puzzle.safe)) {
        room.escaped = true;
        room.proof = randomUUID();
        room.finished = now;
        room.phase = 'done';
      } else {
        room.attempts++;
        room.puzzle = heistPuzzle();
        for (const member of players) delete member.pick;
      }
    }
  } else if (body.action === 'write') {
    const excuse = typeof body.excuse === 'string' ? body.excuse.trim() : '';
    if (game !== 'bluff' || phase !== 'write' || player.excuse !== undefined || !excuse || excuse.length > 160) return 'Enter one excuse of up to 160 characters.';
    player.excuse = excuse;
    if (players.every(member => member.excuse !== undefined)) {
      room.order = players.map((_, i) => i);
      for (let i = room.order.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [room.order[i], room.order[j]] = [room.order[j], room.order[i]];
      }
      room.phase = 'vote';
    }
  } else if (body.action === 'vote') {
    const choice = body.choice;
    if (game !== 'bluff' || phase !== 'vote' || player.vote !== undefined ||
        !Number.isInteger(choice) || !players[choice] || players[choice] === player) return 'Choose another player’s excuse.';
    player.vote = choice;
    if (players.every(member => member.vote !== undefined)) room.phase = 'done';
  } else {
    return 'Unknown action.';
  }
}

export function socialGames(openStore, clock = Date.now) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
    const body = await request.json().catch(() => null);
    const { game, action, code, token, role } = body ?? {};
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (game !== 'heist' && game !== 'bluff') return invalid('Choose a game.');
    if (typeof token !== 'string' || !uuid.test(token)) return invalid('Invalid player session.');
    if ((action === 'create' || action === 'join') &&
        (!name || name.length > 24 || typeof role !== 'string' || !role || role.length > 24)) return invalid('Punch in before joining.');
    try {
      const store = openStore();
      const now = clock();
      if (action === 'create') {
        const newCode = randomBytes(4).toString('hex').toUpperCase();
        const player = { token, name, role };
        const room = { game, phase: 'lobby', players: [player], updated: now, attempts: 0 };
        if (!(await store.setJSON(newCode, room, { onlyIfNew: true })).modified) return json({ error: 'Try creating again.' }, 409);
        return json(view(newCode, room, player, now));
      }
      if (typeof code !== 'string' || !/^[A-F0-9]{8}$/.test(code)) return invalid('Enter an eight-character room code.');
      for (let attempt = 0; attempt < 6; attempt++) {
        const saved = await store.getWithMetadata(code, { type: 'json' });
        const room = saved?.data;
        if (!room || room.game !== game || now - room.updated >= 3600000) return json({ error: 'Room missing or expired.' }, 404);
        let player = room.players.find(member => member.token === token);
        let changed = false;
        if (!player && action === 'join') {
          if (room.phase !== 'lobby' || room.players.length >= (game === 'heist' ? 2 : 8)) return json({ error: 'The room is full or has already started.' }, 409);
          player = { token, name, role };
          room.players.push(player);
          changed = true;
        }
        if (!player) return json({ error: 'Join this room first.' }, 403);
        if (action === 'leave') {
          if (room.phase === 'lobby') {
            room.players = room.players.filter(member => member !== player);
            if (!(await store.setJSON(code, room, { onlyIfMatch: saved.etag })).modified) continue;
          }
          return json({ left: true });
        }
        if (game === 'heist' && room.phase === 'pick' && now - room.started >= 90000) {
          room.phase = 'done';
          room.finished = room.started + 90000;
          room.escaped = false;
          changed = true;
        }
        if (action !== 'poll' && action !== 'join' && !changed) {
          const error = play(room, player, body, now);
          if (error) return invalid(error);
          changed = true;
        }
        if (changed) {
          room.updated = now;
          if (!(await store.setJSON(code, room, { onlyIfMatch: saved.etag })).modified) continue;
        }
        return json(view(code, room, player, now));
      }
      return json({ error: 'Room busy. Try again.' }, 503);
    } catch {
      return json({ error: 'Game room temporarily unavailable.' }, 503);
    }
  };
}

export const openSocialStore = () => getStore({ name: 'office-social-games', consistency: 'strong' });
export default socialGames(openSocialStore);
