const byId = id => document.getElementById(id);
const phrases = ['Quick call?', 'You’re on mute', 'One last change', 'Per my last email', 'Circle back', 'No agenda', 'Can you see my screen?', 'Chai break', 'End of day', 'Let’s take this offline', 'Looping you in', 'Friday deploy'];
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let card;

function draftChat(message) {
  const room = byId('breakRoom');
  const input = byId('breakRoomSend').elements.message;
  input.value = message;
  room.open = true;
  room.scrollIntoView({ block: 'start' });
  (byId('breakRoomSession').hidden ? byId('breakRoomJoin').elements.nickname : input).focus({ preventScroll: true });
}

function renderBingo(indices) {
  card = indices;
  const marked = new Set();
  byId('bingoStatus').textContent = '';
  byId('bingoBoard').replaceChildren(...card.map((phrase, position) => {
    const cell = document.createElement('button');
    cell.className = 'btn';
    cell.type = 'button';
    cell.textContent = phrases[phrase];
    cell.setAttribute('aria-pressed', 'false');
    cell.addEventListener('click', () => {
      if (marked.has(position)) marked.delete(position);
      else marked.add(position);
      cell.setAttribute('aria-pressed', String(marked.has(position)));
      byId('bingoStatus').textContent = lines.some(line => line.every(i => marked.has(i))) ? 'Bingo! Call it in the Break Room.' : '';
    });
    return cell;
  }));
}

const sharedCard = [...(new URLSearchParams(location.search).get('bingo') || '')].map(char => parseInt(char, 16));
const validCard = sharedCard.length === 9 && new Set(sharedCard).size === 9 && sharedCard.every(i => i >= 0 && i < phrases.length);
renderBingo(validCard ? sharedCard : [0,1,2,3,4,5,6,7,8]);
byId('bingoNew').addEventListener('click', () => {
  const shuffled = phrases.map((_, i) => i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  renderBingo(shuffled.slice(0, 9));
});
byId('bingoShare').addEventListener('click', () => {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('bingo', card.map(i => i.toString(16)).join(''));
  url.hash = 'corporate-bingo';
  draftChat('Join my Corporate Bingo board: ' + url.href);
});

const words = ['SCOPE','AUDIT','SHIFT','EMAIL','BRIEF','DRAFT','CHAIR','CLOCK','PIVOT','QUEUE','ASSET','STAFF','FORMS','FILES','TRAIN','TEAMS','PAPER','NOTES','TASKS'];
const wordForm = byId('wordForm');
const wordInput = wordForm.elements.guess;
const wordShare = byId('wordShare');
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
let day, answer, guesses;

function scoreGuess(guess) {
  const spare = [...answer];
  const marks = [...guess].map((letter, i) => {
    if (letter !== answer[i]) return 'absent';
    spare[i] = '';
    return 'correct';
  });
  [...guess].forEach((letter, i) => {
    if (marks[i] === 'correct') return;
    const slot = spare.indexOf(letter);
    if (slot >= 0) {
      spare[slot] = '';
      marks[i] = 'present';
    }
  });
  return marks;
}

function renderWord() {
  const won = guesses.includes(answer);
  const finished = won || guesses.length >= 6;
  const tiles = Array.from({ length: 30 }, (_, i) => {
    const guess = guesses[Math.floor(i / 5)];
    const tile = document.createElement('span');
    if (guess) {
      const letter = guess[i % 5];
      const mark = scoreGuess(guess)[i % 5];
      tile.textContent = letter;
      tile.dataset.match = mark;
      tile.setAttribute('aria-label', `${letter}, ${mark}`);
    }
    return tile;
  });
  byId('wordBoard').replaceChildren(...tiles);
  wordInput.disabled = wordForm.querySelector('button').disabled = finished;
  wordShare.hidden = !finished;
  byId('wordStatus').textContent = won ? `Solved in ${guesses.length}/6.` : finished ? `The word was ${answer}.` : `${6 - guesses.length} guesses left.`;
}

function updateWordDay() {
  const next = dayFormat.format(new Date());
  if (next === day) return;
  day = next;
  const dayNumber = Date.parse(day + 'T00:00:00Z') / 86400000;
  answer = words[dayNumber % words.length];
  guesses = [];
  try {
    const saved = JSON.parse(localStorage.getItem('office-wordle-' + day));
    if (Array.isArray(saved)) guesses = saved.filter(value => typeof value === 'string' && /^[A-Z]{5}$/.test(value)).slice(0, 6);
  } catch {}
  renderWord();
}

wordForm.addEventListener('submit', event => {
  event.preventDefault();
  updateWordDay();
  const guess = wordInput.value.trim().toUpperCase();
  if (wordInput.disabled || !/^[A-Z]{5}$/.test(guess)) return;
  guesses.push(guess);
  try { localStorage.setItem('office-wordle-' + day, JSON.stringify(guesses)); } catch {}
  wordInput.value = '';
  renderWord();
});
wordShare.addEventListener('click', () => {
  updateWordDay();
  if (wordShare.hidden) return;
  const icons = { correct: '🟩', present: '🟨', absent: '⬛' };
  const result = guesses.map(guess => scoreGuess(guess).map(mark => icons[mark]).join('')).join('\n');
  draftChat(`Corporate Wordle ${day} · ${guesses.includes(answer) ? guesses.length : 'X'}/6\n${result}`);
});
updateWordDay();
setInterval(updateWordDay, 30000);

const floor = byId('chaiFloor');
const ctx = floor.getContext('2d');
const start = byId('chaiStart');
const directions = { left: [-1,0], right: [1,0], up: [0,-1], down: [0,1] };
const chairs = new Set(['3,1','3,3','6,1','6,3']);
const home = [0, 5], desk = [9, 0];
let courier = [...home], deliveries = 0, trays = 3, tick = 0, runTimer;

function coworkers() {
  return [[tick % 10, 2], [9 - (tick + 3) % 10, 4]];
}

function drawFloor() {
  ctx.clearRect(0, 0, 480, 288);
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 10; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#161e18' : '#202920';
      ctx.fillRect(x * 48, y * 48, 48, 48);
    }
  }
  ctx.fillStyle = '#58882f';
  ctx.fillRect(desk[0] * 48, desk[1] * 48, 48, 48);
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  for (const chair of chairs) {
    const [x,y] = chair.split(',').map(Number);
    ctx.fillText('🪑', x * 48 + 24, y * 48 + 33);
  }
  for (const [x,y] of coworkers()) ctx.fillText('🧑‍💼', x * 48 + 24, y * 48 + 33);
  ctx.fillText('☕', courier[0] * 48 + 24, courier[1] * 48 + 33);
  const status = `Deliveries ${deliveries} · Trays ${trays}`;
  const display = trays ? status : 'Shift over. ' + status;
  if (byId('chaiStatus').textContent !== display) byId('chaiStatus').textContent = display;
}

