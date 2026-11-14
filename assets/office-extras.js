import { publicName } from './public-name.mjs';
const byId = id => document.getElementById(id);
const root = byId('office-tools');
const card = (title, content) => `<article class="dash"><h3>${title}</h3>${content}</article>`;
root.innerHTML = `<div class="sectionhead"><h2>OFFICE TOOLS</h2></div><div class="office-grid office-primary">
${card('My Desk', '<p id="deskIdentity"></p><p id="deskStatus"></p><p id="deskVisits"></p><form id="deskTasks"><input name="task" maxlength="160" required aria-label="New task" placeholder="What needs doing today?"><button class="btn">Add task</button></form><ul id="deskList"></ul><label>Shift notes<textarea id="deskNotes" maxlength="4000"></textarea></label><p>Tasks and notes stay in this browser.</p>')}
${card('Corporate Confessions', '<form id="confessionForm"><label>Anonymous confession<textarea name="text" required maxlength="280" placeholder="Leave out names and private details"></textarea></label><button class="btn">Post anonymously</button></form><button class="btn" id="confessionRefresh">Refresh</button><button class="btn" id="confessionModerate">Moderator</button><p id="confessionStatus" role="status"></p><ul id="confessionList"></ul>')}
</div>
<details class="office-group"><summary>Fun tools</summary><div class="office-grid">
${card('Why I’m Late', '<p id="excuseText"></p><button class="btn" id="excuseGenerate">New excuse</button><button class="btn" id="excuseShare">Share card</button>')}
${card('Appraisal Simulator', '<p id="appraisalText" role="status">How much of a hike are you asking for?</p><form id="appraisalForm"><label>Hike (%) <input name="hike" type="number" min="1" max="100" required></label><button class="btn">Negotiate</button></form>')}
${card('Which Corporate Mazdoor Are You?', '<form id="mazdoorQuiz"></form><p id="quizResult" role="status"></p><button class="btn" id="quizShare" hidden>Share result card</button>')}
${card('Resignation Letter Generator', '<form id="resignForm"><label>Manager <input name="manager" maxlength="40" placeholder="Manager"></label><button class="btn">Draft letter</button></form><textarea id="resignText" aria-label="Resignation draft"></textarea><button class="btn" id="resignCopy">Copy draft</button><p id="resignStatus" role="status"></p>')}
${card('Salary Slip Decoder', '<form id="salaryForm"><label>Monthly gross (₹) <input name="gross" type="number" required min="0" step=".01"></label><label>Total deductions (₹) <input name="deduct" type="number" required min="0" step=".01"></label><label>EMIs (₹) <input name="emi" type="number" min="0" step=".01"></label><label>Chai budget (₹) <input name="chai" type="number" min="0" step=".01"></label><button class="btn">Decode</button></form><p id="salaryResult" role="status"></p>')}
${card('Mazdoor of the Day', '<p id="officeMeme"></p><p id="officeBadges"></p>')}
</div></details>
<details class="office-group office-settings"><summary>Office settings</summary><div class="office-grid">
${card('Preferences', '<label><input type="checkbox" id="officeSound"> Sound effects</label><br><label><input type="checkbox" id="officeMute"> Mute radio and effects</label><br><label><input type="checkbox" id="officeMotion"> Reduce motion</label><br><button class="btn" id="bossButton">Boss key · Esc</button><button class="btn" id="fridayButton" hidden>Half-day?</button><p id="officeShareStatus" role="status"></p>')}
</div></details><dialog id="bossSheet" class="office-dialog"><h2>Quarterly Operations Report.xlsx</h2><table><thead><tr><th>Workstream</th><th>Owner</th><th>Status</th></tr></thead><tbody><tr><td>Reconciliation</td><td>Finance</td><td>In progress</td></tr><tr><td>Forecast review</td><td>Operations</td><td>Pending</td></tr><tr><td>Weekly reporting</td><td>Analytics</td><td>Complete</td></tr></tbody></table><form method="dialog"><button>Return to office</button></form></dialog>
<dialog id="fridayPopup" class="office-dialog"><h2>Half-day?</h2><p>Manager approval pending. The Friday playlist is ready.</p><form method="dialog"><button value="radio">Play Friday radio</button> <button>Back to work</button></form></dialog>`;

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem('office-extra-' + key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem('office-extra-' + key, JSON.stringify(value)); } catch {}
}
const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const istTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' });
const dayKey = () => ist.format(new Date());
let activeDay;
let desk;
let visits = read('visits', []);
let badges = read('badges', []);
let meetingRuns = read('meeting-runs', 0);
let punchedAt;
const memes = [
  'Mazdoor of the Day — the person who said “let’s cancel this recurring meeting.”',
  'Mazdoor of the Day — whoever fixed the spreadsheet by removing one extra space.',
  'Mazdoor of the Day — the teammate who remembered to order samosas.',
  'Mazdoor of the Day — the person whose “quick call” actually ended in five minutes.',
  'Mazdoor of the Day — whoever left a proper handover before going on leave.'
];
function award(name) {
  if (!badges.includes(name)) {
    badges.push(name);
    save('badges', badges);
  }
  byId('officeBadges').textContent = badges.length ? 'Badges · ' + badges.join(' · ') : '';
}
function renderTasks() {
  byId('deskList').replaceChildren(...desk.tasks.map(task => {
    const row = document.createElement('li');
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.onchange = () => { task.done = check.checked; save('desk-' + activeDay, desk); };
    label.append(check, ' ' + task.text);
    const remove = document.createElement('button');
    remove.className = 'btn';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + task.text);
    remove.onclick = () => {
      desk.tasks = desk.tasks.filter(item => item !== task);
      save('desk-' + activeDay, desk);
      renderTasks();
      byId('deskTasks').elements.task.focus();
    };
    row.append(label, ' ', remove);
    return row;
  }));
}
function updateDesk() {
  const day = dayKey();
  const hour = Number(istTime.format(new Date()));
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  byId('deskStatus').textContent = hour >= 21 || hour < 5 ? 'Still online. Why?'
    : hour >= 12 && hour < 14 ? 'Out for chai.'
    : weekday === 1 ? 'Monday shift. Inbox backlog detected.'
    : weekday === 5 ? 'Friday shift. Half-day approval pending.' : 'On shift.';
  if (punchedAt) {
    const minutes = Math.floor((Date.now() - punchedAt) / 60000);
    byId('deskIdentity').textContent = `${byId('introName').value} · ${byId('introTeam').value} · ${minutes} min on shift`;
  }
  if (activeDay === day) return;
  activeDay = day;
  desk = read('desk-' + day, { tasks: [], notes: '' });
  byId('deskNotes').value = desk.notes;
  renderTasks();
  const serial = Date.parse(day + 'T00:00:00Z') / 86400000;
  document.body.dataset.officeDay = weekday === 1 ? 'Mon' : weekday === 5 ? 'Fri' : '';
  byId('fridayButton').hidden = weekday !== 5;
  byId('officeMeme').textContent = memes[serial % memes.length];
  if (punchedAt) countVisit();
}
function countVisit() {
  const serial = Date.parse(activeDay + 'T00:00:00Z') / 86400000;
  if (!visits.includes(serial)) {
    visits = [...visits.filter(day => day >= serial - 366), serial];
    save('visits', visits);
  }
  let streak = 0;
  while (visits.includes(serial - streak)) streak++;
  byId('deskVisits').textContent = `Day ${streak} of grinding · consecutive visits`;
}
byId('deskTasks').onsubmit = event => {
  event.preventDefault();
  updateDesk();
  const input = event.currentTarget.elements.task;
  if (!input.value.trim()) return;
  desk.tasks.push({ text: input.value.trim(), done: false });
  save('desk-' + activeDay, desk);
  input.value = '';
  renderTasks();
};
byId('deskNotes').oninput = event => {
  const value = event.currentTarget.value;
  updateDesk();
  desk.notes = event.currentTarget.value = value;
  save('desk-' + activeDay, desk);
};
window.addEventListener('office-punch-in', () => {
  punchedAt = Date.now();
  updateDesk();
  countVisit();
  if (document.body.dataset.officeDay === 'Fri' && !read('friday-' + activeDay, false)) {
    save('friday-' + activeDay, true);
    setTimeout(() => byId('fridayPopup').showModal(), 500);
  }
});
updateDesk();
setInterval(updateDesk, 15000);
byId('officeBadges').textContent = badges.length ? 'Badges · ' + badges.join(' · ') : '';
const sound = byId('officeSound');
const mute = byId('officeMute');
const motion = byId('officeMotion');
const radio = byId('radioAudio');
mute.checked = read('mute', false);
radio.muted = mute.checked;
mute.onchange = () => {
  save('mute', mute.checked);
  radio.muted = mute.checked;
  if (mute.checked && byId('radioEmbedPlayer').querySelector('iframe')) window.closeOnlinePlaylist();
};
sound.checked = read('sound', false);
motion.checked = read('motion', matchMedia('(prefers-reduced-motion: reduce)').matches);
function applyMotion() {
  document.documentElement.classList.toggle('office-reduced', motion.checked);
  const video = document.querySelector('.hero video');
  if (motion.checked) video.pause();
  else video.play().catch(() => {});
}
applyMotion();
motion.onchange = () => { save('motion', motion.checked); applyMotion(); };
let audio;
function ping() {
  if (!sound.checked || mute.checked || !audio) return;
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  tone.frequency.value = 720;
  volume.gain.setValueAtTime(.045, audio.currentTime);
  volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .16);
  tone.connect(volume).connect(audio.destination);
  tone.start();
  tone.stop(audio.currentTime + .17);
}
sound.onchange = () => {
  save('sound', sound.checked);
  if (sound.checked && window.AudioContext) {
    audio ??= new AudioContext();
    audio.resume().then(ping).catch(() => {});
  }
};
window.addEventListener('pointerdown', () => {
  if (sound.checked && !audio && window.AudioContext) {
    audio = new AudioContext();
    audio.resume().catch(() => {});
  }
});
const boss = byId('bossSheet');
let resumeRadio = false;
byId('bossButton').onclick = () => {
  resumeRadio = Boolean(radio && !radio.paused);
  radio?.pause();
  const embed = byId('radioEmbedPlayer');
  if (embed?.querySelector('iframe')) window.closeOnlinePlaylist();
  boss.showModal();
};
boss.addEventListener('close', () => { if (resumeRadio) radio.play().catch(() => {}); });
let typed = '';
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !event.repeat && !document.querySelector('dialog[open]') && punchedAt) {
    event.preventDefault();
    byId('bossButton').click();
  }
  if (event.target.closest?.('input, textarea, select, [contenteditable]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length === 1) typed = (typed + event.key.toLowerCase()).slice(-4);
  if (typed === 'chai') {
    typed = '';
    const cups = document.createElement('div');
    cups.className = 'office-cups';
    cups.setAttribute('aria-hidden', 'true');
    cups.textContent = '☕ '.repeat(36);
    document.body.append(cups);
    setTimeout(() => cups.remove(), 1600);
    award('Chai Level: Legendary');
  }
});
let clockClicks = 0;
const clock = byId('officeClock');
clock.setAttribute('role', 'button');
clock.tabIndex = 0;
clock.onclick = () => {
  if (++clockClicks % 5 !== 0) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'office-dialog';
  dialog.innerHTML = '<h2>Salary credited!</h2><p>EMI department has entered the chat.</p><form method="dialog"><button>Close</button></form>';
  document.body.append(dialog);
  dialog.onclose = () => dialog.remove();
  dialog.showModal();
};
clock.onkeydown = event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); clock.click(); }
};
byId('fridayButton').onclick = () => byId('fridayPopup').showModal();
byId('fridayPopup').addEventListener('close', event => {
  if (event.target.returnValue !== 'radio') return;
  event.target.returnValue = '';
  byId('radio').scrollIntoView();
  byId('loadChillMode').click();
});

