const endpoint = '/.netlify/functions/break-room';
const room = document.getElementById('breakRoom');
const joinForm = document.getElementById('breakRoomJoin');
const sendForm = document.getElementById('breakRoomSend');
const session = document.getElementById('breakRoomSession');
const log = document.getElementById('breakRoomLog');
const status = document.getElementById('breakRoomStatus');
const count = document.getElementById('breakRoomCount');
let token;
try {
  token = sessionStorage.getItem('corporate-break-room') || crypto.randomUUID();
  sessionStorage.setItem('corporate-break-room', token);
} catch {
  token = crypto.randomUUID();
}
let nickname = '';
let key = '';
let timer;
let revision = 0;
let displayedMessages = '';
let pendingMessage;

async function request(action, fields = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token, nickname, key, ...fields }),
    signal: AbortSignal.timeout(8000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

function render({ messages, online, moderator }) {
  count.textContent = `· ${online} online`;
  const signature = JSON.stringify([messages, moderator]);
  if (signature === displayedMessages) return;
  displayedMessages = signature;
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 32;
  log.replaceChildren(...messages.map(message => {
    const row = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = message.nickname;
    row.append(name, ' · ');
    const invite = message.text.match(/^Join my (Corporate Bingo board|Tic-Tac-Toe game|Typing Race|Friday Half-Day Heist|Office Bluff): (\S+)$/);
    const inviteUrl = invite ? URL.parse(invite[2]) : null;
    const destinations = { 'Corporate Bingo board': '#corporate-bingo', 'Tic-Tac-Toe game': '#onlineTic', 'Typing Race': '#typing-race',
      'Friday Half-Day Heist': '#half-day-heist', 'Office Bluff': '#office-bluff' };
    const destination = destinations[invite?.[1]];
    if (inviteUrl?.origin === location.origin && inviteUrl.pathname === location.pathname && inviteUrl.hash === destination) {
      const link = document.createElement('a');
      link.href = inviteUrl.href;
      link.textContent = invite[1] === 'Tic-Tac-Toe game' ? 'Join game ↗' : `Join ${invite[1]} ↗`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row.append(link);
    } else {
      row.append(message.text);
    }
    if (moderator) {
      for (const action of ['delete', 'mute']) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn';
        button.textContent = action === 'delete' ? 'Delete' : 'Mute 1h';
        button.addEventListener('click', () => update(action, { target: message.id }));
        row.append(button);
      }
    }
    return row;
  }));
  if (atBottom) log.scrollTop = log.scrollHeight;
}

async function update(action = 'poll', fields) {
  clearTimeout(timer);
  const requestRevision = ++revision;
  try {
    const data = await request(action, fields);
    if (requestRevision === revision && nickname) {
      render(data);
      status.textContent = action === 'poll' && key && !data.moderator ? 'Moderator key was rejected.' : '';
    }
    return true;
  } catch (error) {
    if (requestRevision === revision) status.textContent = error.message || 'Could not connect.';
    return false;
  } finally {
    if (requestRevision === revision && nickname) timer = setTimeout(update, room.open && !document.hidden ? 4000 : 15000);
  }
}

joinForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (nickname) return;
  nickname = joinForm.elements.nickname.value.trim();
  if (!nickname) return;
  if (await update()) {
    joinForm.hidden = true;
    session.hidden = false;
    sendForm.elements.message.focus();
  } else {
    nickname = '';
    clearTimeout(timer);
  }
});

sendForm.addEventListener('submit', async event => {
  event.preventDefault();
  const input = sendForm.elements.message;
  const button = sendForm.querySelector('button');
  const text = input.value.trim();
  if (!nickname || !text || button.disabled) return;
  if (pendingMessage?.text !== text) pendingMessage = { text, messageId: crypto.randomUUID() };
  button.disabled = true;
  if (await update('send', pendingMessage)) {
    if (input.value.trim() === text) input.value = '';
    pendingMessage = undefined;
  }
  button.disabled = false;
});

document.getElementById('breakRoomModerate').addEventListener('click', () => {
  const entered = prompt('Moderator key');
  if (entered === null) return;
  key = entered;
  update();
});

function leave() {
  if (!nickname) return;
  navigator.sendBeacon(endpoint, new Blob([JSON.stringify({ action: 'leave', token, nickname })], {
    type: 'application/json'
  }));
  nickname = '';
  key = '';
  pendingMessage = undefined;
  revision++;
  clearTimeout(timer);
  count.textContent = '';
  status.textContent = '';
  displayedMessages = '';
  log.replaceChildren();
  sendForm.reset();
  session.hidden = true;
  joinForm.hidden = false;
}

document.getElementById('breakRoomLeave').addEventListener('click', leave);
window.addEventListener('pagehide', leave);
