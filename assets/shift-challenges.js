const byId = id => document.getElementById(id);
const plot = byId('corporate-plot-twist');
const start = byId('plotStart');
const prompt = byId('plotPrompt');
const clock = byId('plotClock');
const choices = byId('plotChoices');
const feedback = byId('plotStatus');
const incidents = {
  Developer: ['The Friday deploy broke checkout.', 'Roll back and verify checkout'],
  DevOps: ['Production latency spiked after a config change.', 'Compare the change and restore the last healthy config'],
  'Data Analyst': ['The dashboard doubled yesterday’s revenue.', 'Check the join for duplicate rows'],
  'Business Analyst': ['Two teams signed off on different requirements.', 'Confirm the acceptance criteria with both teams'],
  'Data Scientist': ['Offline accuracy jumped after adding a new field.', 'Check for data leakage'],
  'Project Manager': ['Two critical deliveries need the same person tomorrow.', 'Agree on priorities and reset expectations'],
  'Sales & Support': ['Three customers report the same issue.', 'Log a shared incident and communicate the workaround'],
  'HR & Admin': ['A new joiner arrives and their laptop is missing.', 'Arrange a loaner and confirm the equipment request'],
  Finance: ['The reconciliation is off by one rupee.', 'Trace the discrepancy against the source entries'],
  Operations: ['The courier missed the pickup.', 'Confirm a new pickup and update affected teams'],
  'Marketing & Design': ['An old logo made it into tomorrow’s campaign.', 'Replace the asset and verify the scheduled previews'],
  'Tech & QA': ['A release candidate fails the smoke test.', 'Capture a repro and flag the release blocker']
};
const sharedIncidents = [
  ['Someone sent the wrong attachment to the whole team.', 'Send the correct version with a clear correction'],
  ['A recurring meeting has two conflicting agendas.', 'Confirm the decision needed before the meeting'],
  ['A shared file suddenly requests access from everyone.', 'Ask the owner to check the sharing settings'],
  ['Two versions of the weekly report went out.', 'Identify the current version and correct the thread'],
  ['A vendor changed tomorrow’s delivery window.', 'Confirm the new window and notify the people affected']
];
let lastScenario;
let timer;

window.addEventListener('office-punch-in', () => {
  const role = byId('introTeam').value;
  prompt.textContent = incidents[role]?.[0] ?? 'A surprise lands in your inbox.';
  const link = byId('plotInvite');
  link.hidden = false;
  link.addEventListener('click', () => {
    plot.scrollIntoView();
    start.focus({ preventScroll: true });
  });
});

start.addEventListener('click', () => {
  const role = byId('introTeam').value;
  const scenarios = [incidents[role], ...sharedIncidents].filter(item => item && item !== lastScenario);
  lastScenario = lastScenario ? scenarios[Math.floor(Math.random() * scenarios.length)] : scenarios[0];
  const [situation, correct] = lastScenario;
  prompt.textContent = situation;
  feedback.textContent = '';
  start.hidden = true;
  const deadline = performance.now() + 20000;
  function finish(answer) {
    clearInterval(timer);
    choices.replaceChildren();
    clock.textContent = '';
    const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    const score = answer === correct ? remaining : 0;
    feedback.textContent = !remaining ? 'Time’s up.' : score ? `Crisis handled. ${score} points.` : 'That made the situation worse.';
    start.textContent = 'Next plot twist';
    start.hidden = false;
    if (answer) start.focus();
    window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Corporate Plot Twist', score } }));
  }
  const options = [correct, 'Book a meeting for next week', 'Mark the thread as resolved'];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  choices.replaceChildren(...options.map(answer => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = answer;
    button.addEventListener('click', () => finish(answer));
    return button;
  }));
  choices.firstChild.focus();
  function tick() {
    const seconds = Math.ceil((deadline - performance.now()) / 1000);
    if (seconds <= 0) finish();
    else clock.textContent = `${seconds}s left`;
  }
  timer = setInterval(tick, 200);
  tick();
});

const daily = [
  ['Corporate Wordle', '#corporate-wordle'], ['Typing Race', '#typing-race'], ['Office Detective', '#office-detective'],
  ['Meeting Dodge', '#meeting-game'], ['Chai Run', '#chai-run'], ['Corporate Bingo', '#corporate-bingo'], ['Deadline Dash', '#deadline-dash']
];
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
const today = () => Math.floor(Date.parse(dayFormat.format(new Date()) + 'T00:00:00Z') / 86400000);
const challenge = day => daily[(day + 3) % daily.length];
let completed = [];
try {
  const saved = JSON.parse(localStorage.getItem('office-chai-days'));
  if (Array.isArray(saved)) completed = saved.filter(Number.isInteger);
} catch {}

function chaiStreak() {
  let day = today();
  if (!completed.includes(day)) day--;
  let streak = 0;
  while (completed.includes(day--)) streak++;
  return streak;
}
let earned = false;
try { earned = localStorage.getItem('office-chai-regular') === 'yes'; } catch {}
export function chaiRegular() { return earned; }

function showDaily() {
  const day = today();
  const [name, target] = challenge(day);
  byId('chaiChallenge').textContent = `Today’s challenge · ${name}`;
  byId('chaiPlay').href = target;
  const streak = chaiStreak();
  if (streak >= 3 && !earned) {
    earned = true;
    try { localStorage.setItem('office-chai-regular', 'yes'); } catch {}
  }
  byId('chaiStreakStatus').textContent = `${completed.includes(day) ? 'Completed today · ' : ''}${streak} day streak${earned ? ' · Chai Regular' : ''}`;
}
window.addEventListener('office-result', ({ detail: { game } }) => {
  const day = today();
  if (game !== challenge(day)[0] || completed.includes(day)) return;
  completed = [...completed.filter(date => date >= day - 365), day];
  try { localStorage.setItem('office-chai-days', JSON.stringify(completed)); } catch {}
  showDaily();
});
window.addEventListener('focus', showDaily);
showDaily();
