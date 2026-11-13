import { draftChat } from './chat-draft.js';

const byId = id => document.getElementById(id);
const phrases = ['Quick call?', 'You’re on mute', 'One last change', 'Per my last email', 'Circle back', 'No agenda', 'Can you see my screen?', 'Chai break', 'End of day', 'Let’s take this offline', 'Looping you in', 'Friday deploy', 'Can we sync?', 'Final_v7', 'Who owns this?', 'Adding some context'];
const hindiPhrases = ['एक छोटी कॉल?', 'आप म्यूट पर हैं', 'बस एक आख़िरी बदलाव', 'जैसा पिछले मेल में लिखा था', 'इस पर फिर बात करेंगे', 'कोई एजेंडा नहीं', 'स्क्रीन दिख रही है?', 'चाय का ब्रेक', 'आज शाम तक', 'इस पर अलग से बात करें', 'आपको भी जोड़ रहा हूँ', 'शुक्रवार का डिप्लॉय', 'एक बार बात करें?', 'फ़ाइनल वाला फ़ाइनल', 'इसकी ज़िम्मेदारी किसकी है?', 'थोड़ी जानकारी और'];
const bingoLanguage = byId('bingoLanguage');
let hindiBingo = new URLSearchParams(location.search).get('bingoLang') === 'hi';
bingoLanguage.setAttribute('aria-pressed', String(hindiBingo));
bingoLanguage.addEventListener('click', () => {
  hindiBingo = !hindiBingo;
  bingoLanguage.setAttribute('aria-pressed', String(hindiBingo));
  byId('bingoBoard').querySelectorAll('button').forEach((button, position) => {
    button.textContent = (hindiBingo ? hindiPhrases : phrases)[card[position]];
  });
});
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const detectiveCases = [
  ['The report lost half its rows.', ['The source file still has every row.', 'A funnel icon appeared in the column header.', 'Clearing the current view brings the rows back.'], ['An active filter', 'A failed upload', 'A deleted worksheet'], 'The rows were hidden by a filter.'],
  ['Nobody joined the 10 a.m. call.', ['The organiser copied an old invite.', 'Their calendar says 10 a.m. London.', 'The India team was expecting 10 a.m. IST.'], ['The wrong time zone', 'The meeting link expired', 'Everyone was on mute'], 'The invite was scheduled for London time.'],
  ['The customer opened the wrong proposal.', ['The email points to the correct folder.', 'Two files have almost identical names.', 'The attachment was exported before Legal’s edits.'], ['An older attachment', 'A broken folder link', 'A missing permission'], 'The email had an old copy of the proposal.'],
  ['The printer keeps producing blank pages.', ['It feeds paper normally.', 'The printer’s own test page is blank.', 'The supply screen shows black at zero.'], ['An empty toner cartridge', 'A paper jam', 'A bad PDF export'], 'The printer is out of toner.'],
  ['The shared tracker stopped adding up.', ['Only the rows added today are missing from the total.', 'The new amounts are valid numbers.', 'The formula ends one row above today’s entries.'], ['The formula range is too short', 'The amounts are stored as text', 'The sheet is locked'], 'The new rows sit outside the SUM range.'],
  ['The candidate never received the interview invite.', ['The recruiter’s sent folder shows the invite.', 'The meeting link works for the panel.', 'The candidate’s address has one extra letter.'], ['A mistyped email address', 'A broken meeting link', 'A calendar outage'], 'The invite went to the wrong address.'],
  ['The office access card stopped working.', ['Other cards work at the same door.', 'The card still reads at reception.', 'The access log says the assignment ended yesterday.'], ['The access assignment expired', 'The door reader failed', 'The card chip broke'], 'The card works, but its access window ended.'],
  ['The campaign link shows a 404.', ['The landing page opens from the website menu.', 'The email link ends in /offfers.', 'The published page is at /offers.'], ['A typo in the link', 'The server is down', 'The page is private'], 'The campaign URL has an extra f.'],
  ['The team hears an echo on the call.', ['Two laptops are in the same meeting room.', 'Both have their speakers and microphones on.', 'The echo stops when one laptop mutes.'], ['Audio feedback', 'Slow Wi-Fi', 'A broken camera'], 'The laptops are picking up each other’s audio.'],
  ['The office ran out of chai at 11.', ['The kettle works.', 'There’s milk in the fridge.', 'The tea tin contains a note saying “please reorder.”'], ['The tea leaves ran out', 'The kettle broke', 'The milk delivery was late'], 'The pantry ran out of tea leaves.']
];
const detectiveNext = byId('detectiveNext');
const detectiveChoices = byId('detectiveChoices');
const detectiveResult = byId('detectiveResult');
let caseQueue = [];
let lastCase;
let solvedCases = 0;
let investigatedCases = 0;

