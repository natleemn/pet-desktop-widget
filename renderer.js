// ─── Pet Desktop Widget — Behavior Engine ────────────────────────────────────
// Manages sprite loading, state machine, movement, and animation for
// two pets (Pet 1 and Pet 2).

const POSES = ['idle', 'running', 'eating', 'grooming', 'popcorning', 'sleeping'];
const SPRITE_BASE = 'sprites';

// ─── CONFIG — Change these to match your pets! ──────────────────────────────
const PET_1_NAME = 'pet1';   // folder name: sprites/pet1-idle.png, etc.
const PET_2_NAME = 'pet2';   // folder name: sprites/pet2-idle.png, etc.
const PET_2_SCALE = 0.9;     // Pet 2 is 90% the size of Pet 1 (set to 1.0 for same size)

// ─── Sprite preloader ───────────────────────────────────────────────────────
const sprites = {};
sprites[PET_1_NAME] = {};
sprites[PET_2_NAME] = {};
let loadedCount = 0;
const totalSprites = 12;

function preloadSprites(callback) {
  [PET_1_NAME, PET_2_NAME].forEach(name => {
    POSES.forEach(pose => {
      const img = new Image();
      img.onload = () => {
        sprites[name][pose] = img;
        loadedCount++;
        if (loadedCount === totalSprites) callback();
      };
      img.onerror = () => {
        console.warn(`Failed to load: ${name}-${pose}.png`);
        loadedCount++;
        if (loadedCount === totalSprites) callback();
      };
      img.src = `${SPRITE_BASE}/${name}-${pose}.png`;
    });
  });
}

// ─── Behavior timing config (in milliseconds) ──────────────────────────────
const BEHAVIOR = {
  idle: { minDuration: 8000, maxDuration: 20000 },
  running: { interval: 600000, variance: 120000, duration: 4000 },    // ~10 min
  eating: { interval: 600000, variance: 120000, duration: 8000 },     // ~10 min
  grooming: { interval: 480000, variance: 120000, duration: 6000 },   // ~8 min
  popcorning: { interval: 900000, variance: 300000, duration: 2000 }, // ~15 min, rare
  sleeping: { idleThreshold: 120000, duration: 30000, variance: 15000 }, // after 2 min idle
};

// ─── Animation config ───────────────────────────────────────────────────────
const ANIM = {
  idleBobAmount: 2,        // pixels of gentle bobbing
  idleBobSpeed: 0.002,     // bob frequency
  runSpeed: 2.5,           // pixels per frame
  popcornHeight: 40,       // jump height in pixels
  popcornSpeed: 0.15,      // bounce speed
  breatheAmount: 1.5,      // sleeping rise/fall
  breatheSpeed: 0.001,
};

// ─── Pet class ──────────────────────────────────────────────────────────────
class Pet {
  constructor(name, baseSize, startX, startY) {
    this.name = name;
    this.baseSize = baseSize;
    this.el = document.getElementById(name);
    this.imgEl = document.getElementById(`${name}-img`);
    this.x = startX;
    this.y = startY;
    this.baseY = startY;
    this.state = 'idle';
    this.stateStart = Date.now();
    this.stateDuration = this._randomBetween(BEHAVIOR.idle.minDuration, BEHAVIOR.idle.maxDuration);
    this.idleSince = Date.now();
    this.facingRight = true;
    this.runTarget = 0;
    this.animFrame = 0;

    // Schedule next behaviors
    this.nextRun = Date.now() + this._randomBetween(30000, BEHAVIOR.running.interval);
    this.nextEat = Date.now() + this._randomBetween(45000, BEHAVIOR.eating.interval);
    this.nextGroom = Date.now() + this._randomBetween(60000, BEHAVIOR.grooming.interval);
    this.nextPopcorn = Date.now() + this._randomBetween(60000, BEHAVIOR.popcorning.interval);

    this._applySprite('idle');
    this._updatePosition();
  }

  _randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  _applySprite(pose) {
    const sprite = sprites[this.name][pose];
    if (sprite) {
      this.imgEl.src = sprite.src;
      const aspect = sprite.naturalWidth / sprite.naturalHeight;
      if (aspect > 1) {
        this.el.style.width = `${this.baseSize}px`;
        this.el.style.height = `${this.baseSize / aspect}px`;
      } else {
        this.el.style.height = `${this.baseSize}px`;
        this.el.style.width = `${this.baseSize * aspect}px`;
      }
    }
  }

  _updatePosition() {
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    this.el.style.transform = this.facingRight ? 'scaleX(1)' : 'scaleX(-1)';
  }

  _switchState(newState) {
    this.state = newState;
    this.stateStart = Date.now();
    this.animFrame = 0;
    this._applySprite(newState);

    if (newState === 'idle') {
      this.stateDuration = this._randomBetween(BEHAVIOR.idle.minDuration, BEHAVIOR.idle.maxDuration);
      this.y = this.baseY;
    } else if (newState === 'running') {
      this.stateDuration = BEHAVIOR.running.duration;
      const maxX = window.innerWidth - this.baseSize;
      this.runTarget = Math.random() * maxX;
      this.facingRight = this.runTarget > this.x;
    } else if (newState === 'eating') {
      this.stateDuration = BEHAVIOR.eating.duration;
    } else if (newState === 'grooming') {
      this.stateDuration = BEHAVIOR.grooming.duration;
    } else if (newState === 'popcorning') {
      this.stateDuration = BEHAVIOR.popcorning.duration;
    } else if (newState === 'sleeping') {
      this.stateDuration = BEHAVIOR.sleeping.duration + this._randomBetween(0, BEHAVIOR.sleeping.variance);
    }
  }