async function shareCard(title, message) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 566;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121611';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#caff39';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('CORPORATE MAZDOOR', 64, 88);
    ctx.fillStyle = '#eeeae0';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText(title, 64, 176, 950);
    ctx.font = '35px sans-serif';
    let line = '';
    let y = 258;
    for (const word of message.split(/\s+/)) {
      if (ctx.measureText(line + word).width > 950 && line) {
        ctx.fillText(line, 64, y, 950);
        y += 47;
        line = '';
      }
      line += word + ' ';
    }
    ctx.fillText(line, 64, y, 950);
    ctx.font = '24px sans-serif';
    ctx.fillText('corporatemazdoor.netlify.app', 64, 512);
    const blob = await new Promise(resolve => canvas.toBlob(resolve));
    const file = new File([blob], 'corporate-mazdoor.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title, text: message, files: [file] });
    else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    }
  } catch (error) {
    if (error.name !== 'AbortError') byId('officeShareStatus').textContent = 'Could not share the card. Try again.';
  }
}
const excuses = [
  'Metro ne dhoka diya. The next train also needed manager approval.',
  'Society lift was doing a production deployment between floors.',
  'The chai tapri had a P0 incident. I volunteered for triage.',
  'Auto bhaiya took a shortcut that needed three sprint cycles.',
  'My laptop updated at 99% for exactly one stand-up.'
];
byId('excuseGenerate').onclick = () => {
  const options = excuses.filter(text => text !== byId('excuseText').textContent);
  byId('excuseText').textContent = options[Math.floor(Math.random() * options.length)];
};
byId('excuseGenerate').click();
byId('excuseShare').onclick = () => shareCard('Why I’m Late', byId('excuseText').textContent);
const appraisalStarts = ['Budget nahi hai.', 'Finance froze the numbers.', 'Your rating is great on paper.', 'The market is unpredictable.', 'The approval is with leadership.', 'This quarter is already closed.', 'We’re calibrating your band.', 'Your manager is on leave.', 'The spreadsheet says no.', 'We can revisit this in Q4.'];
const appraisalEnds = ['Can we circle back after lunch?', 'How about a certificate?', 'Let’s book another quick call.', 'There is chai in the pantry.', 'I’ll add it to the tracker.'];
const appraisalReplies = appraisalStarts.flatMap(first => appraisalEnds.map(last => first + ' ' + last));
let appraisalIndex = Math.floor(Math.random() * appraisalReplies.length);
byId('appraisalForm').onsubmit = event => {
  event.preventDefault();
  byId('appraisalText').textContent = `You asked for ${event.currentTarget.elements.hike.value}%. Boss: ${appraisalReplies[appraisalIndex++ % appraisalReplies.length]}`;
};
const questions = [
  ['Your calendar clears. You…', 'Get chai', 'Turn off notifications', 'Plan the Friday exit'],
  ['A meeting runs over. You…', 'Bring another chai', 'Disappear from the participant list', 'Ask what can wait until Monday'],
  ['Your ideal work perk?', 'Unlimited cutting chai', 'Meeting-free afternoons', 'Guaranteed half-day Fridays']
];
byId('mazdoorQuiz').innerHTML = questions.map(([label, ...options], index) =>
  `<p><label>${label} <select name="q${index}" required><option value="">Choose</option>${options.map((option, value) => `<option value="${value}">${option}</option>`).join('')}</select></label></p>`
).join('') + '<button class="btn">Get result</button>';
byId('mazdoorQuiz').onsubmit = event => {
  event.preventDefault();
  const scores = [0, 0, 0];
  for (const value of new FormData(event.currentTarget).values()) scores[Number(value)]++;
  byId('quizResult').textContent = ['Chai Addict', 'Meeting Ghost', 'Friday Hero'][scores.indexOf(Math.max(...scores))];
  byId('quizShare').hidden = false;
};
byId('quizShare').onclick = () => shareCard('Which Corporate Mazdoor Are You?', 'I got ' + byId('quizResult').textContent + '.');
byId('resignForm').onsubmit = event => {
  event.preventDefault();
  const manager = event.currentTarget.elements.manager.value.trim() || 'Manager';
  byId('resignText').value = `Dear ${manager},\n\nPlease accept my resignation from the recurring meeting titled “Quick Sync.” I will hand over the agenda as soon as someone finds it.\n\nRegards,\n${byId('introName').value || 'A corporate mazdoor'}`;
};
byId('resignCopy').onclick = async () => {
  const draft = byId('resignText').value.trim();
  if (!draft) return;
  try { await navigator.clipboard.writeText(draft); byId('resignStatus').textContent = 'Draft copied.'; }
  catch { byId('resignText').select(); byId('resignStatus').textContent = 'Draft selected for copying.'; }
};
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
byId('salaryForm').onsubmit = event => {
  event.preventDefault();
  const { gross, deduct, emi, chai } = Object.fromEntries(new FormData(event.currentTarget));
  const inHand = Number(gross) - Number(deduct);
  byId('salaryResult').textContent = inHand < 0 ? 'Deductions cannot exceed gross pay.'
    : `Gross ${currency.format(gross)}\nEstimated in-hand ${currency.format(inHand)}\nAfter EMI and chai ${currency.format(inHand - Number(emi) - Number(chai))}`;
};
const gameSections = {
  'Meeting Dodge': 'meeting-game', 'Chai Run': 'chai-run', 'Deadline Dash': 'deadline-dash',
  'Local Tic-Tac-Toe': 'tic-tac-toe', 'Online Tic-Tac-Toe': 'onlineTic',
  'Corporate Bingo': 'corporate-bingo', 'Corporate Wordle': 'corporate-wordle',
  'Typing Race': 'typing-race', 'Office Detective': 'office-detective',
  'Corporate Plot Twist': 'corporate-plot-twist', 'Friday Half-Day Heist': 'half-day-heist',
  'Office Bluff': 'office-bluff'
};
window.addEventListener('office-result', ({ detail: { game, score } }) => {
  const section = byId(gameSections[game]);
  if (!section) return;
  ping();
  if (game === 'Meeting Dodge') {
    save('meeting-runs', ++meetingRuns);
    if (meetingRuns >= 3) award('Survived 3 meetings');
  }
  if (Number(istTime.format(new Date())) === 2) award('Played at 2 AM');
  let share = document.querySelector('[data-share-game="' + game + '"]');
  if (!share) {
    const anchor = section.querySelector('.dash') ?? section;
    share = document.createElement('button');
    share.className = 'btn';
    share.dataset.shareGame = game;
    anchor.append(share);
  }
  const result = game === 'Friday Half-Day Heist' ? `${((90001 - score) / 1000).toFixed(2)} seconds` : game === 'Typing Race' ? `${score} WPM` : String(score);
  share.textContent = 'Share ' + game + ' result';
  share.onclick = () => shareCard(game, `My result on Corporate Mazdoor: ${result}. Can you beat it?`);
});