function checkCollision() {
  if (!coworkers().some(([x,y]) => x === courier[0] && y === courier[1])) return;
  trays--;
  courier = [...home];
  if (!trays) {
    clearTimeout(runTimer);
    runTimer = undefined;
    start.textContent = 'Play again';
    start.disabled = false;
  }
}

function advanceCoworkers() {
  tick++;
  checkCollision();
  drawFloor();
  if (trays) runTimer = setTimeout(advanceCoworkers, Math.max(170, 560 - deliveries * 45));
}

function move(direction) {
  if (!runTimer) return;
  const [dx,dy] = directions[direction];
  const x = courier[0] + dx, y = courier[1] + dy;
  if (x < 0 || x > 9 || y < 0 || y > 5 || chairs.has(`${x},${y}`)) return;
  courier = [x,y];
  if (x === desk[0] && y === desk[1]) {
    deliveries++;
    courier = [...home];
  }
  checkCollision();
  drawFloor();
}

start.addEventListener('click', () => {
  courier = [...home];
  deliveries = tick = 0;
  trays = 3;
  start.disabled = true;
  floor.focus({ preventScroll: true });
  drawFloor();
  runTimer = setTimeout(advanceCoworkers, 560);
});
floor.addEventListener('keydown', event => {
  const direction = event.key.replace(/^Arrow/, '').toLowerCase();
  if (!event.key.startsWith('Arrow') || !Object.hasOwn(directions, direction)) return;
  event.preventDefault();
  move(direction);
});
for (const button of document.querySelectorAll('[data-chai]')) {
  button.addEventListener('click', () => move(button.dataset.chai));
}
drawFloor();
