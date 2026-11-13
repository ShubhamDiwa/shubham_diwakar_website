const join = document.getElementById('onlineTicJoin');
const match = document.getElementById('onlineTicMatch');
const board = document.getElementById('onlineTicBoard');
const status = document.getElementById('onlineTicStatus');
const reset = document.getElementById('onlineTicReset');
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let room;
let busy = false;
let timer;

const cells = Array.from({ length: 9 }, (_, square) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'btn';
  cell.addEventListener('click', () => sync('move', { square }));
  board.append(cell);
  return cell;
});

function showRoom() {
  join.hidden = true;
  match.hidden = false;
  document.getElementById('onlineTicCode').textContent = room.code;
  document.getElementById('onlineTicMark').textContent = room.mark;
  const win = lines.find(line => room.board[line[0]] && line.every(i => room.board[i] === room.board[line[0]]));
  const finished = Boolean(win) || room.board.every(Boolean);
  const yourTurn = room.turn === room.mark;
  cells.forEach((cell, i) => {
    cell.textContent = room.board[i];
    cell.disabled = !room.ready || finished || !yourTurn || Boolean(room.board[i]);
    cell.classList.toggle('winning-cell', Boolean(win?.includes(i)));
    cell.setAttribute('aria-label', `Row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}, ${room.board[i] || 'empty'}`);
  });
  reset.hidden = !finished;
  const message = !room.ready ? 'Waiting for your friend to join.' :
    win ? `Player ${room.board[win[0]]} wins!` :
    finished ? 'Draw.' : yourTurn ? 'Your turn.' : 'Waiting for the other player.';
  if (status.textContent !== message) status.textContent = message;
}

async function sync(action, fields = {}) {
  if (busy) return;
  clearTimeout(timer);
  busy = true;
  try {
    const response = await fetch('/.netlify/functions/tic-online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, code: room?.code, token: room?.token, round: room?.round, ...fields }),
      signal: AbortSignal.timeout(8000)
    });
    const next = await response.json();
    if (response.status === 404) leave();
    if (!response.ok) throw new Error(next.error);
    room = next;
    showRoom();
  } catch (error) {
    status.textContent = error.message || 'Could not connect.';
  } finally {
    busy = false;
    if (room) timer = setTimeout(() => sync('poll'), 2000);
  }
}

function leave() {
  clearTimeout(timer);
  room = undefined;
  match.hidden = true;
  join.hidden = false;
  status.textContent = '';
}

join.addEventListener('submit', event => {
  event.preventDefault();
  sync('join', { code: join.elements.code.value.trim().toUpperCase() });
});
document.getElementById('onlineTicCreate').addEventListener('click', () => sync('create'));
document.getElementById('onlineTicLeave').addEventListener('click', () => {
  if (!busy) leave();
});
reset.addEventListener('click', () => sync('reset'));
