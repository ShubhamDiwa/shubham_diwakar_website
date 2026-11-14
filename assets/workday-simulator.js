const byId = id => document.getElementById(id);
const form = byId('customWorkdayForm');
const list = byId('customWorkdayEvents');
const status = byId('customWorkdayStatus');
const progress = byId('customWorkdayProgress');
const play = byId('startWorkdaySimulation');
const next = byId('nextWorkdayEvent');
const decision = byId('workdayDecision');
const choices = byId('workdayDecisionChoices');
const selector = byId('workdaySchedule');
const scheduleForm = byId('workdayScheduleForm');
const storageKey = 'office-workday-schedules';
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const validEvents = items => Array.isArray(items) ? items.filter(item =>
  typeof item?.time === 'string' && timePattern.test(item.time) &&
  typeof item.title === 'string' && Boolean(item.title.trim()) && item.title.length <= 80) : [];
let schedules = [{ name: 'My timeline', events: [] }];
let selected = 0;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Array.isArray(saved?.schedules) && saved.schedules.length) {
    schedules = saved.schedules.map(item => ({ name: item.name, events: validEvents(item.events) }));
    if (Number.isInteger(saved.selected) && schedules[saved.selected]) selected = saved.selected;
  } else {
    schedules[0].events = validEvents(JSON.parse(localStorage.getItem('office-custom-workday')));
  }
} catch {}
let events = schedules[selected].events;

let step = -1;
let playing = false;
let consequence = '';
let completedRecap = '';
const scenarios = {
  Developer: 'A teammate asks for a quick call about a one-line change.',
  Finance: 'A quick call lands in your inbox about a missing rupee.',
  'HR & Admin': 'A manager wants a quick call about tomorrow’s onboarding.'
};
const replies = [
  ['Join', 'The five-minute call booked its own follow-up.'],
  ['Ask for an agenda', 'It turned out the whole thing could be an email.'],
  ['After chai', 'You defended your chai break. The call moved to tomorrow.']
];

function selectView(custom) {
  byId('roleWorkday').hidden = custom;
  byId('customWorkday').hidden = !custom;
  byId('showRoleWorkday').setAttribute('aria-pressed', String(!custom));
  byId('showCustomWorkday').setAttribute('aria-pressed', String(custom));
}
byId('showRoleWorkday').onclick = () => selectView(false);
byId('showCustomWorkday').onclick = () => selectView(true);

function save() {
  status.textContent = events.length ? 'Schedule ready. Press Play shift to simulate it.' : 'Add an event to build your schedule.';
  try { localStorage.setItem(storageKey, JSON.stringify({ schedules, selected })); }
  catch { status.textContent += ' Browser storage is unavailable.'; }
}

function render() {
  progress.max = Math.max(1, events.length);
  progress.value = playing ? step + 1 : step === -1 ? 0 : events.length;
  play.disabled = playing || events.length === 0;
  next.hidden = !playing;
  next.disabled = !decision.hidden;
  next.textContent = step === events.length - 1 ? 'Finish shift' : 'Next event';
  for (const field of form.elements) field.disabled = playing;
  for (const field of scheduleForm.elements) field.disabled = playing;
  selector.disabled = playing;
  list.replaceChildren(...events.map((event, index) => {
    const row = document.createElement('li');
    row.className = 'workday-stop';
    row.toggleAttribute('data-past', index < step || (!playing && step >= 0));
    if (playing && step === index) row.setAttribute('aria-current', 'step');
    const time = document.createElement('time');
    time.className = 'time';
    time.dateTime = time.textContent = event.time;
    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = event.title;
    body.append(title);
    if (!playing) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', 'Remove ' + event.title);
      remove.addEventListener('click', () => {
        events.splice(index, 1);
        step = -1;
        play.textContent = 'Play shift';
        save();
        render();
        form.elements.title.focus();
      });
      body.append(document.createElement('br'), remove);
    }
    row.append(time, body);
    return row;
  }));
}

function chooseSchedule(index) {
  selected = index;
  events = schedules[selected].events;
  selector.replaceChildren(...schedules.map(({ name }, value) => new Option(name, value)));
  selector.value = String(selected);
  step = -1;
  play.textContent = 'Play shift';
  save();
  render();
}
selector.onchange = () => chooseSchedule(Number(selector.value));
scheduleForm.onsubmit = event => {
  event.preventDefault();
  const input = scheduleForm.elements.name;
  const name = input.value.trim();
  if (!name || playing) return;
  schedules.push({ name, events: [] });
  input.value = '';
  chooseSchedule(schedules.length - 1);
  form.elements.time.focus();
};

form.addEventListener('submit', event => {
  event.preventDefault();
  const time = form.elements.time.value;
  const title = form.elements.title.value.trim();
  if (playing || !timePattern.test(time) || !title) return;
  events.push({ time, title });
  events.sort((first, second) => first.time.localeCompare(second.time));
  form.elements.title.value = '';
  step = -1;
  play.textContent = 'Play shift';
  save();
  render();
  form.elements.title.focus();
});

function showStep() {
  const { time, title } = events[step];
  status.textContent = time + ' · ' + title;
  if (step === Math.floor(events.length / 2)) {
    const role = byId('introTeam').value;
    byId('workdayDecisionPrompt').textContent = scenarios[role] ?? 'Someone asks for a quick call just as you’re about to take a break.';
    decision.hidden = false;
    choices.replaceChildren(...replies.map(([label, result]) => {
      const button = document.createElement('button');
      button.className = 'btn';
      button.type = 'button';
      button.textContent = label;
      button.onclick = () => {
        consequence = result;
        decision.hidden = true;
        status.textContent = result;
        next.disabled = false;
        next.focus();
      };
      return button;
    }));
  }
  render();
  if (decision.hidden) next.focus();
  else choices.firstElementChild.focus();
}

play.onclick = () => {
  if (playing || !events.length) return;
  playing = true;
  step = 0;
  consequence = '';
  showStep();
};
next.onclick = () => {
  if (!playing || !decision.hidden) return;
  if (++step < events.length) {
    showStep();
    return;
  }
  playing = false;
  completedRecap = `${schedules[selected].name} complete · ${events.length} ${events.length === 1 ? 'event' : 'events'}. ${consequence}`;
  status.textContent = completedRecap;
  play.textContent = 'Replay shift';
  render();
  play.focus();
};
byId('punchOut').addEventListener('click', () => {
  byId('simulationRecap').textContent = completedRecap;
});
chooseSchedule(selected);