let confessionKey = '';
let confessionToken = crypto.randomUUID();
let confessionDraft;
try {
  confessionToken = localStorage.getItem('office-confession-token') || confessionToken;
  localStorage.setItem('office-confession-token', confessionToken);
} catch {}
let confessionBusy = false;
async function confessions(action, data = {}) {
  if (confessionBusy) return false;
  confessionBusy = true;
  const status = byId('confessionStatus');
  status.textContent = 'Loading…';
  try {
    const response = await fetch('/.netlify/functions/confessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ action, token: confessionToken, key: confessionKey, ...data })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const control = (label, activate) => {
      const button = document.createElement('button');
      button.className = 'btn';
      button.textContent = label;
      button.onclick = activate;
      return button;
    };
    byId('confessionList').replaceChildren(...result.posts.map(post => {
      const row = document.createElement('li');
      const text = document.createElement('p');
      text.textContent = post.text;
      row.append(text);
      for (const [reaction, count] of post.reactions) {
        const button = control(`${reaction} · ${count}`, () => confessions('react', { target: post.id, reaction }));
        button.setAttribute('aria-pressed', String(post.yourReaction === reaction));
        row.append(button);
      }
      const report = control(post.reported ? 'Reported' : 'Report', () => confessions('report', { target: post.id }));
      report.disabled = post.reported;
      row.append(report);
      if (result.moderator) row.append(control(`Remove · ${post.reports} reports`, () => confessions('remove', { target: post.id })));
      return row;
    }));
    status.textContent = action === 'post' ? 'Posted anonymously.' : action === 'report' ? 'Report submitted.' : result.posts.length ? '' : 'No confessions yet.';
    return true;
  } catch (error) {
    status.textContent = error.message || 'Try again shortly.';
    return false;
  } finally {
    confessionBusy = false;
  }
}
byId('confessionForm').onsubmit = async event => {
  event.preventDefault();
  if (confessionBusy) return;
  const input = event.currentTarget.elements.text;
  const text = input.value.trim();
  if (!text) return;
  if (confessionDraft?.text !== text) confessionDraft = { text, postId: crypto.randomUUID() };
  if (await confessions('post', confessionDraft)) {
    if (input.value.trim() === text) input.value = '';
    confessionDraft = undefined;
  }
};
byId('confessionRefresh').onclick = () => confessions('list');
byId('confessionModerate').onclick = async () => {
  if (confessionBusy) return;
  const entered = window.prompt('Moderator key. Leave blank to exit moderator mode.');
  if (entered === null) return;
  confessionKey = entered;
  if (!await confessions('list')) confessionKey = '';
};
const confessionObserver = new IntersectionObserver(entries => {
  if (!entries.some(entry => entry.isIntersecting)) return;
  confessionObserver.disconnect();
  confessions('list');
});
confessionObserver.observe(byId('confessionForm'));

const displayName = byId('introName');
displayName.addEventListener('input', () => {
  displayName.setCustomValidity(displayName.value.trim() && !publicName(displayName.value)
    ? 'Use letters, numbers, spaces or simple punctuation in your display name.' : '');
});

