let celebrated = false;

export function celebrateRelease(reducedMotion = false) {
  if (celebrated || reducedMotion) return;
  celebrated = true;

  const canvas = document.createElement('canvas');
  canvas.className = 'release-confetti';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);
  document.body.append(canvas);

  const colors = ['#a3ff7b', '#58d654', '#18a34a', '#d9ffc5', '#f2ffe9'];
  const pieces = Array.from({ length: width < 650 ? 100 : 180 }, (_, index) => {
    const left = index % 2 === 0;
    return {
      x: left ? -8 : width + 8,
      y: height * (0.55 + Math.random() * 0.12),
      vx: (left ? 1 : -1) * width * (0.007 + Math.random() * 0.011),
      vy: -(7 + Math.random() * 10) * Math.min(height / 750, 1.3),
      size: 4 + Math.random() * 5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  });

  const started = performance.now();
  let lastFrame = started;
  function draw(now) {
    const elapsed = now - started;
    if (elapsed >= 4600 || document.hidden) {
      canvas.remove();
      return;
    }
    const delta = Math.min(2, (now - lastFrame) / 16.667);
    lastFrame = now;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.min(1, (4600 - elapsed) / 900);
    for (const piece of pieces) {
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.vx *= Math.pow(0.988, delta);
      piece.vy += 0.18 * delta;
      piece.angle += piece.spin * delta;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context.restore();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
