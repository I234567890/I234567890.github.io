import { RELEASE_AT, countdownAt } from './countdown.js';
import { celebrateRelease } from './confetti.js';

const el = (id) => document.getElementById(id);
const pad = (value, length = 2) => String(value).padStart(length, '0');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const parts = { hours: el('hours'), minutes: el('minutes'), seconds: el('seconds'), milliseconds: el('milliseconds') };
const soundButton = el('sound-toggle');
const audioMessage = el('audio-message');
let soundOn = false;
let audioContext;
let tickBuffer;
let tickLoading;
let lastWholeSecond;
let isStreaming = false;
let initialized = false;
let frame;
let lastPaint = 0;
let soundRequest = 0;
const music = new Audio('/assets/music.mp3');
music.loop = true;
music.preload = 'none';
music.volume = 0.28;

function showAudioMessage(message) {
  audioMessage.textContent = message;
  audioMessage.hidden = !message;
}

function paintSoundState() {
  soundButton.setAttribute('aria-pressed', String(soundOn));
  soundButton.setAttribute('aria-label', soundOn ? 'Mute music and ticking sound' : 'Enable music and ticking sound');
  el('sound-label').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
  el('sound-invitation').classList.toggle('active', soundOn);
}

async function loadTick() {
  if (tickBuffer) return;
  if (!tickLoading) {
    tickLoading = fetch('/assets/tick.mp3').then((response) => {
      if (!response.ok) throw new Error('Tick unavailable');
      return response.arrayBuffer();
    }).then((data) => audioContext.decodeAudioData(data)).then((buffer) => {
      tickBuffer = buffer;
    }).catch(() => {
      tickLoading = null;
      if (soundOn) showAudioMessage('The ticking sound could not load. Tap sound off, then on to retry.');
    });
  }
  await tickLoading;
}

soundButton.addEventListener('click', async () => {
  const request = ++soundRequest;
  soundOn = !soundOn;
  paintSoundState();
  if (!soundOn) {
    music.pause();
    if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
    showAudioMessage('');
    return;
  }
  showAudioMessage('');
  // Start both audio APIs within the click gesture, including on iOS.
  const Context = window.AudioContext || window.webkitAudioContext;
  if (Context && !audioContext) audioContext = new Context();
  const resume = audioContext ? audioContext.resume() : Promise.resolve();
  const play = music.play();
  const results = await Promise.allSettled([resume, play]);
  if (request !== soundRequest || !soundOn) {
    if (!soundOn) music.pause();
    return;
  }
  if (audioContext) loadTick();
  if (results[1].status === 'rejected') {
    showAudioMessage('The music could not start. Tap sound off, then on to retry.');
  } else if (!Context) {
    showAudioMessage('Music is playing. This browser does not support the ticking effect.');
  }
});

function playTick() {
  if (!soundOn || !tickBuffer || !audioContext || audioContext.state !== 'running' || document.hidden) return;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = tickBuffer;
  gain.gain.value = 0.6;
  source.connect(gain);
  gain.connect(audioContext.destination);
  // Every boundary starts the supplied sample once; limit overlap for long samples.
  source.start(0, 0, Math.min(tickBuffer.duration, 0.95));
  source.onended = () => { source.disconnect(); gain.disconnect(); };
}

function updateReleaseState(state) {
  if (initialized && state.streaming === isStreaming) return;
  const justReleased = initialized && !isStreaming && state.streaming;
  isStreaming = state.streaming;
  initialized = true;
  el('clock-container').hidden = isStreaming;
  el('streaming').hidden = !isStreaming;
  if (isStreaming) {
    document.title = 'Now streaming · Lanterns Episode 5';
    el('release-copy').textContent = 'Episode 5 is now streaming on HBO Max.';
    el('local-release').textContent = 'Availability may vary by country.';
    el('release-announcement').textContent = 'Lanterns Episode 5 is now streaming.';
    if (justReleased) celebrateRelease(reducedMotion.matches);
  } else {
    document.title = 'Lanterns · Episode 5 Countdown';
    el('release-copy').innerHTML = 'Sunday, September 13 <span class="copy-divider">·</span> 9:00 PM ET<br class="mobile-break" /><span class="platforms"> on HBO &amp; HBO Max</span>';
    const local = new Intl.DateTimeFormat(undefined, {
      weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'
    }).format(new Date(RELEASE_AT));
    el('local-release').textContent = 'Your local time · ' + local;
    el('release-announcement').textContent = '';
  }
}