detectiveNext.addEventListener('click', () => {
  if (!caseQueue.length) {
    caseQueue = shuffle(detectiveCases);
    if (caseQueue.at(-1) === lastCase) caseQueue.unshift(caseQueue.pop());
  }
  lastCase = caseQueue.pop();
  const [title, clues, choices, explanation] = lastCase;
  byId('detectiveCase').textContent = title;
  byId('detectiveClues').replaceChildren(...shuffle(clues).map(clue => {
    const row = document.createElement('li');
    row.textContent = clue;
    return row;
  }));
  detectiveResult.textContent = '';
  const buttons = shuffle(choices).map(choice => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.type = 'button';
    button.textContent = choice;
    button.addEventListener('click', () => {
      const correct = choice === choices[0];
      investigatedCases++;
      if (correct) solvedCases++;
      window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Office Detective', score: solvedCases } }));
      detectiveResult.textContent = `${correct ? 'Case solved.' : 'Missed it.'} ${explanation} · ${solvedCases}/${investigatedCases} solved`;
      buttons.forEach(option => { option.disabled = true; });
      detectiveNext.textContent = 'Next case';
      detectiveNext.hidden = false;
      detectiveNext.focus();
    });
    return button;
  });
  detectiveChoices.replaceChildren(...buttons);
  detectiveNext.hidden = true;
  buttons[0].focus();
});
let card;


function renderBingo(indices) {
  card = indices;
  const marked = new Set();
  let reported = false;
  byId('bingoStatus').textContent = '';
  byId('bingoBoard').replaceChildren(...card.map((phrase, position) => {
    const cell = document.createElement('button');
    cell.className = 'btn';
    cell.type = 'button';
    cell.textContent = (hindiBingo ? hindiPhrases : phrases)[phrase];
    cell.setAttribute('aria-pressed', 'false');
    cell.addEventListener('click', () => {
      if (marked.has(position)) marked.delete(position);
      else marked.add(position);
      cell.setAttribute('aria-pressed', String(marked.has(position)));
      const bingo = lines.some(line => line.every(i => marked.has(i)));
      byId('bingoStatus').textContent = bingo ? 'Bingo! Call it in the Break Room.' : '';
      if (bingo && !reported) {
        reported = true;
        window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Corporate Bingo', score: 1 } }));
      }
    });
    return cell;
  }));
}

