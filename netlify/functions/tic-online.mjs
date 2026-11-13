import { randomBytes, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function makeHandler(openStore) {
  return async request => {
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin.' }, 403);
    const body = await request.json().catch(() => null);
    const { action, code, token, square, round } = body ?? {};
    try {
      const store = openStore();
      if (action === 'create') {
        const roomCode = randomBytes(5).toString('hex').toUpperCase();
        const player = randomUUID();
        const room = { X: player, O: null, board: Array(9).fill(''), turn: 'X', round: 1, updated: Date.now() };
        if (!(await store.setJSON(roomCode, room, { onlyIfNew: true })).modified) return json({ error: 'Try creating again.' }, 409);
        return json({ code: roomCode, token: player, mark: 'X', board: room.board, ready: false, turn: 'X', round: 1 });
      }
      if (typeof code !== 'string' || !/^[A-F0-9]{10}$/.test(code)) return json({ error: 'Enter a valid room code.' }, 400);
      for (let attempt = 0; attempt < 6; attempt++) {
        const saved = await store.getWithMetadata(code, { type: 'json' });
        const room = saved?.data;
        if (!room || Date.now() - room.updated >= 3600000) return json({ error: 'Room missing or expired.' }, 404);
        let mark = token === room.X ? 'X' : room.O && token === room.O ? 'O' : null;
        const winner = lines.find(line => room.board[line[0]] && line.every(i => room.board[i] === room.board[line[0]]));
        const finished = Boolean(winner) || room.board.every(Boolean);
        if (action === 'join' && !mark) {
          if (room.O) return json({ error: 'This room already has two players.' }, 409);
          room.O = randomUUID();
          mark = 'O';
        } else if (!mark) {
          return json({ error: 'Join this room first.' }, 403);
        } else if (action === 'move') {
          if (!room.O || finished || round !== room.round || room.turn !== mark || !Number.isInteger(square) || square < 0 || square > 8 || room.board[square]) {
            return json({ error: 'That move is no longer available.' }, 409);
          }
          room.board[square] = mark;
          room.turn = mark === 'X' ? 'O' : 'X';
        } else if (action === 'reset') {
          if (!finished || round !== room.round) return json({ error: 'Finish this round first.' }, 409);
          room.board.fill('');
          room.turn = 'X';
          room.round++;
        } else if (action !== 'poll' && action !== 'join') {
          return json({ error: 'Unknown action.' }, 400);
        }
        if (action !== 'poll') {
          room.updated = Date.now();
          if (!(await store.setJSON(code, room, { onlyIfMatch: saved.etag })).modified) continue;
        }
        return json({ code, token: room[mark], mark, board: room.board, ready: Boolean(room.O), turn: room.turn, round: room.round });
      }
      return json({ error: 'Room busy. Try again.' }, 503);
    } catch {
      return json({ error: 'Online game temporarily unavailable.' }, 503);
    }
  };
}

export default makeHandler(() => getStore({ name: 'tic-online', consistency: 'strong' }));
