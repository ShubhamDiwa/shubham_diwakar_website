import { draftChat } from './chat-draft.js';

function mount(root, game, title, hash) {
  root.innerHTML = `
    <form class="actions">
      <button class="btn primary" type="button" data-create>Create room</button>
      <input name="code" aria-label="Room code" required maxlength="8" pattern="[A-Fa-f0-9]{8}" autocomplete="off" placeholder="Room code">
      <button class="btn">Join room</button>
    </form>
    <div data-room hidden>
      <p data-summary></p>
      <div class="actions">
        <button class="btn" data-share>Share in Break Room</button>
        <button class="btn" data-leave>Leave room</button>
      </div>
      <p data-instructions></p>
      <div class="actions" data-controls></div>
    </div>
    <p data-status role="status"></p>`;
  const get = selector => root.querySelector(selector);
  const form = get('form');
  const panel = get('[data-room]');
  const summary = get('[data-summary]');
  const instructions = get('[data-instructions]');
  const controls = get('[data-controls]');
  const status = get('[data-status]');
  const share = get('[data-share]');
  const token = crypto.randomUUID();
  const minimum = game === 'heist' ? 2 : 3;
  const inviteCode = new URLSearchParams(location.search).get(game);
  if (inviteCode && /^[a-f0-9]{8}$/i.test(inviteCode)) form.elements.code.value = inviteCode;
  let state;
  let pending = false;
  let timer;
  let revision = 0;
  let signature;
  let reported = false;

  function button(label, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'btn';
    control.textContent = label;
    control.addEventListener('click', action);
    return control;
  }

  function render() {
    form.hidden = true;
    panel.hidden = false;
    share.hidden = state.phase !== 'lobby';
    summary.textContent = `Room ${state.code} · ${state.names.join(', ')}`;
    if (state.phase === 'lobby') {
      instructions.textContent = state.names.length < minimum ? `Waiting for ${minimum - state.names.length} more player(s).` : 'Ready. The host can start.';
    } else if (game === 'heist') {
      if (state.phase === 'done') {
        instructions.textContent = state.escaped
          ? `${state.names.join(' & ')} escaped in ${(state.elapsed / 1000).toFixed(2)} seconds!`
          : `Time’s up. The safe exit was ${state.safe}.`;
      } else {
        instructions.textContent = `${Math.ceil(state.remaining / 1000)}s left · ${state.assignment}: ${state.blocked.join(', ')} blocked. ${state.pick ? 'Waiting for your partner.' : state.attempts ? 'The schedule changed. Compare the new clues.' : 'Compare clues with your partner in chat.'}`;
      }
    } else {
      instructions.textContent = state.phase === 'done' ? `Round complete · ${state.score} votes for your excuse.`
        : `${state.prompt} · ${state.count}/${state.names.length} ${state.phase === 'write' ? 'submitted' : 'voted'}`;
    }

    const key = JSON.stringify([state.phase, state.attempts, state.pick, state.submitted, state.voted, state.names.length]);
    if (signature === key) return;
    signature = key;
    controls.replaceChildren();
    if (state.phase === 'lobby' && state.host && state.names.length >= minimum) {
      controls.append(button('Start round', () => send('start')));
    } else if (state.phase === 'pick' && !state.pick) {
      for (const time of state.times) controls.append(button(time, () => send('pick', { choice: time, attempt: state.attempts })));
    } else if (state.phase === 'write' && !state.submitted) {
      const excuse = document.createElement('input');
      excuse.maxLength = 160;
      excuse.placeholder = 'Write your excuse';
      excuse.setAttribute('aria-label', 'Your excuse');
      const submit = () => {
        if (!excuse.value.trim()) { excuse.focus(); return; }
        send('write', { excuse: excuse.value });
      };
      excuse.addEventListener('keydown', event => { if (event.key === 'Enter') submit(); });
      controls.append(excuse, button('Submit excuse', submit));
    } else if (state.phase === 'vote' && !state.voted) {
      for (const excuse of state.excuses.filter(item => !item.yours)) {
        controls.append(button(excuse.text, () => send('vote', { choice: excuse.index })));
      }
    } else if (state.phase === 'done') {
      if (game === 'bluff') {
        const list = document.createElement('ul');
        for (const excuse of [...state.excuses].sort((a, b) => b.votes - a.votes)) {
          const row = document.createElement('li');
          row.textContent = `${excuse.author} · ${excuse.text} · ${excuse.votes} vote(s)`;
          list.append(row);
        }
        controls.append(list);
      }
      if (!reported) {
        reported = true;
        const detail = game === 'heist'
          ? { game: title, score: state.escaped ? 90001 - state.elapsed : 0, roomCode: state.code, proof: state.proof }
          : { game: title, score: state.score };
        if (game !== 'heist' || state.escaped) window.dispatchEvent(new CustomEvent('office-result', { detail }));
      }
    }
  }

  async function send(action, fields = {}) {
    if (pending) return;
    pending = true;
    clearTimeout(timer);
    const current = revision;
    try {
      const response = await fetch('/.netlify/functions/social-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game, action, token, code: state?.code,
          name: document.getElementById('introName').value,
          role: document.getElementById('introTeam').value, ...fields
        }),
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      if (current !== revision) return;
      if (!response.ok) {
        if (response.status === 404 && state) leave();
        throw new Error(data.error);
      }
      if (action === 'leave') {
        leave();
        return;
      }
      state = data;
      if (action !== 'poll' || status.dataset.connectionError) status.textContent = '';
      delete status.dataset.connectionError;
      render();
    } catch (error) {
      if (current === revision || !state) {
        status.textContent = error.message || 'Connection lost. Try again.';
        if (action === 'poll') status.dataset.connectionError = 'true';
      }
    } finally {
      pending = false;
      if (state && state.phase !== 'done') timer = setTimeout(() => send('poll'), 1000);
    }
  }

  function leave() {
    revision++;
    clearTimeout(timer);
    state = undefined;
    signature = undefined;
    reported = false;
    status.textContent = '';
    panel.hidden = true;
    form.hidden = false;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    send('join', { code: form.elements.code.value.trim().toUpperCase() });
  });
  get('[data-create]').addEventListener('click', () => send('create'));
  get('[data-leave]').addEventListener('click', () => {
    if (state.phase === 'lobby') send('leave');
    else leave();
  });
  share.addEventListener('click', () => {
    const url = new URL(location.pathname, location.origin);
    url.hash = hash;
    url.searchParams.set(game, state.code);
    draftChat(`Join my ${title}: ${url.href}`);
  });
}

mount(document.getElementById('heistRoom'), 'heist', 'Friday Half-Day Heist', 'half-day-heist');
mount(document.getElementById('bluffRoom'), 'bluff', 'Office Bluff', 'office-bluff');