const sharedCard = [...(new URLSearchParams(location.search).get('bingo') || '')].map(char => parseInt(char, 16));
const validCard = sharedCard.length === 9 && new Set(sharedCard).size === 9 && sharedCard.every(i => i >= 0 && i < phrases.length);
function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function newBingoCard() {
  renderBingo(shuffle(phrases.map((_, i) => i)).slice(0, 9));
}
if (validCard) renderBingo(sharedCard);
else newBingoCard();
byId('bingoNew').addEventListener('click', newBingoCard);
byId('bingoShare').addEventListener('click', () => {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('bingo', card.map(i => i.toString(16)).join(''));
  if (hindiBingo) url.searchParams.set('bingoLang', 'hi');
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
  if (wordInput.disabled) {
    const score = guess === answer ? 7 - guesses.length : 0;
    window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Corporate Wordle', score } }));
  }
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
let chairs = new Set();
const home = [0, 5], desk = [9, 0];
let courier = [...home], deliveries = 0, trays = 3, runTimer;
let patrols = [];

function resetFloor() {
  const clearColumn = Math.floor(Math.random() * 10);
  const chairSlots = [1, 3].flatMap(y => Array.from({ length: 10 }, (_, x) => [x, y]));
  chairs = new Set(shuffle(chairSlots.filter(([x]) => x !== clearColumn)).slice(0, 6).map(([x,y]) => `${x},${y}`));
  patrols = [2, 4].map(y => ({ x: Math.floor(Math.random() * 10), y, direction: Math.random() < .5 ? -1 : 1 }));
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
  for (const { x, y } of patrols) ctx.fillText('🧑‍💼', x * 48 + 24, y * 48 + 33);
  ctx.fillText('☕', courier[0] * 48 + 24, courier[1] * 48 + 33);
  const status = `Deliveries ${deliveries} · Trays ${trays}`;
  const display = trays ? status : 'Shift over. ' + status;
  if (byId('chaiStatus').textContent !== display) byId('chaiStatus').textContent = display;
}

function checkCollision() {
  if (!patrols.some(({ x, y }) => x === courier[0] && y === courier[1])) return;
  trays--;
  courier = [...home];
  if (!trays) {
    window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Chai Run', score: deliveries } }));
    clearTimeout(runTimer);
    runTimer = undefined;
    start.textContent = 'Play again';
    start.disabled = false;
  }
}

function advanceCoworkers() {
  for (const coworker of patrols) {
    if (Math.random() < .15) continue;
    if (Math.random() < .2) coworker.direction *= -1;
    const next = coworker.x + coworker.direction;
    if (next < 0 || next > 9) coworker.direction *= -1;
    coworker.x += coworker.direction;
  }
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
  deliveries = 0;
  resetFloor();
  trays = 3;
  start.disabled = true;
  floor.focus({ preventScroll: true });
  drawFloor();
  runTimer = setTimeout(advanceCoworkers, 560);
});
floor.addEventListener('keydown', event => {
  if (!runTimer || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  const controls = { w: 'up', a: 'left', s: 'down', d: 'right',
    arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right' };
  if (!Object.hasOwn(controls, key)) return;
  event.preventDefault();
  move(controls[key]);
});
for (const button of document.querySelectorAll('[data-chai]')) {
  button.addEventListener('click', () => move(button.dataset.chai));
}
resetFloor();
drawFloor();

const roleTasks = {
  "Developer": ["checkout regression","routine code review","editor theme"],
  "DevOps": ["failed production deploy","weekly access audit","dashboard redesign"],
  "Data Analyst": ["incorrect revenue report","spreadsheet cleanup","chart colors"],
  "Business Analyst": ["missing launch requirement","meeting notes","template redesign"],
  "Data Scientist": ["broken production model","dataset labeling","experiment naming"],
  "Project Manager": ["launch blocker","meeting scheduling","status slide styling"],
  "Sales & Support": ["customer locked out","CRM cleanup","email signature"],
  "HR & Admin": ["payroll cutoff issue","interview scheduling","office poster"],
  "Finance": ["payment cutoff issue","receipt filing","workbook styling"],
  "Operations": ["stalled priority shipment","stock count","tracker colors"],
  "Marketing & Design": ["broken campaign link","asset export","mood board refresh"],
  "Tech & QA": ["checkout fails in production","routine regression check","test report styling"],
};
const deadlineStart = byId('deadlineStart');
const deadlineStats = byId('deadlineStats');
const deadlineTask = byId('deadlineTask');
const deadlineFeedback = byId('deadlineFeedback');
const deadlineButtons = [...document.querySelectorAll('[data-deadline]')];
const taskTypes = [
  { action: 'now', clues: ['The release is blocked and the decision needs your approval today.', 'The deadline is in ten minutes and you are the only available owner.', 'A customer is waiting and only you have the required access.'] },
  { action: 'delegate', clues: ['A teammate is free and has handled this before.', 'The backup owner is available and has the instructions.', 'A teammate has offered to take it and already has access.'] },
  { action: 'later', clues: ['This can wait until next sprint without blocking anyone.', 'It is an optional polish item with no deadline.', 'The request is for next month and nothing depends on it today.'] }
];
let dashEnd = 0;
let dashScore = 0;
let dashTimer;
let dashTasks = [];
let taskQueue = [];
let currentTask;

function nextDeadlineTask() {
  if (!taskQueue.length) {
    taskQueue = shuffle(dashTasks);
    if (taskQueue.at(-1) === currentTask) taskQueue.unshift(taskQueue.pop());
  }
  currentTask = taskQueue.pop();
  deadlineTask.textContent = `${currentTask.title} · ${currentTask.detail}`;
}

function updateDeadlineDash() {
  const seconds = Math.max(0, Math.ceil((dashEnd - performance.now()) / 1000));
  deadlineStats.textContent = `${seconds}s · Score ${dashScore}`;
  if (seconds > 0) return true;
  clearInterval(dashTimer);
  dashEnd = 0;
  deadlineButtons.forEach(button => { button.disabled = true; });
  deadlineStart.disabled = false;
  deadlineStart.textContent = 'Play again';
  deadlineTask.textContent = '';
  deadlineFeedback.textContent = `Time’s up. Final score ${dashScore}.`;
  window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Deadline Dash', score: dashScore } }));
  return false;
}

deadlineStart.addEventListener('click', () => {
  const role = byId('introTeam').value;
  const titles = roleTasks[role] ?? roleTasks.Developer;
  dashTasks = taskTypes.flatMap(({ action, clues }, index) =>
    clues.flatMap(detail => [titles[index], 'New inbox request', 'Task from your team board']
      .map(title => ({ action, detail, title })))
  );
  taskQueue = [];
  dashScore = 0;
  dashEnd = performance.now() + 30000;
  deadlineFeedback.textContent = '';
  deadlineStart.disabled = true;
  deadlineButtons.forEach(button => { button.disabled = false; });
  nextDeadlineTask();
  updateDeadlineDash();
  dashTimer = setInterval(updateDeadlineDash, 200);
  deadlineButtons[0].focus();
});

for (const button of deadlineButtons) {
  button.addEventListener('click', () => {
    if (!dashEnd || !updateDeadlineDash()) return;
    const correct = button.dataset.deadline === currentTask.action;
    dashScore += correct ? 1 : -1;
    const expected = deadlineButtons.find(choice => choice.dataset.deadline === currentTask.action);
    deadlineFeedback.textContent = correct ? 'Good call. +1' : `Best choice was ${expected.textContent}. −1`;
    nextDeadlineTask();
    updateDeadlineDash();
  });
}
