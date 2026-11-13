import { draftChat } from './chat-draft.js';

const byId = id => document.getElementById(id);
const games = byId('leaderboardGame');
const entries = byId('leaderboardEntries');
const status = byId('leaderboardStatus');
const form = byId('leaderboardForm');
const post = form.querySelector('button');
const results = new Map();
const endpoint = '/.netlify/functions/leaderboard';
let punchedIn;
let requestId = 0;
let matchWins = 0;
let posting = false;

window.addEventListener('office-punch-in', () => { punchedIn = Date.now(); });
window.addEventListener('office-result', ({ detail: { game, score } }) => {
  if (game === 'Local Tic-Tac-Toe' || game === 'Online Tic-Tac-Toe') {
    matchWins++;
    return;
  }
  if (!results.has(game) || results.get(game).score < score) {
    results.set(game, { score, role: byId('introTeam').value, id: crypto.randomUUID() });
  }
  updatePostButton();
});

function updatePostButton() {
  const result = results.get(games.value);
  post.disabled = posting || !result || result.score < 0 || Boolean(result.posted);
  post.textContent = result?.posted ? 'Score posted' : result && result.score >= 0 ? `Post score · ${result.score}` : 'Finish a game to post';
}

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
  updatePostButton();
  try {
    const scores = await request(endpoint + '?' + new URLSearchParams({ game: games.value }));
    if (id !== requestId) return;
    entries.replaceChildren(...scores.map(({ name, role, score }) => {
      const row = document.createElement('li');
      row.textContent = `${name} · ${role} · ${score}${games.value === 'Typing Race' ? ' WPM' : ''}`;
      return row;
    }));
    status.textContent = scores.length ? '' : 'No scores yet.';
  } catch {
    if (id === requestId) status.textContent = 'Could not load scores. Try again shortly.';
  }
}

games.addEventListener('change', loadScores);
form.addEventListener('submit', async event => {
  event.preventDefault();
  const game = games.value;
  const result = results.get(game);
  const name = form.elements.nickname.value.trim();
  if (post.disabled || !result || !name) return;
  posting = true;
  updatePostButton();
  try {
    await request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, ...result, name })
    });
    result.posted = true;
    await loadScores();
  } catch (error) {
    status.textContent = error.message || 'Could not post the score.';
  } finally {
    posting = false;
    updatePostButton();
  }
});

byId('punchOut').addEventListener('click', () => {
  const minutes = Math.floor((Date.now() - (punchedIn ?? Date.now())) / 60000);
  const best = game => results.get(game)?.score ?? '—';
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
