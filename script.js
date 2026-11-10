// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const restartBtn = document.getElementById('restart-btn');
const muteBtn = document.getElementById('mute-btn');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 250;
const GROUND_Y = 210;

// Web Audio API Sound Synthesizer (Zero external file dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playScoreMilestone() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [660, 880].forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const time = now + index * 0.08;

      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + 0.08);
    });
  }
}

const sfx = new SoundFX();

// Game State
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
let score = 0;
let highScore = localStorage.getItem('dino_highscore') || 0;
highScoreEl.innerText = String(highScore).padStart(5, '0');

let gameSpeed = 6;
let frameCount = 0;
let nextSpawnTimer = 0;

// Dino Player Class
class Dino {
  constructor() {
    this.reset();
  }

  reset() {
    this.width = 44;
    this.height = 47;
    this.x = 50;
    this.y = GROUND_Y - this.height;
    this.vy = 0;
    this.gravity = 0.65;
    this.jumpForce = -12;
    this.isJumping = false;
    this.isDucking = false;
    this.legState = 0;
  }

  jump() {
    if (!this.isJumping && !this.isDucking) {
      this.vy = this.jumpForce;
      this.isJumping = true;
      sfx.playJump();
    }
  }

  duck(isPressed) {
    if (this.isJumping) return;
    this.isDucking = isPressed;
    if (this.isDucking) {
      this.width = 55;
      this.height = 30;
      this.y = GROUND_Y - this.height;
    } else {
      this.width = 44;
      this.height = 47;
      this.y = GROUND_Y - this.height;
    }
  }

  update() {
    if (this.isJumping) {
      this.vy += this.gravity;
      this.y += this.vy;

      if (this.y >= GROUND_Y - this.height) {
        this.y = GROUND_Y - this.height;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    if (frameCount % 6 === 0) {
      this.legState = 1 - this.legState;
    }
  }

  draw() {
    ctx.fillStyle = '#535353';

    if (this.isDucking) {
      // Ducking Dino
      ctx.fillRect(this.x, this.y + 10, 42, 20); // body
      ctx.fillRect(this.x + 36, this.y + 14, 18, 12); // head lowered
      ctx.fillRect(this.x + 48, this.y + 16, 2, 2); // eye
      // Legs
      if (this.legState === 0) {
        ctx.fillRect(this.x + 12, this.y + 26, 6, 4);
      } else {
        ctx.fillRect(this.x + 28, this.y + 26, 6, 4);
      }
    } else {
      // Standing / Running Dino
      // Body
      ctx.fillRect(this.x + 12, this.y + 14, 22, 22);
      // Head
      ctx.fillRect(this.x + 22, this.y, 22, 18);
      // Eye
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(this.x + 36, this.y + 4, 3, 3);
      ctx.fillStyle = '#535353';
      // Snout / mouth cut
      ctx.fillRect(this.x + 32, this.y + 12, 12, 2);
      // Arm
      ctx.fillRect(this.x + 30, this.y + 22, 6, 4);
      // Tail
      ctx.fillRect(this.x + 2, this.y + 18, 10, 10);
      ctx.fillRect(this.x, this.y + 22, 4, 8);

      // Legs
      if (this.isJumping) {
        ctx.fillRect(this.x + 14, this.y + 36, 4, 9);
        ctx.fillRect(this.x + 24, this.y + 36, 4, 9);
      } else {
        if (this.legState === 0) {
          ctx.fillRect(this.x + 14, this.y + 36, 4, 11);
          ctx.fillRect(this.x + 14, this.y + 45, 8, 2);
          ctx.fillRect(this.x + 24, this.y + 36, 4, 6);
        } else {
          ctx.fillRect(this.x + 14, this.y + 36, 4, 6);
          ctx.fillRect(this.x + 24, this.y + 36, 4, 11);
          ctx.fillRect(this.x + 24, this.y + 45, 8, 2);
        }
      }
    }
  }

  getBounds() {
    // Generous hitbox with small margin
    const margin = 4;
    return {
      x: this.x + margin,
      y: this.y + margin,
      width: this.width - margin * 2,
      height: this.height - margin * 2
    };
  }
}

// Cactus Obstacle
class Cactus {
  constructor(speed) {
    this.type = Math.random() < 0.6 ? 'single' : (Math.random() < 0.5 ? 'double' : 'tall');
    if (this.type === 'single') {
      this.width = 16;
      this.height = 36;
    } else if (this.type === 'double') {
      this.width = 30;
      this.height = 36;
    } else {
      this.width = 24;
      this.height = 46;
    }
    this.x = CANVAS_WIDTH + 10;
    this.y = GROUND_Y - this.height;
    this.speed = speed;
    this.markedForDeletion = false;
  }

  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
    }
  }

  draw() {
    ctx.fillStyle = '#535353';
    // Main stem
    ctx.fillRect(this.x + this.width / 4, this.y, this.width / 2, this.height);
    // Arms / needles details
    ctx.fillRect(this.x, this.y + this.height * 0.3, this.width, 6);
    ctx.fillRect(this.x, this.y + this.height * 0.2, 4, 12);
    ctx.fillRect(this.x + this.width - 4, this.y + this.height * 0.2, 4, 12);
  }

  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 2
    };
  }
}

