// SKY COURIER — golden-hour archipelago ring-run.
// Bush-pilot courier Raka ("Merpati") flies parcels between island strips.
// Original game: original names, art, sounds. No libraries, no network.
(function () {
  'use strict';
  var W = 1280, H = 720;
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var params = new URLSearchParams(location.search || '');
  var SHOT = parseInt(params.get('shot') || '0', 10) || 0;

  // ---------- helpers ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill || 'rgba(12,16,22,0.88)';
    rr(x, y, w, h, 10); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = stroke || 'rgba(255,196,110,0.55)'; ctx.stroke();
  }
  function text(s, x, y, size, color, align, bold) {
    ctx.fillStyle = color || '#fff';
    ctx.font = (bold ? 'bold ' : '') + size + 'px Verdana, sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }
  function fitText(s, x, y, size, color, maxW, bold) {
    var fs = size;
    ctx.font = (bold ? 'bold ' : '') + fs + 'px Verdana, sans-serif';
    while (ctx.measureText(s).width > maxW && fs > 9) { fs -= 1; ctx.font = (bold ? 'bold ' : '') + fs + 'px Verdana, sans-serif'; }
    ctx.fillStyle = color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }

  // ---------- data ----------
  var PEOPLE = [
    { name: 'Bu Sari', role: 'Fish market · Kenari', mood: 'Happy', color: '#e2703a', skin: '#c98d5f', face: 'face-bu-sari', dialog: 'Fresh catch today, Raka! Fly it fast, still flapping!' },
    { name: 'Pak Dedi', role: 'Coffee farmer · Highlands', mood: 'Proud', color: '#7a5c2e', skin: '#a97c50', face: 'face-pak-dedi', dialog: 'My beans fly first class. No shaking, ya?' },
    { name: 'Mira', role: 'Clinic nurse · Karang', mood: 'Worried', color: '#3a7d8c', skin: '#d9a06b', face: 'face-mira', dialog: 'The medicine must arrive before dark. Please.' },
    { name: 'Joko', role: 'Postmaster · Kenari', mood: 'Busy', color: '#4a6b3a', skin: '#b98a5e', face: 'face-joko', dialog: 'Forty letters, one parcel, zero excuses!' },
    { name: 'Lina', role: 'School teacher · Karang', mood: 'Bright', color: '#8c4a7d', skin: '#e0aa72', face: 'face-lina', dialog: 'The kids drew your plane again. It flies!' },
    { name: 'Insp. Halim', role: 'Aviation inspector · VIP', mood: 'Strict', color: '#333a44', skin: '#c08a5e', face: 'face-halim', dialog: 'I grade every ring, pilot. Impress me.' },
  ];
  var LEGS = [
    { n: 1, name: 'Kenari → Karang', sub: 'Sunset hop · medicine run', bg: 'bg-archipelago', weather: 'golden', cargo: 3, cargoName: 'Medicine + post', pay: 90, rings: 6, fog: 0 },
    { n: 2, name: 'Canyon Run', sub: 'Golden canyon · tight rings', bg: 'bg-canyon', weather: 'golden', cargo: 2, cargoName: 'Coffee beans', pay: 110, rings: 7, fog: 0 },
    { n: 3, name: 'Island Hop', sub: '3 strips · sea fog', bg: 'bg-dawnfog', weather: 'fog', cargo: 4, cargoName: 'Fish + school books', pay: 130, rings: 7, fog: 0.45 },
    { n: 4, name: 'Night Ferry', sub: 'Dusk · runway lights', bg: 'bg-strip', weather: 'dusk', cargo: 3, cargoName: 'Post + lanterns', pay: 140, rings: 7, fog: 0.15 },
    { n: 5, name: 'Storm Squall', sub: 'Rain · gusts · low cloud', bg: 'bg-rain', weather: 'rain', cargo: 5, cargoName: 'Storm supplies', pay: 170, rings: 8, fog: 0.3 },
    { n: 6, name: "The Inspector's Charter", sub: 'Dawn fog · VIP aboard', bg: 'bg-dawnfog', weather: 'fog', cargo: 2, cargoName: 'VIP charter · Halim', pay: 260, rings: 8, fog: 0.55 },
  ];
  var UPGRADES = [
    { id: 'engine', name: 'Bigger Engine', cost: 150, desc: '+25% speed, faster climb' },
    { id: 'tank', name: 'Larger Fuel Tank', cost: 120, desc: '+40 fuel, longer legs' },
    { id: 'rack', name: 'Cargo Rack', cost: 100, desc: '+2 parcels per leg, +pay' },
    { id: 'instruments', name: 'Better Instruments', cost: 140, desc: 'Wider ring lock (+35% tolerance)' },
    { id: 'floats', name: 'Floats', cost: 200, desc: 'Water landing — opens lagoon strip' },
    { id: 'radio', name: 'Radio Set', cost: 90, desc: 'Weather forecast — squalls shown early' },
  ];
  var WEATHER = {
    golden: { label: 'GOLDEN HOUR · clear', gust: 0.10 },
    fog: { label: 'SEA FOG · low visibility', gust: 0.22 },
    dusk: { label: 'DUSK · runway lights on', gust: 0.14 },
    rain: { label: 'RAIN SQUALL · gusts', gust: 0.45 },
  };

  function destOf(leg) { var p = leg.name.split('→'); return p.length > 1 ? p[1].trim() : leg.name; }

  // ---------- state ----------
  var S = {
    screen: 'title', slot: 1, credits: 120, upgrades: {}, legDone: [false, false, false, false, false, false],
    legScore: [0, 0, 0, 0, 0, 0], legGrade: ['', '', '', '', '', ''],
    log: ['Welcome back, Raka. Route board is clear.', 'Bu Sari left 3 crates of fish at the hangar.', 'Radio: golden hour holds till 18:40.'],
    selectedLeg: 1, view: 'chase', time: 0,
  };
  var F = null; // flight state
  var buttons = []; // {x,y,w,h,label,fn}
  var mouse = { x: -1, y: -1 };

  function saveKey(slot) { return 'skycourier-save-' + slot; }
  function saveGame() {
    try {
      localStorage.setItem(saveKey(S.slot), JSON.stringify({
        credits: S.credits, upgrades: S.upgrades, legDone: S.legDone,
        legScore: S.legScore, legGrade: S.legGrade, log: S.log.slice(-6),
      }));
    } catch (e) { /* storage unavailable */ }
  }
  function loadGame(slot) {
    try {
      var raw = localStorage.getItem(saveKey(slot));
      if (!raw) return false;
      var d = JSON.parse(raw);
      S.credits = d.credits; S.upgrades = d.upgrades || {}; S.legDone = d.legDone;
      S.legScore = d.legScore; S.legGrade = d.legGrade; S.log = d.log || [];
      return true;
    } catch (e) { return false; }
  }
  function hasUp(id) { return !!S.upgrades[id]; }
  function totalScore() { var t = 0; for (var i = 0; i < 6; i++) t += S.legScore[i] || 0; return t; }
  function nextLeg() { for (var i = 0; i < 6; i++) if (!S.legDone[i]) return i + 1; return 6; }

  // ---------- audio (WebAudio synth only) ----------
  var AC = null, engineOsc = null, engineGain = null, musicTimer = null;
  function audio() {
    if (AC) return AC;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      AC = new Ctx();
      engineOsc = AC.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 70;
      var filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
      engineGain = AC.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(AC.destination);
      engineOsc.start();
    } catch (e) { AC = null; }
    return AC;
  }
  function beep(freq, dur, type, vol, when) {
    if (!audio()) return;
    try {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, AC.currentTime + (when || 0));
      g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + (when || 0) + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(AC.currentTime + (when || 0)); o.stop(AC.currentTime + (when || 0) + dur + 0.02);
    } catch (e) { /* ignore */ }
  }
  function ringChime() { beep(880, 0.18, 'sine', 0.14); beep(1318, 0.3, 'sine', 0.12, 0.09); }
  function bell() { beep(1046, 0.4, 'triangle', 0.16); beep(1568, 0.5, 'triangle', 0.1, 0.12); }
  function blip() { beep(660, 0.08, 'square', 0.05); }
  function startMusic() {
    if (!audio() || musicTimer) return;
    var notes = [523, 659, 784, 659, 587, 784, 880, 784];
    var i = 0;
    musicTimer = setInterval(function () {
      if (S.screen === 'title' || S.screen === 'base') beep(notes[i % notes.length], 0.5, 'triangle', 0.045);
      i++;
    }, 620);
  }

  // ---------- images ----------
  var IMG = {};
  var IMG_LIST = ['bg-archipelago', 'bg-canyon', 'bg-dawnfog', 'bg-rain', 'bg-strip', 'bg-hangar', 'bg-canyon-jet', 'bg-strip-jet', 'plane', 'parcels', 'cockpit-panel', 'face-bu-sari', 'face-pak-dedi', 'face-mira', 'face-joko', 'face-lina', 'face-halim'];
  var imgLoaded = 0;
  IMG_LIST.forEach(function (name) {
    var im = new Image();
    im.onload = function () { imgLoaded++; };
    im.onerror = function () { imgLoaded++; };
    im.src = 'assets/' + name + ((name.indexOf('bg-') === 0 || name === 'cockpit-panel') ? '.jpg' : '.png');
    IMG[name] = im;
  });
  function imagesReady() { return imgLoaded >= IMG_LIST.length; }
  function drawBG(name) {
    var im = IMG[name];
    if (im && im.naturalWidth > 0) ctx.drawImage(im, 0, 0, W, H);
    else { ctx.fillStyle = '#2a1c10'; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- flight ----------
  var keys = {};
  function startLeg(n) {
    var leg = LEGS[n - 1];
    var cargo = leg.cargo + (hasUp('rack') ? 2 : 0);
    var ringList = [];
    for (var i = 0; i < leg.rings; i++) {
      ringList.push({ d: 12 + i * (88 / leg.rings), x: (Math.sin(i * 2.7 + n) * 0.55), y: (Math.cos(i * 1.9 + n * 2) * 0.4), hit: null });
    }
    F = {
      leg: n, progress: 0, speed: 0, throttle: 0.72, alt: 1200, hdg: 40 + n * 12,
      fuel: 100 + (hasUp('tank') ? 40 : 0), fuelMax: 100 + (hasUp('tank') ? 40 : 0),
      px: 0, py: 0, bank: 0, combo: 1, comboHits: 0, hits: 0, misses: 0,
      rings: ringList, cargo: cargo, score: 0, done: false, failReason: '',
      msg: leg.name + ' — ' + leg.cargoName + ' aboard', msgT: 5, t: 0,
    };
    S.screen = 'flight';
    audio(); startMusic();
    if (engineGain) engineGain.gain.value = 0.05;
  }
  function ringTol() { return hasUp('instruments') ? 0.62 : 0.46; }
  function updateFlight(dt) {
    if (!F || F.done) return;
    F.t += dt;
    var leg = LEGS[F.leg - 1];
    var w = WEATHER[leg.weather];
    // throttle
    if (keys['w'] || keys['arrowup']) F.throttle = clamp(F.throttle + dt * 0.5, 0.3, 1);
    if (keys['s'] || keys['arrowdown']) F.throttle = clamp(F.throttle - dt * 0.5, 0.3, 1);
    // steering: left/right bank, up/down climb — cargo weight slows response
    var weight = 1 - F.cargo * 0.035;
    var steer = 1.35 * weight;
    var gust = (Math.sin(F.t * 1.7) + Math.sin(F.t * 3.1) * 0.5) * w.gust * 0.35;
    if (keys['a'] || keys['arrowleft']) { F.px -= steer * dt; F.bank = lerp(F.bank, -0.35, 0.2); }
    else if (keys['d'] || keys['arrowright']) { F.px += steer * dt; F.bank = lerp(F.bank, 0.35, 0.2); }
    else F.bank = lerp(F.bank, 0, 0.08);
    if (keys['arrowup'] || keys['w']) F.py -= 0; // climb handled below
    // climb / descend: ArrowUp+W conflict resolved — use I/K? Keep: Up climbs, Down descends
    if (keys['arrowup']) F.py -= 0.9 * weight * dt;
    if (keys['arrowdown']) F.py += 0.9 * weight * dt;
    F.px = clamp(F.px + gust * dt, -1.1, 1.1);
    F.py = clamp(F.py, -0.9, 0.9);
    var spd = (52 + (hasUp('engine') ? 14 : 0)) * F.throttle;
    F.speed = Math.round(spd * 2.2);
    F.alt = Math.round(1200 - F.py * 900 + Math.sin(F.t * 0.8) * 12);
    F.hdg = Math.round(40 + F.leg * 12 + F.px * 22 + Math.sin(F.t * 0.5) * 2);
    F.progress += spd * dt / 9.5;
    F.fuel -= dt * (1.05 + F.throttle * 0.9 - (hasUp('tank') ? 0.15 : 0));
    if (F.fuel <= 0) { F.fuel = 0; return endFlight(false, 'OUT OF FUEL — ditching in the sea. The parcels are soaked.'); }
    // rings
    for (var i = 0; i < F.rings.length; i++) {
      var r = F.rings[i];
      var z = r.d - F.progress;
      if (r.hit === null && z <= 0) {
        var dx = Math.abs(F.px - r.x), dy = Math.abs(F.py - r.y);
        if (dx < ringTol() && dy < ringTol() * 0.8) {
          r.hit = true; F.hits++; F.comboHits++;
          F.combo = Math.min(2.5, 1 + F.comboHits * 0.25);
          var pts = Math.round(100 * F.combo);
          F.score += pts; ringChime();
          F.msg = 'RING! +' + pts + '  ·  COMBO x' + F.combo.toFixed(2); F.msgT = 1.6;
        } else {
          r.hit = false; F.misses++; F.combo = 1; F.comboHits = 0;
          F.msg = 'RING MISSED — combo broken'; F.msgT = 1.6;
          beep(180, 0.25, 'square', 0.08);
        }
      }
    }
    if (F.msgT > 0) F.msgT -= dt;
    if (F.progress >= 100) {
      if (F.hits >= Math.ceil(F.rings.length * 0.5)) endFlight(true, '');
      else endFlight(false, 'TOO MANY RINGS MISSED — the strip turned you away. Fly the rings!');
    }
  }
  function gradeFor(hits, total) {
    var r = hits / total;
    if (r >= 0.99) return 'S'; if (r >= 0.8) return 'A'; if (r >= 0.6) return 'B'; return 'C';
  }
  function endFlight(ok, reason) {
    F.done = true;
    if (engineGain) engineGain.gain.value = 0;
    var leg = LEGS[F.leg - 1];
    if (ok) {
      var g = gradeFor(F.hits, F.rings.length);
      var bonus = { S: 120, A: 80, B: 40, C: 10 }[g];
      var earned = leg.pay + F.score + bonus;
      S.credits += earned;
      S.legDone[F.leg - 1] = true;
      S.legScore[F.leg - 1] = F.score + bonus;
      S.legGrade[F.leg - 1] = g;
      S.log.push('Leg ' + F.leg + ': delivered! Grade ' + g + ', +' + earned + ' cr.');
      bell();
      F.earned = earned; F.grade = g;
      S.screen = 'results';
      saveGame();
    } else {
      F.failReason = reason;
      S.log.push('Leg ' + F.leg + ' FAILED: ' + reason);
      S.screen = 'gameover';
      saveGame();
    }
  }

  // ---------- drawing: shared bits ----------
  function drawTopBar(title, right) {
    ctx.fillStyle = 'rgba(8,10,14,0.82)'; ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = '#ffb347'; ctx.fillRect(0, 46, W, 3);
    text(title, 18, 31, 20, '#ffd9a0', 'left', true);
    // right side: shrink-to-fit then right-align so it can never clip off-screen
    var fs = 17;
    ctx.font = 'bold ' + fs + 'px Verdana, sans-serif';
    while (ctx.measureText(right).width > 560 && fs > 10) { fs -= 1; ctx.font = 'bold ' + fs + 'px Verdana, sans-serif'; }
    ctx.fillStyle = '#ffe9c4'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(right, W - 18, 31);
    ctx.textAlign = 'left';
  }
  function drawHUD() {
    // top instrument strip: ALT / SPD / HDG / FUEL / CARGO / COMBO / SCORE
    var items = [
      ['ALT', F.alt + ' ft'], ['SPD', F.speed + ' kt'], ['HDG', ('00' + F.hdg).slice(-3) + '°'],
      ['FUEL', Math.round(F.fuel) + '/' + F.fuelMax], ['CARGO', F.cargo + ' parcels'],
      ['COMBO', 'x' + F.combo.toFixed(2)], ['SCORE', '' + F.score],
    ];
    var bw = 168, gap = 8, x0 = 12, y = 56;
    for (var i = 0; i < items.length; i++) {
      var x = x0 + i * (bw + gap);
      ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(x, y, bw, 52, 8); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = F.fuel < 25 && items[i][0] === 'FUEL' ? '#ff5a4a' : 'rgba(255,196,110,0.6)'; ctx.stroke();
      text(items[i][0], x + 10, y + 19, 12, '#ffb347', 'left', true);
      text(items[i][1], x + 10, y + 42, 20, items[i][0] === 'FUEL' && F.fuel < 25 ? '#ff6a5a' : '#ffffff', 'left', true);
    }
    // leg banner + weather + distance progress (bottom) — skipped in cockpit view
    // (the dashboard owns the bottom of the frame there; see drawHUD compact bar)
    var leg = LEGS[F.leg - 1];
    if (S.view === 'cockpit') {
      // two taller boxes: text on its own line, bar on its own line — never stacked
      ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(12, 110, 560, 48, 8); ctx.fill();
      text('LEG ' + F.leg + ' · ' + leg.name + '  ·  ' + Math.round(F.progress) + '% to ' + destOf(leg), 26, 130, 13, '#ffd9a0', 'left', true);
      text(WEATHER[leg.weather].label + '  ·  ' + leg.cargoName, 26, 149, 12, '#dfe9f2', 'left');
      ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(600, 110, 560, 48, 8); ctx.fill();
      text('DISTANCE TO ' + destOf(leg).toUpperCase() + '  ·  ' + Math.round(F.progress) + '%', 614, 130, 12, '#ffb347', 'left', true);
      ctx.fillStyle = '#22303c'; rr(614, 136, 532, 12, 6); ctx.fill();
      ctx.fillStyle = '#ffb347'; rr(614, 136, 532 * clamp(F.progress / 100, 0, 1), 12, 6); ctx.fill();
    } else {
    ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(12, H - 64, 560, 52, 8); ctx.fill();
    text('LEG ' + F.leg + ' · ' + leg.name, 26, H - 42, 16, '#ffd9a0', 'left', true);
    text(WEATHER[leg.weather].label + '  ·  ' + leg.cargoName, 26, H - 20, 13, '#dfe9f2');
    // progress bar
    var bx = 600, bw2 = 560;
    ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(bx, H - 64, bw2, 52, 8); ctx.fill();
    text('DISTANCE TO ' + destOf(leg).toUpperCase(), bx + 12, H - 42, 12, '#ffb347', 'left', true);
    ctx.fillStyle = '#22303c'; rr(bx + 12, H - 30, bw2 - 24, 12, 6); ctx.fill();
    ctx.fillStyle = '#ffb347'; rr(bx + 12, H - 30, (bw2 - 24) * clamp(F.progress / 100, 0, 1), 12, 6); ctx.fill();
    text(Math.round(F.progress) + '%', bx + bw2 - 12, H - 42, 13, '#fff', 'right', true);
    }
    // radio dialog line (lower in cockpit view so it clears the compact bars)
    if (F.msgT > 0) {
      var ry = S.view === 'cockpit' ? 206 : 120;
      ctx.fillStyle = 'rgba(20,28,36,0.9)'; rr(330, ry, 620, 40, 8); ctx.fill();
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.stroke();
      text('RADIO ▸ ' + F.msg, 350, ry + 26, 16, '#ffe9c4', 'left', true);
    }
    // parcels aboard, tucked into the CARGO instrument box (top strip, item 5)
    var pim = IMG.parcels;
    if (pim && pim.naturalWidth) {
      var cx5 = x0 + 4 * (bw + gap);
      ctx.drawImage(pim, cx5 + bw - 46, y + 6, 38, 42);
    }
    ctx.fillStyle = 'rgba(8,12,16,0.78)'; rr(W - 64, 200, 44, 220, 8); ctx.fill();
    text('THR', W - 42, 190, 11, '#ffb347', 'center', true);
    ctx.fillStyle = '#22303c'; ctx.fillRect(W - 50, 210, 16, 190);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(W - 50, 210 + 190 * (1 - F.throttle), 16, 190 * F.throttle);
    text(Math.round(F.throttle * 100) + '%', W - 42, 440, 12, '#fff', 'center', true);
  }
  function drawRing(r, px, py, scale, alpha) {
    var rx = W / 2 + (r.x - px) * 260 * scale;
    var ry = H * 0.44 + (r.y - py) * 200 * scale;
    var rad = 150 * scale + 26;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 28;
    ctx.lineWidth = 10; ctx.strokeStyle = '#ffd27a';
    ctx.beginPath(); ctx.ellipse(rx, ry, rad, rad * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = '#fff3d0';
    ctx.beginPath(); ctx.ellipse(rx, ry, rad, rad * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.fill();
    // label: in chase view the plane sprite sits centre-frame and covers a
    // ring-anchored label, so pin it to a fixed spot under the radio banner
    // (y 168-192) where the aircraft can never reach it. Cockpit view keeps
    // the ring-anchored label — the dashboard owns the bottom there.
    var lt = 'RING ' + Math.max(0, Math.round((r.d - F.progress) * 12)) + ' m';
    ctx.font = 'bold 14px Verdana, sans-serif';
    var lw = ctx.measureText(lt).width;
    ctx.fillStyle = 'rgba(8,12,16,0.8)';
    var lx = S.view === 'chase' ? W / 2 : rx;
    var ly = S.view === 'chase' ? 168 : ry + rad * 0.82 + 10;
    rr(lx - lw / 2 - 8, ly, lw + 16, 24, 6); ctx.fill();
    text(lt, lx, ly + 17, 14, '#ffe9c4', 'center', true);
    ctx.restore();
  }
  function drawPlaneSprite(cx, cy, w, bank) {
    var im = IMG.plane;
    if (!im || !im.naturalWidth) return;
    var h = w * (im.naturalHeight / im.naturalWidth);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(bank || 0);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  // ---- in-scene jets, drawn in code (no cutout sprite) ------------------
  // SUPERSEDED by the photo pass: shots 2-3 now use photographic scene
  // backgrounds with the jet already in the photo (bg-canyon-jet /
  // bg-strip-jet), because these flat vector jets read less real than a
  // photograph against the photo backgrounds. Kept unused, not deleted,
  // so the diff stays surgical; drawFlight no longer calls them.
  function jetPoly(pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function jetHaze(x0, y0, x1, y1, topA, botA) {
    // warm golden-hour air over the airframe: blends the jet into the scene
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,196,130,' + topA + ')');
    g.addColorStop(0.55, 'rgba(255,214,165,' + (topA * 0.5) + ')');
    g.addColorStop(1, 'rgba(150,110,70,' + botA + ')');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  function jetGlow(x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, color.replace('A', a));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function drawJetBanking(cx, cy, s) {
    // Shot 2: rear three-quarter view, banking left into the canyon ring.
    // Nose points up-screen toward the ring; tail + afterburner face the
    // viewer. Sun is upper-left, so the left edges carry the warm rim.
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(-0.30);
    // soft air shadow under the jet (depth, not a ground shadow)
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#241207';
    ctx.shadowColor = 'rgba(20,10,4,0.55)'; ctx.shadowBlur = 26;
    ctx.beginPath(); ctx.ellipse(16, 122, 185, 24, 0.10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // afterburner: glow + flame cone behind the tail nozzle
    jetGlow(0, 118, 78, 'rgba(255,150,60,A)', '0.30');
    var fl = ctx.createRadialGradient(0, 116, 4, 0, 128, 54);
    fl.addColorStop(0, 'rgba(255,252,230,0.95)'); fl.addColorStop(0.35, 'rgba(255,192,92,0.85)');
    fl.addColorStop(0.7, 'rgba(255,110,40,0.45)'); fl.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(-15, 90);
    ctx.quadraticCurveTo(-26, 138, 0, 166); ctx.quadraticCurveTo(26, 138, 15, 90);
    ctx.closePath(); ctx.fill();
    // main wings: left wing raised + foreshortened, right wing dropped + long
    var wg = ctx.createLinearGradient(0, -60, 0, 96);
    wg.addColorStop(0, '#aeb6bf'); wg.addColorStop(0.5, '#6d7780'); wg.addColorStop(1, '#383f47');
    jetPoly([[-18, -8], [-118, -58], [-196, -34], [-152, 24], [-62, 30]], wg);
    jetPoly([[18, -4], [150, 42], [232, 78], [172, 96], [60, 34]], wg);
    // warm rim on the sun-side leading edges only; dark shade on trailing edges
    ctx.strokeStyle = 'rgba(255,205,140,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-118, -58); ctx.lineTo(-196, -34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(150, 42); ctx.lineTo(232, 78); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,26,34,0.4)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-196, -34); ctx.lineTo(-152, 24); ctx.lineTo(-62, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(232, 78); ctx.lineTo(172, 96); ctx.lineTo(60, 34); ctx.stroke();
    // trailing-edge flap lines
    ctx.strokeStyle = 'rgba(28,36,44,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-170, -18); ctx.lineTo(-140, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(196, 66); ctx.lineTo(168, 82); ctx.stroke();
    // horizontal stabilators near the tail
    var sg = ctx.createLinearGradient(0, 40, 0, 96);
    sg.addColorStop(0, '#b9c1c9'); sg.addColorStop(1, '#525c66');
    jetPoly([[-16, 46], [-94, 64], [-118, 84], [-40, 82]], sg);
    jetPoly([[16, 48], [96, 72], [120, 92], [40, 84]], sg);
    // fuselage: tapered body, nose up toward the ring, tail down at viewer
    var fg = ctx.createLinearGradient(-26, 0, 26, 0);
    fg.addColorStop(0, '#c2c9d0'); fg.addColorStop(0.42, '#7e8894');
    fg.addColorStop(0.72, '#4c565f'); fg.addColorStop(1, '#2e363e');
    ctx.beginPath(); ctx.moveTo(0, -112);
    ctx.quadraticCurveTo(-13, -76, -20, -40); ctx.quadraticCurveTo(-26, 20, -24, 88);
    ctx.quadraticCurveTo(0, 98, 24, 88);
    ctx.quadraticCurveTo(26, 20, 20, -40); ctx.quadraticCurveTo(13, -76, 0, -112);
    ctx.closePath(); ctx.fillStyle = fg; ctx.fill();
    // belly shade + spine highlight
    ctx.beginPath(); ctx.moveTo(-22, 10); ctx.quadraticCurveTo(-24, 60, -20, 88);
    ctx.quadraticCurveTo(0, 96, 20, 88); ctx.quadraticCurveTo(24, 60, 22, 10);
    ctx.quadraticCurveTo(0, 26, -22, 10); ctx.closePath();
    ctx.fillStyle = 'rgba(18,24,32,0.28)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,235,200,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-11, -100); ctx.quadraticCurveTo(-18, -50, -20, 10); ctx.stroke();
    // panel lines
    ctx.strokeStyle = 'rgba(28,36,44,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, -84); ctx.lineTo(-10, 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -80); ctx.lineTo(12, 44); ctx.stroke();
    // vertical stabilizer: swept fin hugging the rear spine
    var vg = ctx.createLinearGradient(-12, 0, 16, 0);
    vg.addColorStop(0, '#b4bdc6'); vg.addColorStop(1, '#333c45');
    jetPoly([[-7, 20], [-4, -40], [10, -78], [14, -72], [10, 24]], vg, 'rgba(255,200,130,0.8)', 2);
    // underwing pylons (fighter stores cue)
    jetPoly([[-122, -22], [-108, -15], [-112, 2], [-126, -5]], '#3a444e');
    jetPoly([[148, 50], [162, 57], [158, 72], [144, 65]], '#3a444e');
    // wing-root shadow where the wings meet the fuselage
    ctx.strokeStyle = 'rgba(20,26,34,0.45)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-62, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -4); ctx.lineTo(60, 34); ctx.stroke();
    // wing panel lines following the sweep
    ctx.strokeStyle = 'rgba(28,36,44,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-60, -30); ctx.lineTo(-150, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(80, 20); ctx.lineTo(180, 62); ctx.stroke();
    // tail nozzle
    ctx.fillStyle = '#20262d'; ctx.beginPath(); ctx.ellipse(0, 92, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,110,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 92, 20, 10, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    // bubble canopy near the nose, sun glint on its left
    var cg = ctx.createLinearGradient(-8, -96, 8, -58);
    cg.addColorStop(0, '#c8d8e4'); cg.addColorStop(0.5, '#54748f'); cg.addColorStop(1, '#182a3a');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(-1, -78, 8, 19, -0.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,50,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-1, -78, 8, 19, -0.06, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -92); ctx.lineTo(-2, -66); ctx.stroke();
    // wingtip nav lights
    jetGlow(-196, -34, 16, 'rgba(255,70,60,A)', '0.85');
    ctx.fillStyle = '#ff5040'; ctx.beginPath(); ctx.arc(-196, -34, 4, 0, Math.PI * 2); ctx.fill();
    jetGlow(232, 78, 16, 'rgba(80,255,140,A)', '0.85');
    ctx.fillStyle = '#4dff8c'; ctx.beginPath(); ctx.arc(232, 78, 4, 0, Math.PI * 2); ctx.fill();
    // warm rim along the sun-side (left) fuselage edge
    ctx.strokeStyle = 'rgba(255,205,140,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -112);
    ctx.quadraticCurveTo(-13, -76, -20, -40); ctx.quadraticCurveTo(-26, 20, -24, 88); ctx.stroke();
    // speed streaks trailing the wingtips and tail
    ctx.strokeStyle = 'rgba(255,244,225,0.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-196, -34); ctx.lineTo(-262, -6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(232, 78); ctx.lineTo(292, 104); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 150); ctx.lineTo(-26, 196); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 152); ctx.lineTo(30, 198); ctx.stroke();
    // golden-hour haze veil over the whole airframe
    jetHaze(-270, -150, 300, 210, 0.14, 0.06);
    ctx.fillStyle = 'rgba(255,175,95,0.05)'; ctx.fillRect(-270, -150, 570, 360);
    ctx.restore();
  }
  function drawJetHeadOn(cx, cy, s) {
    // Shot 3: straight head-on approach over the island strip. Nose points
    // at the camera (bottom = near), tail recedes up toward the runway
    // vanishing point. Gear down, flaps set, landing lights on: a descent,
    // not a flyby. Sea-fog veil matches the strip's low-visibility air.
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    // soft shadow on the runway below the jet: grounds it on the strip
    var sh = ctx.createRadialGradient(6, 138, 4, 6, 138, 190);
    sh.addColorStop(0, 'rgba(10,12,10,0.42)'); sh.addColorStop(1, 'rgba(10,12,10,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(6, 138, 190, 22, 0, 0, Math.PI * 2); ctx.fill();
    // tail (far end, top): vertical fin + stabilators, small and hazy
    var vg = ctx.createLinearGradient(-12, 0, 12, 0);
    vg.addColorStop(0, '#b4bdc6'); vg.addColorStop(1, '#333c45');
    jetPoly([[-11, -104], [-20, -146], [0, -158], [20, -146], [11, -104]], vg, 'rgba(255,200,130,0.7)', 1.5);
    // light tip cap on the fin
    jetPoly([[-6, -148], [0, -158], [6, -148], [4, -140], [-4, -140]], 'rgba(220,226,232,0.9)');
    jetPoly([[-16, -104], [-96, -84], [-108, -62], [-24, -80]], vg);
    jetPoly([[16, -104], [96, -84], [108, -62], [24, -80]], vg);
    // main wings, symmetric, cropped delta, flaps set
    var wg = ctx.createLinearGradient(0, -20, 0, 70);
    wg.addColorStop(0, '#aeb6bf'); wg.addColorStop(0.55, '#6d7780'); wg.addColorStop(1, '#383f47');
    jetPoly([[-34, -18], [-150, -6], [-216, 34], [-190, 62], [-70, 44], [-40, 18]], wg);
    jetPoly([[34, -18], [150, -6], [216, 34], [190, 62], [70, 44], [40, 18]], wg);
    // warm rim on the sun-side leading edges; dark shade on trailing edges
    ctx.strokeStyle = 'rgba(255,205,140,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, -18); ctx.lineTo(-150, -6); ctx.lineTo(-216, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, -18); ctx.lineTo(150, -6); ctx.lineTo(216, 34); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,26,34,0.35)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-216, 34); ctx.lineTo(-190, 62); ctx.lineTo(-70, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(216, 34); ctx.lineTo(190, 62); ctx.lineTo(70, 44); ctx.stroke();
    // flap lines + wingtip rails + wing-root shadow + panel lines
    ctx.strokeStyle = 'rgba(28,36,44,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-150, 8); ctx.lineTo(-186, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(150, 8); ctx.lineTo(186, 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-66, 30); ctx.lineTo(-160, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(66, 30); ctx.lineTo(160, 22); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,26,34,0.45)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-34, -18); ctx.lineTo(-40, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, -18); ctx.lineTo(40, 18); ctx.stroke();
    ctx.strokeStyle = 'rgba(28,36,44,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-90, -10); ctx.lineTo(-180, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90, -10); ctx.lineTo(180, 28); ctx.stroke();
    ctx.fillStyle = '#3a444e';
    ctx.fillRect(-222, 26, 12, 8); ctx.fillRect(210, 26, 12, 8);
    // underwing pylons
    ctx.fillStyle = '#3a444e';
    ctx.fillRect(-118, 14, 16, 7); ctx.fillRect(102, 14, 16, 7);
    // fuselage: wide at the near nose (bottom), narrowing to the far tail
    var fg = ctx.createLinearGradient(-44, 0, 44, 0);
    fg.addColorStop(0, '#c6cdd4'); fg.addColorStop(0.35, '#828c97');
    fg.addColorStop(0.7, '#4a545e'); fg.addColorStop(1, '#2f373f');
    ctx.beginPath(); ctx.moveTo(0, 80);
    ctx.quadraticCurveTo(-40, 62, -44, 30); ctx.quadraticCurveTo(-40, -40, -26, -96);
    ctx.quadraticCurveTo(-18, -112, -14, -116); ctx.lineTo(14, -116);
    ctx.quadraticCurveTo(18, -112, 26, -96); ctx.quadraticCurveTo(40, -40, 44, 30);
    ctx.quadraticCurveTo(40, 62, 0, 80); ctx.closePath();
    ctx.fillStyle = fg; ctx.fill();
    // spine highlight down the sun-lit centre
    var sp = ctx.createLinearGradient(0, -110, 0, 70);
    sp.addColorStop(0, 'rgba(255,240,210,0.05)'); sp.addColorStop(0.5, 'rgba(255,240,210,0.30)');
    sp.addColorStop(1, 'rgba(255,240,210,0.08)');
    ctx.fillStyle = sp; ctx.fillRect(-5, -108, 10, 176);
    // radome nose tip
    ctx.fillStyle = '#7c858f'; ctx.beginPath(); ctx.ellipse(0, 64, 21, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,130,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 64, 21, 14, 0, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
    // bubble canopy above the nose
    var cg = ctx.createLinearGradient(-13, -78, 13, -32);
    cg.addColorStop(0, '#c8d8e4'); cg.addColorStop(0.5, '#54748f'); cg.addColorStop(1, '#182a3a');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -56, 13, 23, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,60,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -56, 13, 23, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -72); ctx.lineTo(-1, -44); ctx.stroke();
    // chin intake under the nose
    jetPoly([[-12, 36], [12, 36], [8, 56], [-8, 56]], '#161c22', 'rgba(255,190,110,0.7)', 1.5);
    // landing gear down: nose leg + two mains, wheels + doors
    ctx.strokeStyle = '#1f262d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(0, 110); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-52, 52); ctx.lineTo(-58, 104); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52, 52); ctx.lineTo(58, 104); ctx.stroke();
    ctx.fillStyle = '#14181d';
    ctx.beginPath(); ctx.arc(0, 116, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-58, 110, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(58, 110, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa4ae';
    ctx.beginPath(); ctx.arc(0, 116, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-58, 110, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(58, 110, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,158,166,0.8)';
    ctx.fillRect(-8, 82, 6, 26); ctx.fillRect(-66, 60, 6, 30); ctx.fillRect(60, 60, 6, 30);
    // landing lights on the wing leading edges
    jetGlow(-120, 4, 26, 'rgba(255,255,240,A)', '0.55');
    jetGlow(120, 4, 26, 'rgba(255,255,240,A)', '0.55');
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath(); ctx.arc(-120, 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(120, 4, 4, 0, Math.PI * 2); ctx.fill();
    // wingtip nav lights
    jetGlow(-216, 34, 15, 'rgba(255,70,60,A)', '0.85');
    ctx.fillStyle = '#ff5040'; ctx.beginPath(); ctx.arc(-216, 34, 4, 0, Math.PI * 2); ctx.fill();
    jetGlow(216, 34, 15, 'rgba(80,255,140,A)', '0.85');
    ctx.fillStyle = '#4dff8c'; ctx.beginPath(); ctx.arc(216, 34, 4, 0, Math.PI * 2); ctx.fill();
    // sea-fog veil over the airframe (strip leg is low-visibility air)
    jetHaze(-240, -180, 240, 150, 0.11, 0.05);
    ctx.fillStyle = 'rgba(255,175,95,0.05)'; ctx.fillRect(-240, -180, 480, 330);
    ctx.fillStyle = 'rgba(230,238,244,0.06)'; ctx.fillRect(-240, -20, 480, 60);
    ctx.restore();
  }
  function weatherUnder(leg) {
    // fog / dusk veils go UNDER the runway overlay so the strip stays readable
    if (leg.fog > 0) {
      ctx.fillStyle = 'rgba(220,228,238,' + (leg.fog * 0.4) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (var i = 0; i < 5; i++) ctx.fillRect(0, 90 + i * 130, W, 34 + (i % 2) * 18);
    }
    if (leg.weather === 'dusk') {
      ctx.fillStyle = 'rgba(20,16,60,0.18)'; ctx.fillRect(0, 0, W, H);
    }
  }
  function weatherOver(leg) {
    // rain streaks stay OVER everything — rain is in the air, not behind the strip
    if (leg.weather === 'rain') {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 1.5;
      for (var i = 0; i < 90; i++) {
        var x = (i * 137 + S.time * 900) % (W + 40) - 20, y = (i * 89 + S.time * 1400) % (H + 40) - 20;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 26); ctx.stroke();
      }
    }
  }
  function drawCockpit() {
    // windshield frame + photographic instrument panel (Falcon-style lit gauges).
    // Called BEFORE the ring is drawn, so the glowing ring + its label stay on top
    // of the dashboard instead of being painted over by it.
    ctx.fillStyle = 'rgba(10,12,16,0.92)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 150); ctx.lineTo(180, 210); ctx.lineTo(0, H); ctx.lineTo(0, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, 150); ctx.lineTo(W - 180, 210); ctx.lineTo(W, H); ctx.lineTo(W, 0); ctx.fill();
    ctx.fillRect(0, 0, W, 26);
    // photographic dashboard with lit gauges (bottom 320 px of the frame)
    var pim = IMG['cockpit-panel'];
    if (pim && pim.naturalWidth) {
      ctx.drawImage(pim, 0, H - 320, W, 320);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(0, H - 320, W, 4);
      return;
    }
    // fallback if the panel image failed to load: dark dashboard + drawn dials
    var dy = H - 190;
    ctx.fillStyle = '#141a20'; ctx.fillRect(0, dy, W, 190);
    ctx.fillStyle = '#ffb347'; ctx.fillRect(0, dy, W, 4);
    var dials = [
      ['ALT', F.alt + ''], ['SPD', F.speed + ''], ['HDG', ('00' + F.hdg).slice(-3)],
      ['FUEL', Math.round(F.fuel) + ''], ['RPM', Math.round(1800 + F.throttle * 900) + ''], ['VSI', (F.py < 0 ? '+' : '') + Math.round(-F.py * 400) + ''],
    ];
    for (var i = 0; i < 6; i++) {
      var cx = 150 + i * 175, cy = dy + 92;
      ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0f14'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,179,71,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      // needle
      var ang = -Math.PI * 0.75 + (i === 0 ? clamp(F.alt / 3000, 0, 1) : i === 1 ? clamp(F.speed / 220, 0, 1) : i === 2 ? (F.hdg % 360) / 360 : i === 3 ? clamp(F.fuel / F.fuelMax, 0, 1) : i === 4 ? F.throttle : 0.5) * Math.PI * 1.5;
      ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44); ctx.stroke();
      ctx.fillStyle = '#7dffb0'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
      text(dials[i][0], cx, cy - 68, 13, '#ffb347', 'center', true);
      text(dials[i][1], cx, cy + 84, 17, '#ffffff', 'center', true);
    }
  }

  // ---------- people portraits (drawn, no emoji) ----------
  function drawPerson(p, x, y, w, h, showDialog) {
    panel(x, y, w, h, 'rgba(14,18,24,0.92)', 'rgba(255,196,110,0.5)');
    // portrait: photo headshot in a circle when one exists, else the drawn face
    var cx = x + 44, cy = y + 44;
    var pim = p.face ? IMG[p.face] : null;
    if (pim && pim.naturalWidth) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.clip();
      var iw = pim.naturalWidth, ih = pim.naturalHeight;
      // top-anchored cover fit: every portrait has the face in its upper half,
      // so pin the image top just above the circle top and let the shoulders
      // overflow below (clipped) — a tall portrait (long hair) keeps its face
      var s = 68 / iw;
      var dw = iw * s, dh = ih * s;
      ctx.drawImage(pim, cx - dw / 2, cy - 34, dw, dh);
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,196,110,0.65)'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410';
      ctx.beginPath(); ctx.arc(cx, cy - 8, 21, Math.PI, 0); ctx.fill(); // hair
      ctx.fillStyle = '#1c1410';
      ctx.beginPath(); ctx.arc(cx - 8, cy - 2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, cy - 2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a4a30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy + 4, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // shoulders
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(cx - 28, y + 86); ctx.quadraticCurveTo(cx, y + 62, cx + 28, y + 86); ctx.lineTo(cx + 28, y + 92); ctx.lineTo(cx - 28, y + 92); ctx.closePath(); ctx.fill();
    }
    text(p.name, x + 84, y + 30, 16, '#fff', 'left', true);
    text(p.role, x + 84, y + 50, 11.5, '#ffb347', 'left');
    text('Mood: ' + p.mood, x + 84, y + 68, 11.5, '#cfe0ea', 'left');
    if (showDialog) {
      ctx.fillStyle = 'rgba(255,244,214,0.95)';
      rr(x + 8, y + 96, w - 16, h - 104, 8); ctx.fill();
      ctx.fillStyle = '#3a2c14';
      ctx.font = '12.5px Verdana, sans-serif'; ctx.textAlign = 'left';
      wrapText('"' + p.dialog + '"', x + 18, y + 116, w - 36, 16);
    }
  }
  function wrapText(s, x, y, maxW, lh) {
    var words = s.split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var t = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = words[i]; y += lh; }
      else line = t;
    }
    if (line) ctx.fillText(line, x, y);
  }

  // ---------- buttons ----------
  function button(x, y, w, h, label, fn, accent) {
    buttons.push({ x: x, y: y, w: w, h: h, fn: fn });
    var hov = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    ctx.fillStyle = accent ? (hov ? '#ff9d2e' : '#e07f1a') : (hov ? '#3a4a58' : '#232f3c');
    rr(x, y, w, h, 8); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = accent ? '#ffd9a0' : 'rgba(255,196,110,0.5)'; ctx.stroke();
    fitText(label, x + 10, y + h / 2 + 6, 16, '#fff', w - 20, true);
    ctx.textAlign = 'center';
  }

  // ---------- screens ----------
  function drawTitle() {
    drawBG('bg-archipelago');
    ctx.fillStyle = 'rgba(10,8,4,0.35)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(8,10,14,0.55)'; ctx.fillRect(0, 0, W, 46);
    text('MAKE.FUN · BEST FLIGHT GAME · $500 POT · TOP 50 PAY', 18, 30, 15, '#ffd9a0', 'left', true);
    text('ROUND 1 CLOSES 21:57 WIT', W - 18, 30, 15, '#ffe9c4', 'right', true);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff9d2e'; ctx.shadowBlur = 26;
    text('SKY COURIER', W / 2, 132, 84, '#fff3d0', 'center', true);
    ctx.shadowBlur = 0;
    text('Golden-hour archipelago ring-run  ·  bush-pilot courier', W / 2, 168, 20, '#ffe9c4', 'center');
    // pilot card
    panel(W / 2 - 330, 190, 660, 96, 'rgba(12,16,22,0.88)');
    drawPerson({ name: 'RAKA "Merpati"', role: 'Bush pilot · home strip Pulau Kenari', mood: 'Ready', color: '#c65a1e', skin: '#c98d5f', dialog: '' }, W / 2 - 318, 198, 636, 80, false);
    text('Raka keeps the archipelago connected — medicine, post, coffee, fish — one ring-gated leg at a time.', W / 2, 312, 15, '#e8f0f6', 'center');
    text('Fly through the glowing rings. Chain them for combo x2.5. Land before the fuel runs out.', W / 2, 336, 15, '#ffd9a0', 'center');
    // save slots
    text('CHOOSE A SAVE SLOT — click to fly', W / 2, 392, 17, '#fff', 'center', true);
    for (var i = 0; i < 3; i++) {
      var x = W / 2 - 330 + i * 226, slot = i + 1;
      var has = false; try { has = !!localStorage.getItem(saveKey(slot)); } catch (e) {}
      panel(x, 408, 208, 108, has ? 'rgba(20,32,24,0.92)' : 'rgba(12,16,22,0.88)');
      text('SLOT ' + slot, x + 104, 440, 18, '#ffd9a0', 'center', true);
      text(has ? 'Saved game — continue' : 'New pilot career', x + 104, 468, 13, '#dfe9f2', 'center');
      text(has ? 'Credits + route kept' : '120 credits · 6 legs', x + 104, 490, 12, '#9fb2c2', 'center');
      buttons.push({ x: x, y: 408, w: 208, h: 108, fn: (function (s) { return function () { S.slot = s; loadGame(s); S.screen = 'base'; blip(); }; })(slot) });
    }
    text('KEYBOARD: arrows / WASD steer + throttle  ·  C: cockpit / chase  ·  MOUSE: click every button', W / 2, 556, 14, '#dfe9f2', 'center');
    text('6 legs · 6 upgrades · 5 islanders + Inspector Halim · weather that fights back', W / 2, 582, 14, '#ffb347', 'center');
    ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fillRect(0, H - 40, W, 40);
    text('Original game · art + music made for this entry · WebAudio synth, no downloads', W / 2, H - 14, 13, '#cfe0ea', 'center');
    ctx.textAlign = 'left';
  }
  function drawBase() {
    drawBG('bg-hangar');
    ctx.fillStyle = 'rgba(10,8,4,0.42)'; ctx.fillRect(0, 0, W, H);
    drawTopBar('HOME BASE · PULAU KENARI STRIP', 'CREDITS ' + S.credits + ' cr   ·   SLOT ' + S.slot + '   ·   SCORE ' + totalScore());
    // left: route map
    panel(12, 60, 330, 420, 'rgba(12,16,22,0.92)');
    text('ROUTE MAP — 6 LEGS', 28, 88, 16, '#ffd9a0', 'left', true);
    var rx = 52;
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rx, 108); ctx.lineTo(rx, 440); ctx.stroke();
    for (var i = 0; i < 6; i++) {
      var ly = 118 + i * 56, leg = LEGS[i];
      ctx.fillStyle = S.legDone[i] ? '#4ade80' : (nextLeg() === i + 1 ? '#ffb347' : '#5a6a78');
      ctx.beginPath(); ctx.arc(rx, ly, 13, 0, Math.PI * 2); ctx.fill();
      text('' + (i + 1), rx, ly + 5, 13, '#0a0f14', 'center', true);
      text(leg.name, rx + 26, ly - 2, 14.5, '#fff', 'left', true);
      text(leg.sub + (S.legDone[i] ? '  ·  ' + S.legGrade[i] + ' · ' + S.legScore[i] + ' pts' : '  ·  pay ' + leg.pay + ' cr'), rx + 26, ly + 16, 11, S.legDone[i] ? '#7dffb0' : '#cfe0ea', 'left');
      if (nextLeg() === i + 1 && !S.legDone[i]) {
        buttons.push({ x: rx + 26, y: ly - 14, w: 190, h: 40, fn: (function (n) { return function () { S.selectedLeg = n; startLeg(n); }; })(i + 1) });
      }
    }
    text('Click the next leg to fly it.', 28, 468, 12, '#9fb2c2', 'left');
    // centre: people
    panel(354, 60, 500, 420, 'rgba(12,16,22,0.92)');
    text('THE ISLANDERS — they are waiting on you', 370, 88, 16, '#ffd9a0', 'left', true);
    var pw = 238, ph = 168;
    for (var j = 0; j < 4; j++) {
      drawPerson(PEOPLE[j], 366 + (j % 2) * 248, 100 + Math.floor(j / 2) * 178, pw, ph, true);
    }
    // bottom strip: Lina + Halim + log
    panel(12, 492, 842, 168, 'rgba(12,16,22,0.92)');
    drawPerson(PEOPLE[4], 24, 504, 280, 144, true);
    drawPerson(PEOPLE[5], 316, 504, 280, 144, true);
    text('PILOT LOG', 616, 528, 14, '#ffb347', 'left', true);
    var logs = S.log.slice(-5);
    for (var li = 0; li < logs.length; li++) fitText('· ' + logs[li], 616, 550 + li * 20, 12, '#dfe9f2', 226, false);
    // right: shop
    panel(866, 60, 402, 600, 'rgba(12,16,22,0.92)');
    text('HANGAR SHOP — upgrades', 882, 88, 16, '#ffd9a0', 'left', true);
    text('Bought with leg pay. They change how the plane flies.', 882, 108, 11.5, '#9fb2c2', 'left');
    for (var u = 0; u < UPGRADES.length; u++) {
      var up = UPGRADES[u], uy = 122 + u * 76;
      ctx.fillStyle = hasUp(up.id) ? 'rgba(32,64,40,0.9)' : 'rgba(24,32,42,0.9)';
      rr(882, uy, 370, 66, 8); ctx.fill();
      ctx.strokeStyle = hasUp(up.id) ? '#4ade80' : 'rgba(255,196,110,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      text(up.name, 896, uy + 24, 15, '#fff', 'left', true);
      text(up.desc, 896, uy + 46, 11.5, '#cfe0ea', 'left');
      if (hasUp(up.id)) text('OWNED ✓', 1238, uy + 30, 14, '#7dffb0', 'right', true);
      else {
        text(up.cost + ' cr', 1238, uy + 30, 15, S.credits >= up.cost ? '#ffd9a0' : '#ff8a7a', 'right', true);
        buttons.push({ x: 882, y: uy, w: 370, h: 66, fn: (function (id, cost) { return function () { buyUpgrade(id, cost); }; })(up.id, up.cost) });
      }
    }
    text('Radio forecast: ' + (hasUp('radio') ? 'squalls on legs 5–6, fog on 3 & 6' : 'buy the Radio Set to see squalls early'), 882, 596, 11.5, '#ffb347', 'left');
    // bottom buttons
    button(866, 668, 130, 40, 'FLY LEG ' + nextLeg(), function () { startLeg(nextLeg()); }, true);
    button(1004, 668, 130, 40, 'SAVE', function () { saveGame(); S.log.push('Progress saved to slot ' + S.slot + '.'); blip(); });
    button(1142, 668, 126, 40, 'TITLE', function () { S.screen = 'title'; });
    ctx.fillStyle = 'rgba(8,10,14,0.7)'; ctx.fillRect(12, 668, 842, 40);
    text('Parcels aboard next leg: ' + (LEGS[nextLeg() - 1].cargo + (hasUp('rack') ? 2 : 0)) + '  ·  Floats: ' + (hasUp('floats') ? 'lagoon strip OPEN' : 'not fitted') + '  ·  Engine: ' + (hasUp('engine') ? 'upgraded' : 'stock'), 26, 693, 13, '#dfe9f2', 'left');
  }
  function buyUpgrade(id, cost) {
    if (hasUp(id)) return false;
    if (S.credits < cost) { S.log.push('Not enough credits for ' + id + ' (' + cost + ' cr). Fly a leg first.'); return false; }
    S.credits -= cost; S.upgrades[id] = true;
    var up = null; for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) up = UPGRADES[i];
    S.log.push('Bought ' + (up ? up.name : id) + ' for ' + cost + ' cr.');
    bell(); saveGame(); return true;
  }
  function drawFlight() {
    var leg = LEGS[F.leg - 1];
    // Photo pass (shots 2-3): the scene photo already contains the jet, so it
    // IS the background — no vector jet is drawn on top of it. Live play
    // (SHOT 0) keeps the original leg backgrounds untouched.
    if (SHOT === 2) drawBG('bg-canyon-jet');
    else if (SHOT === 3) drawBG('bg-strip-jet');
    else drawBG(leg.bg);
    weatherUnder(leg);
    // runway strip visible on approach legs — not for staged shot 3, where
    // the photo itself is the island strip (an overlay would wash it out)
    if (F.progress > 82 && SHOT !== 3) {
      var im = IMG['bg-strip'];
      if (im && im.naturalWidth) {
        ctx.save(); ctx.globalAlpha = clamp((F.progress - 82) / 18, 0, 1) * 0.85;
        ctx.drawImage(im, 0, 0, W, H); ctx.restore();
      }
    }
    // cockpit panel goes UNDER the ring: the photo dashboard owns the bottom
    // of the frame, the glowing ring + its label must stay on top of it
    if (S.view === 'cockpit') drawCockpit();
    // next ring ahead (nearest unpassed)
    var next = null;
    for (var i = 0; i < F.rings.length; i++) if (F.rings[i].hit === null) { next = F.rings[i]; break; }
    if (next) {
      var z = Math.max(0.06, (next.d - F.progress) / 30);
      drawRing(next, F.px, F.py, clamp(1.6 - z, 0.35, 1.5), clamp(1.2 - z * 0.5, 0.35, 1));
    }
    if (S.view === 'chase') {
      // staged shots 2-3: the jet is already in the photo — drawing the old
      // vector jet on top would put a flat drawing over a photograph, so
      // draw nothing here; live play keeps the original sprite untouched
      if (SHOT === 2 || SHOT === 3) { /* jet in photo */ }
      else drawPlaneSprite(W / 2, H - 210, 500, F.bank);
    }
    weatherOver(leg);
    drawHUD();
    // low-fuel warning
    if (F.fuel < 25) {
      ctx.fillStyle = 'rgba(120,10,10,0.85)'; rr(W / 2 - 190, 170, 380, 44, 8); ctx.fill();
      text('⚠ LOW FUEL — LAND SOON', W / 2, 198, 18, '#fff', 'center', true);
    }
    if (F.progress >= 96) {
      ctx.fillStyle = 'rgba(8,12,16,0.85)'; rr(W / 2 - 260, 220, 520, 52, 8); ctx.fill();
      text('RUNWAY AHEAD — FLY THE FINAL RING AND LAND', W / 2, 253, 16, '#ffd9a0', 'center', true);
    }
    if (S.view === 'cockpit') {
      // dashboard owns the bottom — buttons sit just under the top strip instead
      button(12, 166, 150, 34, 'VIEW: COCKPIT (C)', function () { S.view = 'chase'; });
      button(W - 162, 166, 150, 34, 'ABORT LEG', function () { S.screen = 'base'; });
    } else {
      button(12, H - 118, 150, 34, 'VIEW: CHASE (C)', function () { S.view = 'cockpit'; });
      button(W - 162, H - 118, 150, 34, 'ABORT LEG', function () { S.screen = 'base'; });
    }
  }
  function drawResults() {
    drawBG('bg-strip');
    ctx.fillStyle = 'rgba(10,8,4,0.5)'; ctx.fillRect(0, 0, W, H);
    drawTopBar('LEG ' + F.leg + ' COMPLETE · ' + LEGS[F.leg - 1].name, 'TOTAL SCORE ' + totalScore());
    panel(W / 2 - 420, 70, 840, 560, 'rgba(12,16,22,0.94)');
    text('DELIVERED!', W / 2, 140, 44, '#7dffb0', 'center', true);
    text('GRADE', W / 2, 200, 18, '#ffb347', 'center', true);
    ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 24;
    text(F.grade || 'A', W / 2, 300, 110, '#ffd27a', 'center', true);
    ctx.shadowBlur = 0;
    text('Rings ' + F.hits + '/' + F.rings.length + '  ·  Combo best x' + F.combo.toFixed(2) + '  ·  Earned +' + (F.earned || 0) + ' cr  ·  Credits ' + S.credits, W / 2, 330, 16, '#fff', 'center');
    // per-leg score graph
    text('SCORE BY LEG', W / 2 - 360, 372, 15, '#ffb347', 'left', true);
    var maxS = 1; for (var i = 0; i < 6; i++) maxS = Math.max(maxS, S.legScore[i]);
    for (var j = 0; j < 6; j++) {
      var bx = W / 2 - 360 + j * 128, bh = Math.round((S.legScore[j] / maxS) * 110);
      ctx.fillStyle = S.legDone[j] ? '#ffb347' : '#2c3844';
      ctx.fillRect(bx, 480 - bh, 96, bh);
      text('L' + (j + 1), bx + 48, 502, 14, '#fff', 'center', true);
      text(S.legDone[j] ? (S.legGrade[j] + ' · ' + S.legScore[j]) : '—', bx + 48, 524, 12, '#dfe9f2', 'center');
    }
    text(LEGS[F.leg - 1].cargoName + ' delivered. ' + (F.leg === 6 ? 'Inspector Halim signs the route licence — the archipelago is yours, Raka!' : PEOPLE[F.leg % 5].name + ': "' + PEOPLE[F.leg % 5].dialog + '"'), W / 2, 560, 14, '#ffe9c4', 'center');
    var nl = nextLeg();
    if (S.legDone.every(function (d) { return d; })) {
      text('ALL 6 LEGS FLOWN — ROUTE COMPLETE!', W / 2, 590, 16, '#7dffb0', 'center', true);
      button(W / 2 - 130, 600, 260, 40, 'BACK TO BASE', function () { S.screen = 'base'; }, true);
    } else {
      button(W / 2 - 270, 600, 260, 40, 'FLY LEG ' + nl, function () { startLeg(nl); }, true);
      button(W / 2 + 10, 600, 260, 40, 'BACK TO BASE', function () { S.screen = 'base'; });
    }
  }
  function drawGameOver() {
    drawBG('bg-rain');
    ctx.fillStyle = 'rgba(10,8,4,0.55)'; ctx.fillRect(0, 0, W, H);
    panel(W / 2 - 380, 150, 760, 380, 'rgba(16,10,10,0.95)', 'rgba(255,90,74,0.7)');
    text('LEG FAILED', W / 2, 220, 48, '#ff6a5a', 'center', true);
    ctx.font = '16px Verdana, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9c4';
    wrapText(F.failReason || 'The leg did not go as planned.', W / 2 - 320, 270, 640, 22);
    text('Leg ' + F.leg + ' · ' + LEGS[F.leg - 1].name + '  ·  Rings ' + F.hits + '/' + F.rings.length + '  ·  Score ' + F.score, W / 2, 330, 15, '#dfe9f2', 'center');
    text('Mira is still waiting at Karang clinic. Refuel, re-check the rings, and go again.', W / 2, 360, 14, '#ffb347', 'center');
    text('TIP: buy the Larger Fuel Tank and Better Instruments in the hangar shop.', W / 2, 386, 13, '#9fb2c2', 'center');
    button(W / 2 - 270, 440, 260, 44, 'RETRY LEG ' + F.leg, function () { startLeg(F.leg); }, true);
    button(W / 2 + 10, 440, 260, 44, 'BACK TO BASE', function () { S.screen = 'base'; });
    ctx.textAlign = 'left';
  }

  // ---------- main loop ----------
  var last = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts; S.time += dt;
    buttons = [];
    ctx.clearRect(0, 0, W, H);
    if (S.screen === 'title') drawTitle();
    else if (S.screen === 'base') drawBase();
    else if (S.screen === 'flight') { updateFlight(dt); drawFlight(); }
    else if (S.screen === 'results') drawResults();
    else if (S.screen === 'gameover') drawGameOver();
    var st = document.getElementById('status');
    if (st) st.textContent = 'SKY COURIER — ' + S.screen + (F ? ' leg ' + F.leg + ' score ' + F.score : '');
    if (!SHOT) requestAnimationFrame(frame);
  }
  function renderShot(n) {
    // deterministic staged renders from the game code itself
    function markRings(n) { for (var i = 0; i < n && i < F.rings.length; i++) F.rings[i].hit = true; }
    if (n === 1) {
      S.screen = 'flight'; S.view = 'cockpit';
      startLeg(1); F.progress = 34; F.px = 0.05; F.py = -0.05; F.fuel = 78; F.score = 340; F.combo = 1.75; F.comboHits = 3; F.hits = 3; F.speed = 132; F.alt = 1480; F.msg = 'RING! +175 · COMBO x1.75'; F.msgT = 9; markRings(3);
    } else if (n === 2) {
      S.screen = 'flight'; S.view = 'chase';
      startLeg(2); F.progress = 52; F.px = -0.28; F.py = 0.12; F.bank = 0; F.fuel = 64; F.score = 520; F.combo = 2.0; F.comboHits = 4; F.hits = 4; F.speed = 146; F.alt = 2100; F.msg = 'RING! +200 · COMBO x2.00'; F.msgT = 9; markRings(4);
    } else if (n === 3) {
      S.screen = 'flight'; S.view = 'chase';
      startLeg(3); F.progress = 93; F.px = 0.1; F.py = 0.05; F.fuel = 41; F.score = 690; F.combo = 1.5; F.comboHits = 2; F.hits = 5; F.speed = 118; F.alt = 900; F.msg = 'RUNWAY AHEAD — final ring!'; F.msgT = 9; markRings(5);
    } else {
      S.screen = 'base'; S.credits = 342;
      S.upgrades = { engine: true, radio: true }; S.legDone = [true, true, false, false, false, false];
      S.legScore = [412, 388, 0, 0, 0, 0]; S.legGrade = ['A', 'B', '', '', '', ''];
      S.log = ['Leg 1: delivered! Grade A, +502 cr.', 'Leg 2: delivered! Grade B, +478 cr.', 'Bought Bigger Engine for 150 cr.', 'Bought Radio Set for 90 cr.', 'Bu Sari: "Fish is loaded, fly fast!"'];
    }
    buttons = [];
    ctx.clearRect(0, 0, W, H);
    if (S.screen === 'flight') drawFlight();
    else drawBase();
    if (typeof window !== 'undefined') window.__shotDone = true;
  }

  // ---------- input ----------
  function keyName(e) { return (e.key || '').toLowerCase(); }
  document.addEventListener('keydown', function (e) {
    keys[keyName(e)] = true; audio(); startMusic();
    if (keyName(e) === 'c' && S.screen === 'flight') S.view = S.view === 'chase' ? 'cockpit' : 'chase';
    if (keyName(e) === 'enter' && S.screen === 'title') { S.slot = 1; loadGame(1); S.screen = 'base'; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(keyName(e)) >= 0) e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { keys[keyName(e)] = false; });
  function canvasPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }
  canvas.addEventListener('click', function (e) {
    audio(); startMusic();
    var p = canvasPos(e); mouse = p;
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); return; }
    }
  });
  canvas.addEventListener('mousemove', function (e) { mouse = canvasPos(e); });

  // ---------- boot / test API ----------
  window.SC = {
    S: S, LEGS: LEGS, UPGRADES: UPGRADES, PEOPLE: PEOPLE,
    startLeg: startLeg, buyUpgrade: buyUpgrade, saveGame: saveGame, loadGame: loadGame,
    imagesReady: imagesReady, renderShot: renderShot,
    getF: function () { return F; },
    setKeys: function (k) { keys = k; },
    tick: function (dt) { updateFlight(dt); },
    frameStep: function (ts) { frame(ts || 0); },
    clickAt: function (x, y) {
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return true; }
      }
      return false;
    },
    screen: function () { return S.screen; },
  };
  if (SHOT) {
    var tries = 0;
    var wait = setInterval(function () {
      tries++;
      if (imagesReady() || tries > 200) { clearInterval(wait); renderShot(SHOT); }
    }, 25);
  } else {
    requestAnimationFrame(frame);
  }
})();
