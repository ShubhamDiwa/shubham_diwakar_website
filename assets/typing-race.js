import { draftChat } from './chat-draft.js';
import { prompts, wordsPerMinute } from './typing-prompts.mjs';

const byId = id => document.getElementById(id);
const join = byId('typingJoin');
const entry = byId('typingEntry');
const input = entry.elements.text;
const status = byId('typingStatus');
const prompt = byId('typingPrompt');
const invite = byId('typingInvite');
let room;
let soloStart;
let timer;
let busy = false;
let recorded = false;

function showSession() {
  join.hidden = true;
  byId('typingActions').hidden = false;
}

function record(score) {
  if (recorded) return;
  recorded = true;
  window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Typing Race', score } }));
}

function showRoom() {
  showSession();
  byId('typingRoom').textContent = `Room ${room.code} · Player ${room.player}`;
  invite.hidden = room.wait !== null;
  if (room.wait === null) {
    status.textContent = 'Waiting for Player 2.';
    return;
  }
  if (room.wait > 0) {
    status.textContent = `Starting in ${Math.ceil(room.wait / 1000)}…`;
    return;
  }
  prompt.textContent = room.prompt;
  const score = room.scores[room.player - 1];
  if (score !== null) record(score);
  if (score === null && entry.hidden) {
    entry.hidden = false;
    input.focus({ preventScroll: true });
  }
  entry.hidden = score !== null;
  const scores = room.scores.map((value, index) => `P${index + 1} ${value === null ? 'typing' : value + ' WPM'}`).join(' · ');
  status.textContent = room.winner ? `Player ${room.winner} won. ${scores}` : 'Type the message exactly, then press Finish.';
}

async function sync(action, fields = {}) {
  if (busy) return;
  clearTimeout(timer);
  busy = true;
  try {
    const response = await fetch('/.netlify/functions/typing-race', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, code: room?.code, token: room?.token, ...fields }),
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
    if (room && room.scores.includes(null)) timer = setTimeout(() => sync('poll'), 1000);
  }
}

function leave() {
  clearTimeout(timer);
  room = undefined;
  soloStart = undefined;
  recorded = false;
  input.value = '';
  entry.hidden = true;
  invite.hidden = true;
  join.hidden = false;
  byId('typingActions').hidden = true;
  byId('typingRoom').textContent = prompt.textContent = status.textContent = '';
}

byId('typingSolo').addEventListener('click', () => {
  if (busy) return;
  showSession();
  prompt.textContent = prompts[Math.floor(Math.random() * prompts.length)];
  status.textContent = 'Type the message exactly, then press Finish.';
  entry.hidden = false;
  input.focus({ preventScroll: true });
  soloStart = performance.now();
});
byId('typingCreate').addEventListener('click', () => sync('create'));
join.addEventListener('submit', event => {
  event.preventDefault();
  sync('join', { code: join.elements.code.value.trim().toUpperCase() });
});
entry.addEventListener('submit', event => {
  event.preventDefault();
  if (input.value !== prompt.textContent) {
    status.textContent = 'Match the prompt exactly to finish.';
    return;
  }
  if (room) {
    if (busy) {
      status.textContent = 'Syncing the room. Press Finish again in a moment.';
      return;
    }
    sync('finish', { text: input.value });
    return;
  }
  if (soloStart === undefined || recorded) return;
  const score = wordsPerMinute(input.value, performance.now() - soloStart);
  record(score);
  status.textContent = `Finished · ${score} WPM.`;
  entry.hidden = true;
});
input.addEventListener('paste', event => event.preventDefault());
input.addEventListener('drop', event => event.preventDefault());
byId('typingLeave').addEventListener('click', () => { if (!busy) leave(); });
byId('typingScores').addEventListener('click', () => {
  const selector = byId('leaderboardGame');
  selector.value = 'Typing Race';
  selector.dispatchEvent(new Event('change'));
});
invite.addEventListener('click', () => {
  if (!room || room.wait !== null) return;
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('race', room.code);
  url.hash = 'typing-race';
  draftChat('Join my Typing Race: ' + url.href);
});
const invitedCode = new URLSearchParams(location.search).get('race');
if (/^[A-F0-9]{10}$/.test(invitedCode ?? '')) {
  join.elements.code.value = invitedCode;
  sync('join', { code: invitedCode });
}
