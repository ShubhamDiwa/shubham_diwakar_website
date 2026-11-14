const board = document.getElementById('snakeBoard');
const ctx = board.getContext('2d');
const start = document.getElementById('snakeStart');
const status = document.getElementById('snakeStatus');
const scoreDisplay = document.getElementById('snakeScore');
const controls = document.getElementById('snakeControls');
const size = 20;
const cell = board.width / size;
const directions = { left: [-1, 0], up: [0, -1], down: [0, 1], right: [1, 0] };
const keys = new Map([
  ['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['ArrowDown', 'down'], ['ArrowRight', 'right'],
  ['a', 'left'], ['w', 'up'], ['s', 'down'], ['d', 'right']
]);
let snake;
let food;
let direction;
let nextDirection;
let score;
let timer;

function placeFood() {
  const occupied = new Set(snake.map(([x, y]) => y * size + x));
  const free = Array.from({ length: size * size }, (_, i) => i).filter(i => !occupied.has(i));
  if (!free.length) return null;
  const position = free[Math.floor(Math.random() * free.length)];
  return [position % size, Math.floor(position / size)];
}

function draw() {
  ctx.clearRect(0, 0, board.width, board.height);
  snake.forEach(([x, y], index) => {
    ctx.fillStyle = index === 0 ? '#243016' : '#405220';
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  });
  if (food) {
    const [x, y] = food;
    ctx.fillStyle = '#293619';
    ctx.fillRect(x * cell + 4, y * cell + 4, cell - 8, cell - 8);
  }
  scoreDisplay.textContent = 'Score ' + score;
}

function reset() {
  snake = [[10, 10], [9, 10], [8, 10]];
  direction = directions.right;
  nextDirection = null;
  score = 0;
  food = placeFood();
  draw();
}

function finish(message) {
  timer = undefined;
  status.textContent = message + ' Final score ' + score + '.';
  start.disabled = false;
  start.textContent = 'Play again';
  window.dispatchEvent(new CustomEvent('office-result', { detail: { game: 'Snake Xenzia', score } }));
}

function tick() {
  direction = nextDirection ?? direction;
  nextDirection = null;
  const x = snake[0][0] + direction[0];
  const y = snake[0][1] + direction[1];
  const eating = x === food[0] && y === food[1];
  const body = eating ? snake : snake.slice(0, -1);
  if (x < 0 || y < 0 || x >= size || y >= size || body.some(([sx, sy]) => sx === x && sy === y)) {
    finish('Game over.');
    return;
  }
  snake.unshift([x, y]);
  if (eating) {
    score++;
    food = placeFood();
  } else {
    snake.pop();
  }
  draw();
  if (!food) finish('Board cleared!');
  else timer = setTimeout(tick, Math.max(65, 175 - score * 5));
}

function turn(name) {
  const next = directions[name];
  if (!timer || nextDirection || next === direction ||
      (direction[0] === -next[0] && direction[1] === -next[1])) return;
  nextDirection = next;
}

start.addEventListener('click', () => {
  reset();
  start.disabled = true;
  status.textContent = 'Playing.';
  board.focus({ preventScroll: true });
  timer = setTimeout(tick, 175);
});
controls.querySelectorAll('[data-snake]').forEach(button => {
  button.addEventListener('click', () => turn(button.dataset.snake));
});
document.getElementById('snake-xenzia').addEventListener('keydown', event => {
  const name = keys.get(event.key) ?? keys.get(event.key.toLowerCase());
  if (!name || !timer || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  turn(name);
});
reset();