function renderCountdown() {
  const state = countdownAt(Date.now());
  updateReleaseState(state);
  const wholeSecond = Math.floor(state.remaining / 1000);
  if (wholeSecond !== lastWholeSecond) {
    if (lastWholeSecond !== undefined && lastWholeSecond - wholeSecond === 1 && !state.streaming) playTick();
    parts.hours.textContent = pad(state.hours);
    parts.minutes.textContent = pad(state.minutes);
    parts.seconds.textContent = pad(state.seconds);
    el('clock').setAttribute('aria-label', state.hours + ' hours, ' + state.minutes + ' minutes, ' + state.seconds + ' seconds until Lanterns Episode 5');
    lastWholeSecond = wholeSecond;
  }
  parts.milliseconds.textContent = '.' + pad(state.milliseconds, 3);
}

const canvas = el('particles');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;
let motes = [];
let lastParticleFrame = 0;

function resizeAtmosphere() {
  width = window.innerWidth;
  height = window.innerHeight;
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  motes = Array.from({ length: width < 650 ? 30 : 60 }, () => ({
    x: Math.random() * width, y: Math.random() * height,
    radius: 0.35 + Math.random() * 1.1,
    speed: 0.1 + Math.random() * 0.24,
    phase: Math.random() * Math.PI * 2
  }));
}

function paintAtmosphere(timestamp) {
  if (!ctx || reducedMotion.matches || timestamp - lastParticleFrame < 32) return;
  const delta = Math.min(3, (timestamp - lastParticleFrame) / 32 || 1);
  lastParticleFrame = timestamp;
  ctx.clearRect(0, 0, width, height);
  for (const mote of motes) {
    mote.y -= mote.speed * delta;
    mote.x += Math.sin(timestamp * 0.00015 + mote.phase) * 0.12 * delta;
    if (mote.y < -5) { mote.y = height + 5; mote.x = Math.random() * width; }
    const opacity = 0.14 + (Math.sin(timestamp * 0.0007 + mote.phase) + 1) * 0.2;
    ctx.fillStyle = 'rgba(157,234,137,' + opacity + ')';
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function animate(timestamp) {
  if (timestamp - lastPaint >= (reducedMotion.matches ? 100 : 16)) {
    renderCountdown();
    lastPaint = timestamp;
  }
  paintAtmosphere(timestamp);
  frame = requestAnimationFrame(animate);
}

document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  lastWholeSecond = undefined;
  if (document.hidden) {
    music.pause();
  } else {
    renderCountdown();
    if (soundOn) music.play().catch(() => {
      soundOn = false;
      paintSoundState();
      showAudioMessage('Tap sound on to resume the music.');
    });
    frame = requestAnimationFrame(animate);
  }
});
window.addEventListener('pageshow', () => { lastWholeSecond = undefined; renderCountdown(); });
window.addEventListener('resize', resizeAtmosphere, { passive: true });
renderCountdown();
resizeAtmosphere();
frame = requestAnimationFrame(animate);

// Wait for the visual assets, with a bounded fallback so a failed asset cannot trap visitors.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ring = el('power-ring');
const ringReady = ring.complete ? Promise.resolve() : new Promise((resolve) => {
  ring.addEventListener('load', resolve, {once:true});
  ring.addEventListener('error', resolve, {once:true});
});
Promise.all([
  wait(reducedMotion.matches ? 150 : 1050),
  Promise.race([Promise.allSettled([ringReady, document.fonts.ready]), wait(4500)])
]).then(() => {
  el('loader').classList.add('loaded');
  el('loader').setAttribute('aria-hidden', 'true');
});