// Pterodactyl (Bird) Obstacle
class Bird {
  constructor(speed) {
    this.width = 40;
    this.height = 30;
    this.x = CANVAS_WIDTH + 10;
    // Heights: flying high (jumpable or duckable) or flying low
    const heights = [GROUND_Y - 35, GROUND_Y - 60];
    this.y = heights[Math.floor(Math.random() * heights.length)];
    this.speed = speed + 1;
    this.markedForDeletion = false;
    this.wingState = 0;
  }

  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
    }
    if (frameCount % 8 === 0) {
      this.wingState = 1 - this.wingState;
    }
  }

  draw() {
    ctx.fillStyle = '#535353';
    // Body & Beak
    ctx.fillRect(this.x + 10, this.y + 10, 20, 8);
    ctx.fillRect(this.x, this.y + 12, 10, 4);

    // Wings flapping
    if (this.wingState === 0) {
      ctx.fillRect(this.x + 14, this.y, 8, 10);
    } else {
      ctx.fillRect(this.x + 14, this.y + 18, 8, 10);
    }
  }

  getBounds() {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 8
    };
  }
}

// Ground & Clouds
class Scenery {
  constructor() {
    this.groundOffset = 0;
    this.clouds = [
      { x: 200, y: 50, speed: 0.8 },
      { x: 500, y: 70, speed: 0.6 },
      { x: 750, y: 40, speed: 0.7 }
    ];
  }

  update(speed) {
    this.groundOffset = (this.groundOffset + speed) % 24;

    this.clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x < -60) {
        cloud.x = CANVAS_WIDTH + Math.random() * 50;
        cloud.y = 30 + Math.random() * 60;
      }
    });
  }

  draw() {
    // Draw Clouds
    ctx.fillStyle = '#c7c7c7';
    this.clouds.forEach(cloud => {
      ctx.fillRect(cloud.x, cloud.y + 6, 36, 10);
      ctx.fillRect(cloud.x + 8, cloud.y, 20, 16);
    });

    // Draw Ground Line
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);

    // Ground bumps / texture
    for (let x = -this.groundOffset; x < CANVAS_WIDTH; x += 24) {
      if ((x % 48) === 0) {
        ctx.fillRect(x, GROUND_Y + 4, 12, 1);
        ctx.fillRect(x + 4, GROUND_Y + 7, 6, 1);
      } else {
        ctx.fillRect(x + 6, GROUND_Y + 5, 2, 2);
      }
    }
  }
}

// Instantiate
const dino = new Dino();
const scenery = new Scenery();
let obstacles = [];

function checkCollision(r1, r2) {
  return !(
    r1.x > r2.x + r2.width ||
    r1.x + r1.width < r2.x ||
    r1.y > r2.y + r2.height ||
    r1.y + r1.height < r2.y
  );
}

function spawnObstacle() {
  if (obstacles.length > 0) {
    const last = obstacles[obstacles.length - 1];
    if (CANVAS_WIDTH - last.x < 220) return;
  }

  // Birds start appearing after score reaches 200
  if (score > 200 && Math.random() < 0.35) {
    obstacles.push(new Bird(gameSpeed));
  } else {
    obstacles.push(new Cactus(gameSpeed));
  }
}

function startGame() {
  sfx.init();
  gameState = 'PLAYING';
  score = 0;
  gameSpeed = 6;
  frameCount = 0;
  nextSpawnTimer = 60;
  obstacles = [];
  dino.reset();
  restartBtn.style.display = 'none';
}

function gameOver() {
  gameState = 'GAMEOVER';
  sfx.playHit();

  if (score > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('dino_highscore', highScore);
    highScoreEl.innerText = String(highScore).padStart(5, '0');
  }

  restartBtn.style.display = 'inline-block';
}

function update() {
  if (gameState !== 'PLAYING') return;

  frameCount++;
  score += 0.15;
  const currentIntScore = Math.floor(score);
  scoreEl.innerText = String(currentIntScore).padStart(5, '0');

  // Milestone beep every 100 points
  if (currentIntScore > 0 && currentIntScore % 100 === 0 && Math.floor(score - 0.15) !== currentIntScore) {
    sfx.playScoreMilestone();
  }

  // Gradually increase speed
  gameSpeed = 6 + Math.min(8, Math.floor(score / 150) * 0.8);

  scenery.update(gameSpeed);
  dino.update();

  // Handle Obstacles
  nextSpawnTimer--;
  if (nextSpawnTimer <= 0) {
    spawnObstacle();
    nextSpawnTimer = Math.floor(65 + Math.random() * 55 - Math.min(25, gameSpeed * 1.5));
  }

  const dinoBox = dino.getBounds();
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.speed = gameSpeed;
    obs.update();

    if (checkCollision(dinoBox, obs.getBounds())) {
      gameOver();
      break;
    }

    if (obs.markedForDeletion) {
      obstacles.splice(i, 1);
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  scenery.draw();
  dino.draw();

  obstacles.forEach(obs => obs.draw());

  if (gameState === 'START') {
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE OR CLICK TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('DODGE CACTI & BIRDS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
  } else if (gameState === 'GAMEOVER') {
    ctx.fillStyle = '#535353';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G A M E  O V E R', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('PRESS SPACE OR CLICK RESTART', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Input Handling
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (gameState === 'START' || gameState === 'GAMEOVER') {
      startGame();
    } else {
      dino.jump();
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    if (gameState === 'PLAYING') {
      dino.duck(true);
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowDown') {
    dino.duck(false);
  }
});

// Canvas click / touch support
canvas.addEventListener('pointerdown', (e) => {
  if (gameState === 'START' || gameState === 'GAMEOVER') {
    startGame();
  } else {
    dino.jump();
  }
});

restartBtn.addEventListener('click', startGame);

muteBtn.addEventListener('click', () => {
  const isMuted = sfx.toggleMute();
  muteBtn.innerText = isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
});

// Start rendering loop
requestAnimationFrame(loop);

