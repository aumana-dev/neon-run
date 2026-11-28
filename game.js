
    const $ = s => document.querySelector(s), layer = $('#layer'), card = $('#card');
    const RUN = ['🐸', '👟', '🎧'], FORMAL = ['🪫', '📵', '🛋️'], T = 25;
    let S, raf, last, spawnT, gameMode = 'reflex', selectedPlayers = 1;
    let echoSequence = [], echoInput = [], echoRound = 0, echoLocked = true;
    let echoImage, echoCountTimer;
    const echoTones = [392, 440, 494, 587, 659, 784];
    const bestKeys = { reflex: 'nr_best_reflex', echo: 'nr_best_echo' };
    const best = { reflex: 0, echo: 0 };
    Object.keys(bestKeys).forEach(mode => {
      try {
        const saved = localStorage.getItem(bestKeys[mode]);
        if (saved !== null) {
          const score = Number(saved);
          if (saved.trim() && Number.isSafeInteger(score) && score >= 0) best[mode] = score;
          else console.error('Récord guardado inválido para ' + mode, saved);
        }
      } catch (error) {
        console.error('No se pudo leer el récord de ' + mode, error);
      }
    });
    function setBest() { $('#best').textContent = best.reflex; $('#echo-best').textContent = best.echo; $('#best2').textContent = best[gameMode] }
    function updateBest(mode, score) {
      if (score <= best[mode]) return;
      best[mode] = score;
      try { localStorage.setItem(bestKeys[mode], score) }
      catch (error) { console.error('No se pudo guardar el récord de ' + mode, error) }
    }
    setBest();
    function show(id) {
      ['mode-select', 'start', 'echo-intro', 'echo-game', 'reflex-game', 'count', 'over'].forEach(k => $('#' + k).classList.toggle('on', k === id));
      $('#mute').hidden = id !== 'mode-select';
      card.classList.toggle('is-reflex', gameMode === 'reflex' && !['mode-select', 'echo-intro', 'echo-game'].includes(id));
      card.classList.toggle('is-echo-intro', id === 'echo-intro');
      card.classList.toggle('is-echo-game', id === 'echo-game');
      card.classList.toggle('is-countdown', id === 'count');
      card.classList.toggle('is-over', id === 'over');
      card.classList.toggle('is-menu', ['mode-select', 'echo-intro'].includes(id));
    }
    function chooseMode(mode) {
      gameMode = mode;
      setBest();
      $('#game-tag').textContent = mode === 'echo' ? 'ECO KÖLBI' : 'KÖLBI REFLEJOS';
      document.querySelectorAll('.mode-option').forEach(button => button.setAttribute('aria-pressed', String(button.id === 'choose-' + mode)));
      show(mode === 'echo' ? 'echo-intro' : 'start');
    }
    const mult = () => S.streak >= 6 ? 3 : S.streak >= 3 ? 2 : 1;
    function hud() {
      $('#sc').textContent = S.score; $('#lv').textContent = S.level; $('#mu').textContent = mult();
      if (S.mode === 'echo') {
        $('#echo-score').textContent = String(S.score).padStart(5, '0');
      }
      $('#tm').textContent = S.mode === 'echo' ? '∞' : Math.max(0, Math.ceil(S.t)) + ' s'; $('#bar').style.width = S.mode === 'echo' ? '100%' : Math.max(0, S.t / T * 100) + '%';
      $('#lives').hidden = S.mode === 'echo';
      $('#lives').innerHTML = [0, 1, 2].map(i => '<span class="' + (i < S.lives ? '' : 'off') + '">♥</span>').join('');
    }
    function prepareEchoImage() {
      if (echoImage) return Promise.resolve();
      const image = new Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('No se pudo cargar la imagen de Eco kölbi'));
      });
      image.src = 'assets/caras-kolbi-transparent.png';
      return loaded.then(() => typeof image.decode === 'function' ? image.decode() : undefined).then(() => { echoImage = image });
    }
    function startEchoCountdown(session) {
      let n = 3;
      const next = () => requestAnimationFrame(() => {
        if (S !== session) return;
        if (n > 0) {
          $('#cnum').textContent = n--;
          $('#cnum').hidden = false;
          sfx.tick();
          echoCountTimer = setTimeout(next, 800);
        } else {
          show(null); sfx.go(); run();
        }
      });
      next();
    }
    function renderReflexBoards(playerCount, names) {
      const arenas = $('#reflex-arenas');
      arenas.classList.toggle('duel', playerCount === 2);
      arenas.replaceChildren();
      for (let player = 0; player < playerCount; player++) {
        const arena = document.createElement('section');
        arena.className = 'reflex-arena';
        arena.dataset.player = String(player + 1);
        const label = document.createElement('div');
        label.className = 'reflex-player-label';
        label.textContent = names[player];
        label.setAttribute('aria-live', 'polite');
        const grid = document.createElement('div');
        grid.className = 'reflex-grid';
        grid.setAttribute('aria-label', 'Tablero de 21 objetivos');
        for (let index = 0; index < 21; index++) {
          const target = document.createElement('button');
          target.className = 'reflex-target';
          target.type = 'button';
          target.setAttribute('aria-label', 'Círculo ' + (index + 1));
          target.addEventListener('pointerdown', event => {
            if (!event.isPrimary) return;
            event.preventDefault();
            hitReflexTarget(player, index);
          });
          target.addEventListener('click', event => {
            if (event.detail === 0) hitReflexTarget(player, index);
          });
          grid.appendChild(target);
        }
        const score = document.createElement('div');
        score.className = 'reflex-score';
        score.innerHTML = '<span>PUNTOS</span><strong id="reflex-score-' + player + '">00000</strong>';
        arena.append(label, grid, score);
        arenas.appendChild(arena);
      }
    }
    function updateReflexClock() {
      const seconds = Math.max(0, Math.ceil(S.t));
      $('#reflex-time').textContent = String(seconds).padStart(2, '0');
      $('#reflex-time').classList.toggle('urgent', seconds <= 10);
    }
    function reflexIndex(excluded) {
      const available = Array.from({ length: 21 }, (_, index) => index).filter(index => !excluded.includes(index));
      return available[Math.floor(Math.random() * available.length)];
    }
    function activateReflexTarget(player, previousIndex = -1) {
      if (!S?.running || S.mode !== 'reflex') return;
      const arena = document.querySelector('.reflex-arena[data-player="' + (player + 1) + '"]');
      const index = reflexIndex([previousIndex, S.hazards[player]]);
      const target = arena.querySelectorAll('.reflex-target')[index];
      S.targets[player] = index;
      target.classList.add('lit');
      tone(player === 0 ? 740 : 620, .09, 'sine', .12);
    }
    function removeReflexHazard(player, arena) {
      const index = S.hazards[player];
      if (index < 0) return;
      const target = arena.querySelectorAll('.reflex-target')[index];
      target.classList.remove('hazard');
      target.setAttribute('aria-label', 'Círculo ' + (index + 1));
      S.hazards[player] = -1;
      S.hazardNext[player] = S.t - (1.5 + Math.random() * 1.5);
    }
    function updateReflexHazards() {
      for (let player = 0; player < S.playerCount; player++) {
        if (S.reflexLevels[player] < 2) continue;
        const arena = document.querySelector('.reflex-arena[data-player="' + (player + 1) + '"]');
        const label = arena.querySelector('.reflex-player-label');
        if (label.classList.contains('level-notice') && S.t <= S.noticeUntil[player]) {
          label.textContent = S.names[player];
          label.classList.remove('level-notice');
        }
        if (S.t > S.hazardNext[player]) continue;
        if (S.hazards[player] >= 0) {
          removeReflexHazard(player, arena);
        } else {
          const index = reflexIndex([S.targets[player]]);
          const target = arena.querySelectorAll('.reflex-target')[index];
          S.hazards[player] = index;
          S.hazardNext[player] = S.t - 2.5;
          target.classList.add('hazard');
          target.setAttribute('aria-label', 'Círculo ' + (index + 1) + ', obstáculo: no tocar');
        }
      }
    }
    function hitReflexTarget(player, index) {
      if (!S?.running || S.mode !== 'reflex') return;
      const arena = document.querySelector('.reflex-arena[data-player="' + (player + 1) + '"]');
      if (S.targets[player] !== index) {
        if (S.hazards[player] === index) {
          S.scores[player] = Math.max(0, S.scores[player] - 150);
          $('#reflex-score-' + player).textContent = String(S.scores[player]).padStart(5, '0');
          removeReflexHazard(player, arena);
        }
        S.misses[player]++;
        S.streaks[player] = 0;
        arena.classList.add('miss');
        setTimeout(() => arena.classList.remove('miss'), 240);
        sfx.bad();
        return;
      }
      arena.querySelectorAll('.reflex-target')[index].classList.remove('lit');
      S.targets[player] = -1;
      S.scores[player] += 100;
      S.hits[player]++;
      S.streaks[player]++;
      S.maxStreaks[player] = Math.max(S.maxStreaks[player], S.streaks[player]);
      $('#reflex-score-' + player).textContent = String(S.scores[player]).padStart(5, '0');
      sfx.ok(S.streaks[player]);
      if (S.reflexLevels[player] === 1 && S.scores[player] >= 1000) {
        S.reflexLevels[player] = 2;
        S.hazardNext[player] = S.t - 1.5;
        S.noticeUntil[player] = S.t - 2.5;
        const label = arena.querySelector('.reflex-player-label');
        label.textContent = 'NIVEL 2 · EVITA LA X';
        label.classList.add('level-notice');
        sfx.lvl();
      }
      const session = S;
      setTimeout(() => { if (S === session) activateReflexTarget(player, index) }, 120);
    }
    function start(players = selectedPlayers) {
      if (S) S.running = false;
      cancelAnimationFrame(raf);
      clearTimeout(bgTimer);
      clearTimeout(echoCountTimer);
      selectedPlayers = players;
      if (gameMode === 'reflex') {
        S = {
          score: 0, lives: 3, streak: 0, maxS: 0, errs: 0,
          t: 45, level: 1, items: [], running: false, mode: 'reflex', playerCount: players,
          names: Array.from({ length: players }, (_, index) => 'JUGADOR ' + (index + 1)),
          scores: Array(players).fill(0), targets: Array(players).fill(-1),
          reflexLevels: Array(players).fill(1), hazards: Array(players).fill(-1),
          hazardNext: Array(players).fill(0), noticeUntil: Array(players).fill(0),
          hits: Array(players).fill(0), misses: Array(players).fill(0), streaks: Array(players).fill(0), maxStreaks: Array(players).fill(0)
        };
        renderReflexBoards(players, S.names);
      } else {
        S = { score: 0, lives: gameMode === 'echo' ? 1 : 3, streak: 0, maxS: 0, hits: 0, errs: 0, t: gameMode === 'echo' ? Infinity : T, level: 1, items: [], running: false, mode: gameMode };
      }
      echoSequence = []; echoInput = []; echoRound = 0; echoLocked = true;
      $('#echo-feedback').textContent = '';
      document.querySelectorAll('.echo-pad.lit').forEach(pad => pad.classList.remove('lit'));
      layer.innerHTML = ''; hud(); show('count');
      $('#count-retry').hidden = true;
      $('#count-back').hidden = S.mode !== 'echo';
      if (S.mode === 'echo') {
        const session = S;
        $('#cnum').hidden = true;
        $('#count-status').textContent = 'Preparando imágenes y sonido…';
        const audioReady = muted ? Promise.resolve() : ac();
        Promise.all([prepareEchoImage(), audioReady]).then(() => {
          if (S !== session || muted) return;
          return ac();
        }).then(() => {
          if (S !== session) return;
          $('#count-status').textContent = 'Prepara tu memoria';
          $('#count-back').hidden = true;
          startEchoCountdown(session);
        }).catch(error => {
          if (S !== session) return;
          console.error('No se pudo preparar Eco kölbi', error);
          $('#count-status').textContent = 'No se pudo cargar la partida. Revisa las imágenes o el sonido e intenta de nuevo.';
          $('#count-retry').hidden = false;
        });
        return;
      }
      $('#cnum').hidden = false;
      $('#count-status').textContent = 'Prepara tus reflejos';
      ac().catch(error => console.error('No se pudo iniciar el sonido', error)); sfx.tick();
      let n = 3; $('#cnum').textContent = n;
      const iv = setInterval(() => { n--; if (n <= 0) { clearInterval(iv); show(null); sfx.go(); run() } else { $('#cnum').textContent = n; sfx.tick() } }, 800);
    }
    function run() {
      S.running = true;
      if (S.mode === 'reflex') {
        show('reflex-game');
        updateReflexClock();
        for (let player = 0; player < S.playerCount; player++) activateReflexTarget(player);
        last = performance.now();
        beat = 0; bgLoop();
        raf = requestAnimationFrame(loop);
        return;
      }
      if (S.mode === 'echo') { show('echo-game'); echoNextRound() }
      last = performance.now(); spawnT = 0; beat = 0; bgLoop(); raf = requestAnimationFrame(loop);
    }
    function banner(t) { const b = $('#banner'); b.textContent = t; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go') }
    function spawn(W) {
      const run = Math.random() < .6, pool = run ? RUN : FORMAL, el = document.createElement('button');
      el.className = 'it'; el.textContent = pool[Math.floor(Math.random() * 3)];
      const it = { el, x: 8 + Math.random() * (W - 80), y: -70, k: .85 + Math.random() * .3, run, ph: Math.random() * 6, dead: false };
      el.addEventListener('pointerdown', e => { e.preventDefault(); hit(it) });
      layer.appendChild(el); S.items.push(it);
    }
    function pop(txt, x, y, c) { const p = document.createElement('div'); p.className = 'pop ' + c; p.textContent = txt; p.style.left = x + 'px'; p.style.top = (y + 118) + 'px'; card.appendChild(p); setTimeout(() => p.remove(), 700) }
    function hit(it) {
      if (!S.running || it.dead) return; it.dead = true; it.el.remove(); S.items = S.items.filter(i => i !== it);
      const cx = it.x + 16, cy = it.y;
      if (it.run) { const m = mult(); S.streak++; S.maxS = Math.max(S.maxS, S.streak); S.hits++; S.score += 100 * m; sfx.ok(S.streak); pop('+' + 100 * m, cx, cy, 'ok') }
      else {
        S.score = Math.max(0, S.score - 150); S.lives--; S.errs++; S.streak = 0; sfx.bad(); pop('−150', cx, cy, 'bad');
        card.classList.add('hurt'); setTimeout(() => card.classList.remove('hurt'), 300); if (navigator.vibrate) navigator.vibrate(60);
        if (S.lives <= 0) { hud(); end(); return }
      }
      hud();
    }
    function echoNextRound() {
      if (!S?.running || S.mode !== 'echo') return;
      const session = S;
      echoRound++; echoSequence.push(Math.floor(Math.random() * 6)); echoInput = []; echoLocked = true;
      $('#echo-status').textContent = 'Ronda ' + echoRound + ' · Observa';
      let step = 0;
      const playStep = () => {
        if (S !== session || !session.running) return;
        if (step >= echoSequence.length) { echoLocked = false; $('#echo-status').textContent = 'Tu turno · ' + echoRound + ' pulsos'; return }
        lightEchoPad(echoSequence[step], 360).then(() => { step++; setTimeout(playStep, 180) });
      };
      setTimeout(playStep, echoRound === 1 ? 1420 : 420);
    }
    function lightEchoPad(index, duration = 180) {
      const pad = document.querySelector('[data-pad="' + index + '"]');
      pad.classList.add('lit'); tone(echoTones[index], .16, 'sine', .16);
      return new Promise(resolve => setTimeout(() => { pad.classList.remove('lit'); resolve() }, duration));
    }
    function tapEcho(index) {
      if (!S?.running || S.mode !== 'echo' || echoLocked) return;
      const session = S;
      echoInput.push(index); lightEchoPad(index, 100);
      const position = echoInput.length - 1;
      if (echoInput[position] !== echoSequence[position]) {
        S.lives--; S.errs++; S.streak = 0;
        $('#echo-feedback').textContent = 'Eco incorrecto'; $('#echo-feedback').style.color = 'var(--red)';
        sfx.bad(); card.classList.add('hurt'); setTimeout(() => card.classList.remove('hurt'), 300); hud();
        end(); return;
      }
      if (echoInput.length === echoSequence.length) {
        const points = 100 * mult(); S.streak++; S.maxS = Math.max(S.maxS, S.streak); S.hits++; S.score += points;
        $('#echo-feedback').textContent = 'Secuencia conectada · +' + points; $('#echo-feedback').style.color = 'var(--lime)'; sfx.ok(S.streak); hud();
        echoLocked = true; setTimeout(() => { if (S === session) echoNextRound() }, 720);
      }
    }
    function loop(now) {
      if (!S.running) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (S.mode === 'reflex') {
        S.t = Math.max(0, S.t - dt);
        updateReflexClock();
        if (S.t <= 0) { end(); return }
        updateReflexHazards();
        raf = requestAnimationFrame(loop);
        return;
      }
      if (S.mode !== 'echo') S.t -= dt;
      const elapsed = S.mode === 'echo' ? Math.max(0, echoRound - 1) * 3 : T - S.t;
      const lvl = S.mode === 'echo' ? Math.min(3, 1 + Math.floor(Math.max(0, echoRound - 1) / 3)) : elapsed < 8 ? 1 : elapsed < 17 ? 2 : 3;
      if (lvl !== S.level) { S.level = lvl; sfx.lvl(); banner(lvl === 2 ? 'NIVEL 2 · ACELERACIÓN' : 'NIVEL 3 · MÁXIMA ENERGÍA') }
      const W = layer.clientWidth, H = layer.clientHeight;
      if (S.mode === 'run') {
        spawnT -= dt;
        if (spawnT <= 0) {
          for (let batch = 0; batch < lvl; batch++) spawn(W);
          spawnT = [0, 1.05, .82, .68][lvl] * (.8 + Math.random() * .4);
        }
        const sp = [0, .3, .43, .58][lvl] * H;
        for (const it of S.items) {
          it.y += sp * it.k * dt;
          it.el.style.transform = 'translate(' + (it.x + Math.sin(it.ph + it.y / 60) * 12) + 'px,' + it.y + 'px) rotate(' + Math.sin(it.ph + it.y / 90) * 14 + 'deg)';
          if (it.y > H) { it.dead = true; it.el.remove() }
        }
        S.items = S.items.filter(i => !i.dead);
      }
      hud();
      if (S.mode !== 'echo' && S.t <= 0) { S.t = 0; hud(); end(); return }
      raf = requestAnimationFrame(loop);
    }
    function end() {
      const finishedSession = S;
      S.running = false; cancelAnimationFrame(raf); clearTimeout(bgTimer);
      $('#stats').hidden = S.mode === 'echo';
      if (S.mode === 'reflex') {
        const first = S.scores[0], second = S.scores[1] || 0;
        const labels = $('#stats').querySelectorAll('span');
        if (S.playerCount === 2) {
          $('#ov-t').textContent = first === second ? 'EMPATE' : 'GANA ' + S.names[first > second ? 0 : 1];
          $('#ov-s').textContent = String(first).padStart(5, '0') + ' / ' + String(second).padStart(5, '0');
          $('#ov-caption').textContent = 'PUNTOS · ' + S.names[0] + ' / ' + S.names[1];
          $('#o1').textContent = first;
          $('#o2').textContent = second;
          $('#o3').textContent = S.hits[0] + S.hits[1];
          labels[0].textContent = S.names[0];
          labels[1].textContent = S.names[1];
          labels[2].textContent = 'Aciertos';
        } else {
          $('#ov-t').textContent = '¡TIEMPO!';
          $('#ov-s').textContent = String(first).padStart(5, '0');
          $('#ov-caption').textContent = 'PUNTOS TOTALES';
          $('#o1').textContent = S.hits[0];
          $('#o2').textContent = S.misses[0];
          $('#o3').textContent = S.maxStreaks[0];
          labels[0].textContent = 'ACIERTOS';
          labels[1].textContent = 'FALLOS';
          labels[2].textContent = 'MEJOR RACHA';
          updateBest('reflex', first);
        }
        $('#ov-s').classList.toggle('duel-result', S.playerCount === 2);
        setBest();
        sfx.end(S.playerCount === 1 || first >= second);
        setTimeout(() => { if (S === finishedSession) show('over') }, 350);
        return;
      }
      sfx.end(S.lives > 0);
      const labels = $('#stats').querySelectorAll('span');
      labels[0].textContent = S.mode === 'echo' ? 'Aciertos' : 'Atrapados';
      labels[1].textContent = 'Errores';
      labels[2].textContent = 'Mejor racha';
      $('#ov-s').classList.remove('duel-result');
      $('#ov-caption').textContent = 'puntos de energía';
      if (S.mode === 'echo') updateBest('echo', S.score);
      setBest();
      $('#ov-t').textContent = S.lives <= 0 ? (S.mode === 'echo' ? 'ECO TERMINADO' : 'FIN DEL JUEGO · SIN VIDAS') : '¡TIEMPO!';
      $('#ov-s').textContent = S.score; $('#o1').textContent = S.hits; $('#o2').textContent = S.errs; $('#o3').textContent = S.maxS;
      setTimeout(() => { if (S === finishedSession) show('over') }, 350);
    }
    let AC, master, muted = false, beat = 0, bgTimer;
    function ac() {
      if (!AC) {
        try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination) }
        catch (error) { return Promise.reject(error) }
      }
      if (AC.state === 'suspended') return AC.resume();
      if (AC.state !== 'running') return Promise.reject(new Error('El audio no está disponible'));
      return Promise.resolve();
    }
    function tone(f, d, type, v, t0, f2) { if (!AC || muted) return; const t = AC.currentTime + (t0 || 0), o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02) }
    const sfx = {
      ok: s => { const f = 520 * Math.pow(1.0595, Math.min(s, 12) * 2); tone(f, .12, 'triangle', .28); tone(f * 1.5, .16, 'sine', .15, .05) },
      bad: () => { tone(160, .3, 'sawtooth', .25, 0, 60); tone(90, .3, 'square', .15) },
      tick: () => tone(660, .12, 'square', .12),
      go: () => { tone(880, .4, 'square', .14); tone(1320, .4, 'sine', .12) },
      lvl: () => [0, 1, 2].forEach(i => tone(440 * Math.pow(1.26, i * 2), .14, 'square', .12, i * .09)),
      end: w => (w ? [523, 659, 784, 1047] : [392, 330, 262, 196]).forEach((f, i) => tone(f, .25, w ? 'triangle' : 'sawtooth', .18, i * .14))
    };
    function bgLoop() {
      if (!S || !S.running) return;
      const bpm = [0, 118, 132, 146][S.level], ms = 30000 / bpm, b = beat++;
      if (b % 2 === 0) tone(150, .2, 'sine', .4, 0, 42); else tone(7000, .04, 'square', .025);
      tone([55, 55, 65.4, 55, 73.4, 55, 65.4, 49][b % 8], ms / 1000 * .9, 'sawtooth', .07);
      if (b % 4 === 3 || b % 8 === 6) tone([440, 523.3, 659.3, 784][b % 4], .12, 'triangle', .06);
      bgTimer = setTimeout(bgLoop, ms);
    }
    $('#mute').onclick = () => { ac().catch(error => console.error('No se pudo iniciar el sonido', error)); muted = !muted; $('#mute').textContent = muted ? '🔇' : '🔊' };
    document.querySelectorAll('#echo-back, #reflex-back').forEach(button => button.addEventListener('click', () => {
      if (S) S.running = false;
      S = null;
      cancelAnimationFrame(raf);
      clearTimeout(bgTimer);
      document.querySelectorAll('.echo-pad.lit').forEach(pad => pad.classList.remove('lit'));
      show('mode-select');
    }));
    $('#choose-reflex').onclick = () => chooseMode('reflex');
    $('#choose-echo').onclick = () => chooseMode('echo');
    $('#start-reflex').onclick = () => start(1);
    $('#echo-go').onclick = () => start(1);
    $('#count-retry').onclick = () => start();
    $('#count-back').onclick = () => {
      S = null;
      clearTimeout(echoCountTimer);
      show('mode-select');
    };
    document.querySelectorAll('[data-pad]').forEach(pad => {
      pad.addEventListener('pointerdown', e => {
        if (!e.isPrimary) return;
        tapEcho(Number(pad.dataset.pad));
      });
      pad.addEventListener('click', e => {
        if (e.detail === 0) tapEcho(Number(pad.dataset.pad));
      });
    });
    document.querySelectorAll('[data-mode-menu]').forEach(button => button.addEventListener('click', () => show('mode-select')));
    $('#again').onclick = () => start();
