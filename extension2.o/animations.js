// ============================================================
// EXTENSIVE Z — animations.js
// Canvas-based background animation engine
// ============================================================

let _animFrame = null;
let _currentAnim = 'none';

const canvas = document.createElement('canvas');
canvas.id = 'bgCanvas';
canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.55;';
document.body.insertBefore(canvas, document.body.firstChild);
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); startAnim(_currentAnim); });

// ── Stop any running animation ──────────────────────────────
function stopAnim() {
  if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Start animation by name ─────────────────────────────────
function startAnim(name) {
  stopAnim();
  _currentAnim = name;
  if (name === 'none' || !name) return;
  const fn = ANIMS[name];
  if (fn) fn();
}

// ── Load saved preference ───────────────────────────────────
chrome.storage.local.get('bgAnimation', d => startAnim(d.bgAnimation || 'none'));

// ── Listen for changes from settings page ───────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.bgAnimation) startAnim(changes.bgAnimation.newValue || 'none');
});

// ============================================================
// ANIMATION DEFINITIONS
// ============================================================
const ANIMS = {

  // 1. Floating Balls
  balls: () => {
    const balls = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 20 + Math.random() * 60,
      vx: (Math.random() - .5) * .8,
      vy: (Math.random() - .5) * .8,
      hue: Math.random() * 360,
      dh: (Math.random() - .5) * .3
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      balls.forEach(b => {
        b.x += b.vx; b.y += b.vy; b.hue += b.dh;
        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `hsla(${b.hue},80%,65%,.18)`);
        g.addColorStop(1, `hsla(${b.hue},80%,65%,0)`);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 2. Waves
  waves: () => {
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const waves = [
        { amp: 40, freq: .006, speed: .018, y: canvas.height * .3, color: 'rgba(99,102,241,.12)' },
        { amp: 30, freq: .008, speed: .022, y: canvas.height * .5, color: 'rgba(34,211,238,.1)' },
        { amp: 50, freq: .005, speed: .014, y: canvas.height * .7, color: 'rgba(99,102,241,.08)' },
        { amp: 25, freq: .01,  speed: .03,  y: canvas.height * .85, color: 'rgba(34,211,238,.07)' },
      ];
      waves.forEach(w => {
        ctx.beginPath();
        ctx.moveTo(0, w.y);
        for (let x = 0; x <= canvas.width; x += 4) {
          ctx.lineTo(x, w.y + Math.sin(x * w.freq + t * w.speed) * w.amp);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fillStyle = w.color;
        ctx.fill();
      });
      t++;
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 3. Particles (connected dots)
  particles: () => {
    const N = 60, MAX_DIST = 130;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .6,
      vy: (Math.random() - .5) * .6,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,.5)'; ctx.fill();
      });
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAX_DIST) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${.25 * (1 - d / MAX_DIST)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 4. Matrix Rain
  matrix: () => {
    const chars = 'アイウエオカキクケコABCDEF0123456789!@#$%';
    const col = Math.floor(canvas.width / 16);
    const drops = Array(col).fill(1);
    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(34,211,238,.35)';
      ctx.font = '14px monospace';
      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > .975) drops[i] = 0;
        drops[i]++;
      });
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 5. Ripple (on timer, not click, so it auto-runs)
  ripple: () => {
    const ripples = [];
    let spawnT = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      spawnT++;
      if (spawnT % 80 === 0) {
        ripples.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 0, max: 180 + Math.random() * 120,
          hue: Math.random() > .5 ? 245 : 190
        });
      }
      ripples.forEach((rp, idx) => {
        rp.r += 1.5;
        const alpha = Math.max(0, .3 * (1 - rp.r / rp.max));
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${rp.hue},80%,65%,${alpha})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        if (rp.r >= rp.max) ripples.splice(idx, 1);
      });
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 6. Snow / Bubbles
  snow: () => {
    const flakes = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1 + Math.random() * 3,
      vy: .3 + Math.random() * .7,
      vx: (Math.random() - .5) * .3,
      alpha: .1 + Math.random() * .4,
      wobble: Math.random() * Math.PI * 2,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flakes.forEach(f => {
        f.wobble += .02;
        f.x += f.vx + Math.sin(f.wobble) * .3;
        f.y += f.vy;
        if (f.y > canvas.height) { f.y = -10; f.x = Math.random() * canvas.width; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.alpha})`; ctx.fill();
      });
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },

  // 7. Aurora
  aurora: () => {
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 4; i++) {
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue = (t * .2 + i * 90) % 360;
        g.addColorStop(0, `hsla(${hue},80%,50%,0)`);
        g.addColorStop(.5, `hsla(${hue},80%,50%,.07)`);
        g.addColorStop(1, `hsla(${(hue+60)%360},80%,50%,0)`);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.sin(t * .003 + i) * .4);
        ctx.fillStyle = g;
        ctx.fillRect(-canvas.width, -canvas.height, canvas.width * 2, canvas.height * 2);
        ctx.restore();
      }
      t++;
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  },
};
