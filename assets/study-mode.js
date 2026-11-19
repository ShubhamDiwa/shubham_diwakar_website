const root = document.getElementById('study-mode');
root.innerHTML = `
 <div class="sectionhead"><div><div class="eyebrow">A little space to grow</div><h2>STUDY MODE</h2></div></div>
 <div class="study-space">
  <div class="study-garden">
   <span id="studyStreak"></span>
   <div class="study-tree" aria-hidden="true"><div class="study-canopy"></div><div class="study-trunk"></div><div class="study-ground"></div></div>
   <h3 id="studyClock">30:00</h3>
   <p id="studyStatus" role="status">Plant a seed. Give yourself 30 quiet minutes.</p>
   <div class="actions"><button class="btn primary" id="studyStart">Start focus</button><button class="btn" id="studyStop" disabled>End session</button></div>
   <p class="study-help">Keep this tab visible for 30 uninterrupted minutes to grow a tree. Switching tabs or ending early resets the session. Your tasks stay saved.</p>
   <a class="btn" href="#radio">Choose calm music in Radio ↗</a>
  </div>
  <div class="study-plan">
   <h3>What are we learning?</h3>
   <form id="studyTaskForm"><label>Study task<input name="task" maxlength="160" required placeholder="Revise chapter 3, practise SQL…"></label><button class="btn">Add task</button></form>
   <ul id="studyTasks"></ul>
   <p id="studyStorage" role="status">Your plan and progress are saved in this browser.</p>
   <p id="studyTrees"></p>
  </div>
 </div>`;
const get = id => document.getElementById(id);
const storageKey = 'corporate-study-mode';
const dateFormat = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit'});
const day = () => Math.floor(Date.parse(dateFormat.format(new Date()) + 'T00:00:00Z') / 86400000);
let state = {tasks:[],days:[],trees:0};
try {
 const saved = JSON.parse(localStorage.getItem(storageKey));
 if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.days)) {
  state = {
   tasks:saved.tasks.filter(t => typeof t?.text === 'string' && t.text.length <= 160).map(t=>({id:crypto.randomUUID(),text:t.text,done:Boolean(t.done)})),
   days:[...new Set(saved.days.filter(Number.isInteger))],
   trees:Number.isSafeInteger(saved.trees) && saved.trees >= 0 ? saved.trees : 0
  };
 }
} catch {}
let timer;
let deadline;
let sessionDay;
const duration = 30 * 60 * 1000;
function save() {
 try {localStorage.setItem(storageKey,JSON.stringify(state));}
 catch {get('studyStorage').textContent='Browser storage is unavailable. Keep this tab open to retain your plan.';}
}
function render() {
 let date=day();
 if(!state.days.includes(date))date--;
 let streak=0;
 while(state.days.includes(date--))streak++;
 get('studyStreak').textContent=streak + ' day study streak';
 get('studyTrees').textContent=state.trees + ' trees grown · Complete one focus session per day to build your streak.';
 get('studyTasks').replaceChildren(...state.tasks.map(task=>{
  const row=document.createElement('li');
  const label=document.createElement('label');
  const checkbox=document.createElement('input');
  checkbox.type='checkbox';
  checkbox.checked=task.done;
  checkbox.onchange=()=>{task.done=checkbox.checked;save();};
  label.append(checkbox,' '+task.text);
  const remove=document.createElement('button');
  remove.className='btn';
  remove.textContent='Remove';
  remove.setAttribute('aria-label','Remove '+task.text);
  remove.onclick=()=>{state.tasks=state.tasks.filter(t=>t!==task);save();render();};
  row.append(label,remove);
  return row;
 }));
}
function end(message) {
 clearInterval(timer);
 timer=undefined;
 get('studyStart').disabled=false;
 get('studyStop').disabled=true;
 get('studyStatus').textContent=message;
}
function tick() {
 const remaining=Math.max(0,deadline-Date.now());
 const seconds=Math.ceil(remaining/1000);
 get('studyClock').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 root.style.setProperty('--tree-growth',String(.15 + .85*(1-remaining/duration)));
 if(!remaining){
  state.trees++;
  if(!state.days.includes(sessionDay))state.days.push(sessionDay);
  save();
  render();
  end('A tree grown, a little more learned. Your session is complete.');
 }
}
get('studyStart').onclick=()=>{
 if(timer)return;
 deadline=Date.now()+duration;
 sessionDay=day();
 get('studyStart').disabled=true;
 get('studyStop').disabled=false;
 get('studyStatus').textContent='Focus time. One small step at a time.';
 tick();
 timer=setInterval(tick,250);
};
function interrupt() {
 if(!timer)return;
 end('Session interrupted. Your next tree starts with a fresh 30 minutes.');
 get('studyClock').textContent='30:00';
 root.style.setProperty('--tree-growth','.15');
}
get('studyStop').onclick=interrupt;
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
window.addEventListener('pagehide',interrupt);
get('studyTaskForm').onsubmit=event=>{
 event.preventDefault();
 const input=event.currentTarget.elements.task;
 const text=input.value.trim();
 if(!text)return;
 state.tasks.push({id:crypto.randomUUID(),text,done:false});
 input.value='';
 save();
 render();
};
render();
