/* Synthesised sound effects — no asset files, everything is WebAudio. */
window.NIAH = window.NIAH || {};

NIAH.audio = (function () {
  let ctx = null;
  let muted = false;

  function wake() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function noise(dur, freq, gain, type, q) {
    if (muted || !ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = type || 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start();
  }

  function tone(freq, dur, gain, type, delay, glide) {
    if (muted || !ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    wake,
    get muted() { return muted; },
    set muted(v) { muted = !!v; if (!muted) wake(); },
    dig()      { noise(0.17, 1200 + Math.random() * 700, 0.2); },
    dump()     { noise(0.38, 560, 0.28, 'lowpass'); },
    step()     { noise(0.07, 320 + Math.random() * 160, 0.07, 'lowpass'); },
    coin()     { tone(880 + Math.random() * 130, 0.1, 0.06, 'square'); },
    buy()      { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 0.08, 'triangle', i * 0.06)); },
    nope()     { tone(150, 0.14, 0.06, 'sawtooth'); },
    ping()     { tone(1760, 0.09, 0.05, 'sine'); },
    door()     { noise(0.9, 240, 0.16, 'lowpass', 2); tone(90, 0.8, 0.05, 'sawtooth', 0, 60); },
    fanfare()  { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, 0.11, 'triangle', i * 0.1)); },
    ui()       { tone(660, 0.07, 0.05, 'square'); },
  };
})();