  update(now) {
    const elapsed = now - this.stateStart;

    switch (this.state) {
      case 'idle': {
        const bob = Math.sin(now * ANIM.idleBobSpeed) * ANIM.idleBobAmount;
        this.y = this.baseY + bob;

        const idleTime = now - this.idleSince;
        if (idleTime > BEHAVIOR.sleeping.idleThreshold && Math.random() < 0.001) {
          this._switchState('sleeping');
          break;
        }

        if (now > this.nextRun) {
          this.nextRun = now + this._randomBetween(BEHAVIOR.running.interval - BEHAVIOR.running.variance, BEHAVIOR.running.interval + BEHAVIOR.running.variance);
          this._switchState('running');
          break;
        }
        if (now > this.nextEat) {
          this.nextEat = now + this._randomBetween(BEHAVIOR.eating.interval - BEHAVIOR.eating.variance, BEHAVIOR.eating.interval + BEHAVIOR.eating.variance);
          this._switchState('eating');
          break;
        }
        if (now > this.nextGroom) {
          this.nextGroom = now + this._randomBetween(BEHAVIOR.grooming.interval - BEHAVIOR.grooming.variance, BEHAVIOR.grooming.interval + BEHAVIOR.grooming.variance);
          this._switchState('grooming');
          break;
        }
        if (now > this.nextPopcorn) {
          this.nextPopcorn = now + this._randomBetween(BEHAVIOR.popcorning.interval - BEHAVIOR.popcorning.variance, BEHAVIOR.popcorning.interval + BEHAVIOR.popcorning.variance);
          this._switchState('popcorning');
          break;
        }

        if (elapsed > this.stateDuration) {
          this.stateDuration = this._randomBetween(BEHAVIOR.idle.minDuration, BEHAVIOR.idle.maxDuration);
          this.stateStart = now;
        }
        break;
      }

      case 'running': {
        const dx = this.runTarget - this.x;
        const speed = ANIM.runSpeed * (window.innerWidth / 400);
        if (Math.abs(dx) > speed) {
          this.x += Math.sign(dx) * speed;
          const bounce = Math.abs(Math.sin(this.animFrame * 0.15)) * 8;
          this.y = this.baseY - bounce;
          this.animFrame++;
        } else {
          this.x = this.runTarget;
          this.y = this.baseY;
          this.idleSince = now;
          this._switchState('idle');
        }
        break;
      }

      case 'eating': {
        const bob = Math.sin(elapsed * 0.008) * 3;
        this.y = this.baseY + bob;
        if (elapsed > this.stateDuration) {
          this.idleSince = now;
          this._switchState('idle');
        }
        break;
      }

      case 'grooming': {
        const sway = Math.sin(elapsed * 0.005) * 2;
        this.y = this.baseY + sway;
        if (elapsed > this.stateDuration) {
          this.idleSince = now;
          this._switchState('idle');
        }
        break;
      }

      case 'popcorning': {
        const t = elapsed / this.stateDuration;
        const jumpCount = 3;
        const bounce = Math.abs(Math.sin(t * Math.PI * jumpCount)) * ANIM.popcornHeight;
        this.y = this.baseY - bounce;

        this.x += (Math.random() - 0.5) * 2;
        this.x = Math.max(0, Math.min(window.innerWidth - this.baseSize, this.x));

        if (elapsed > this.stateDuration) {
          this.y = this.baseY;
          this.idleSince = now;
          this._switchState('idle');
        }
        break;
      }

      case 'sleeping': {
        const breathe = Math.sin(now * ANIM.breatheSpeed) * ANIM.breatheAmount;
        this.y = this.baseY + breathe;
        if (elapsed > this.stateDuration) {
          this.idleSince = now;
          this._switchState('idle');
        }
        break;
      }
    }

    this._updatePosition();
  }
}

// ─── Main loop ──────────────────────────────────────────────────────────────
let pet1, pet2;

function init() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  const pet1Size = Math.min(winW * 0.35, winH * 0.6, 150);
  const pet2Size = pet1Size * PET_2_SCALE;

  const padding = 15;
  const groundY = winH - pet1Size - padding;

  const totalWidth = pet1Size + pet2Size + 20;
  const startX = (winW - totalWidth) / 2;

  pet1 = new Pet(PET_1_NAME, pet1Size, startX, groundY);
  pet1.baseY = groundY;

  pet2 = new Pet(PET_2_NAME, pet2Size, startX + pet1Size + 20, groundY);
  pet2.baseY = groundY;

  // Stagger behavior timers so they don't sync up
  pet2.nextRun += 30000;
  pet2.nextEat += 45000;
  pet2.nextGroom += 20000;
  pet2.nextPopcorn += 60000;

  requestAnimationFrame(loop);
}

function loop() {
  const now = Date.now();
  pet1.update(now);
  pet2.update(now);
  requestAnimationFrame(loop);
}

// Handle window resize
window.addEventListener('resize', () => {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const pet1Size = Math.min(winW * 0.35, winH * 0.6, 150);
  const pet2Size = pet1Size * PET_2_SCALE;
  const padding = 15;
  const groundY = winH - pet1Size - padding;

  if (pet1) {
    pet1.baseSize = pet1Size;
    pet1.baseY = groundY;
    pet1._applySprite(pet1.state);
    pet1.x = Math.min(pet1.x, winW - pet1Size);
  }
  if (pet2) {
    pet2.baseSize = pet2Size;
    pet2.baseY = groundY;
    pet2._applySprite(pet2.state);
    pet2.x = Math.min(pet2.x, winW - pet2Size);
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────
preloadSprites(init);
