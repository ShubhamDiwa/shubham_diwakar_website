import { draftChat } from './chat-draft.js';
import { chaiRegular } from './shift-challenges.js';

const byId = id => document.getElementById(id);
const games = byId('leaderboardGame');
const entries = byId('leaderboardEntries');
const status = byId('leaderboardStatus');
const submission = byId('leaderboardSubmission');
const retry = byId('leaderboardRetry');
const results = new Map();
const pending = new Map();
const badgeUpdates = new Set();
const counts = new Map();
const countedGames = new Set(['Online Tic-Tac-Toe', 'Local Tic-Tac-Toe', 'Corporate Bingo']);
const units = {
  'Typing Race': ' WPM',
  'Local Tic-Tac-Toe': ' rounds played',
  'Online Tic-Tac-Toe': ' wins',
  'Corporate Bingo': ' cards cleared',
  'Corporate Wordle': ' points',
  'Office Detective': ' cases solved',
  'Office Bluff': ' votes'
};
const endpoint = '/.netlify/functions/leaderboard';
let punchedIn;
let player;
let requestId = 0;
let matchWins = 0;
let posting = false;

window.addEventListener('office-punch-in', () => {
  punchedIn = Date.now();
  let id = crypto.randomUUID();
  try {
    const saved = localStorage.getItem('office-leaderboard-player');
    if (saved && /^[a-f0-9-]{36}$/i.test(saved)) id = saved;
    else localStorage.setItem('office-leaderboard-player', id);
  } catch {}
  player = { id, name: byId('introName').value.trim(), role: byId('introTeam').value };
  const chatName = byId('breakRoomJoin').elements.nickname;
  if (!chatName.value) chatName.value = player.name;
});
window.addEventListener('office-result', ({ detail: { game, score, won, roomCode, proof } }) => {
  if (!player) return;
  if (game === 'Friday Half-Day Heist') {
    pending.set(roomCode, { game, score, roomCode, proof });
    saveScores();
    return;
  }
  if (won) matchWins++;
  if (countedGames.has(game)) {
    score += counts.get(game) ?? 0;
    counts.set(game, score);
  }
  const improved = !results.has(game) || results.get(game) < score;
  const badge = chaiRegular();
  if (improved || (badge && !badgeUpdates.has(game))) {
    if (improved) results.set(game, score);
    if (badge) badgeUpdates.add(game);
    pending.set(game, { game, score: results.get(game), chaiRegular: badge });
    saveScores();
  }
});

async function request(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.entries;
}

async function loadScores() {
  const id = ++requestId;
  entries.replaceChildren();
  status.textContent = 'Loading scores…';
  try {
    const scores = await request(endpoint + '?' + new URLSearchParams({ game: games.value }));
    if (id !== requestId) return;
    entries.replaceChildren(...scores.map(({ name, role, score, chaiRegular: badge }) => {
      const row = document.createElement('li');
      const value = games.value === 'Friday Half-Day Heist'
        ? `${((90001 - score) / 1000).toFixed(2)}s`
        : `${score}${units[games.value] ?? ''}`;
      row.textContent = `${name}${badge ? ' ☕ Chai Regular' : ''} · ${role} · ${value}`;
      return row;
    }));
    status.textContent = scores.length ? '' : 'No scores yet.';
  } catch {
    if (id === requestId) status.textContent = 'Could not load scores. Try again shortly.';
  }
}

games.addEventListener('change', loadScores);
retry.addEventListener('click', saveScores);
window.addEventListener('online', saveScores);

async function saveScores() {
  if (posting || !pending.size) return;
  posting = true;
  retry.hidden = true;
  submission.textContent = 'Saving scores…';
  const failed = new Set();
  try {
    for (const [key, result] of pending) {
      try {
        await request(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...player, ...result })
        });
        const latest = pending.get(key);
        pending.delete(key);
        if (latest !== result) pending.set(key, latest);
        if (result.game === games.value) loadScores();
      } catch {
        failed.add(key);
      }
    }
  } finally {
    posting = false;
    retry.hidden = !failed.size;
    submission.textContent = failed.size ? 'Some scores could not be saved. Retry when connected.' : 'Scores saved.';
  }
}

byId('punchOut').addEventListener('click', () => {
  const minutes = Math.floor((Date.now() - (punchedIn ?? Date.now())) / 60000);
  const best = game => results.get(game) ?? '—';
  byId('shiftSummary').textContent = [
    byId('introTeam').value,
    `${minutes} min on shift`,
    `Meeting Dodge best ${best('Meeting Dodge')}`,
    `Chai deliveries best ${best('Chai Run')}`,
    `Deadline Dash best ${best('Deadline Dash')}`,
    `Tic-Tac-Toe wins ${matchWins}`
  ].join(' · ');
  byId('shiftReport').hidden = false;
});
byId('shareShift').addEventListener('click', () => draftChat('Shift complete! ' + byId('shiftSummary').textContent));
loadScores();
