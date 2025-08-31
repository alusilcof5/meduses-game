(() => {
    const CONFIG = {
        levelDurationMs: 30000,
        baseSpawnIntervalMs: 1200,
        minSpawnIntervalMs: 280,
        baseSpeedPxPerSec: 55,
        speedPerLevel: 12,
        targetScoreFn: (level) => Math.round(18 + (level - 1) * 8),
        maxLives: 5,
        spawnChances: {
            normal: 0.75,
            gold: 0.08,
            bomb: 0.07,
            heart: 0.05,
            medusa: 0.05,
        },
        bubbleSizes: {
            normal: [36, 64],
            gold: [42, 68],
            bomb: [40, 60],
            heart: [34, 56],
            medusa: [46, 72],
        },
        points: {
            normal: 1,
            gold: 5,
            bomb: 3,
        },
        bombRadiusPx: 120,
        medusaPenalty: 1,
        inputEvent: 'pointerdown',
        highScoreKey: 'bubbleHighScore_v2',
    };

    const state = {
        running: false,
        level: 1,
        score: 0,
        lives: 3,
        highScore: 0,
        levelStartTime: 0,
        levelTimerId: null,
        spawnerId: null,
        bubbles: new Map(),
        nextId: 1,
        rafId: null,
    };

    const container = document.getElementById('gameContainer');
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const instructionsEl = document.getElementById('instructions');

    const hud = document.createElement('div');
    hud.id = 'hud';
    container.appendChild(hud);

    const livesEl = document.createElement('div');
    livesEl.id = 'lives';
    const timerEl = document.createElement('div');
    timerEl.id = 'timer';
    const bestEl = document.createElement('div');
    bestEl.id = 'best';
    hud.append(livesEl, timerEl, bestEl);

    // Audio setup
    const bgAudio = new Audio('./assets/mar-calmado.mp3');
    bgAudio.loop = true;
    bgAudio.volume = 0.4;
    const popSound = new Audio('https://freesound.org/data/previews/387/387232_5121236-lq.mp3');
    popSound.volume = 0.6;

    const soundBtn = document.createElement('button');
    soundBtn.id = 'toggleSound';
    soundBtn.textContent = '🔊';
    hud.appendChild(soundBtn);

    soundBtn.addEventListener('click', () => {
        bgAudio.muted = !bgAudio.muted;
        popSound.muted = bgAudio.muted;
        soundBtn.textContent = bgAudio.muted ? '🔇' : '🔊';
    });

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function pickType() {
        const r = Math.random();
        const c = CONFIG.spawnChances;
        let acc = 0;
        for (const [type, p] of Object.entries(c)) {
            acc += p;
            if (r < acc) return type;
        }
        return 'normal';
    }
    function sizeFor(type) {
        const [a, b] = CONFIG.bubbleSizes[type] || CONFIG.bubbleSizes.normal;
        return Math.round(rand(a, b));
    }
    function spawnInterval() {
        const dec = (state.level - 1) * 80;
        return clamp(CONFIG.baseSpawnIntervalMs - dec, CONFIG.minSpawnIntervalMs, 99999);
    }
    function speedForLevel() {
        return CONFIG.baseSpeedPxPerSec + (state.level - 1) * CONFIG.speedPerLevel;
    }
    function containerRect() { return container.getBoundingClientRect(); }

    function loadHighScore() {
        const v = Number(localStorage.getItem(CONFIG.highScoreKey) || '0');
        state.highScore = isNaN(v) ? 0 : v;
    }
    function saveHighScore() {
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem(CONFIG.highScoreKey, String(state.highScore));
        }
    }

    function updateHUD() {
        scoreEl.textContent = `Puntos: ${state.score}`;
        levelEl.textContent = `Nivel: ${state.level}`;
        livesEl.textContent = `Vidas: ${'❤'.repeat(state.lives)}${'♡'.repeat(CONFIG.maxLives - state.lives)}`;
        bestEl.textContent = `Récord: ${state.highScore}`;
    }

    function setInstructions(text) {
        if (instructionsEl) instructionsEl.textContent = text;
    }

    function spawnBubble() {
        const type = pickType();
        const id = state.nextId++;
        const isMedusa = type === 'medusa';
        const el = document.createElement(isMedusa ? 'img' : 'div');
        el.className = isMedusa ? 'medusa' : `bubble ${type}`;
        el.dataset.id = String(id);

        const { width, height } = containerRect();
        const size = sizeFor(type);

        const x = rand(0, Math.max(0, width - size));
        const y = height + size;

        el.style.position = 'absolute';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.cursor = 'crosshair';
        el.style.userSelect = 'none';
        el.style.touchAction = 'manipulation';

        if (isMedusa) {
            el.src = 'medusa.png';
        } else {
            el.style.borderRadius = '50%';
            el.style.display = 'grid';
            el.style.placeItems = 'center';
            el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
            if (type === 'gold') {
                el.style.background = 'radial-gradient(#fff6a9, #e0a800)';
            } else if (type === 'bomb') {
                el.style.background = 'radial-gradient(#bbbbbb, #444)';
            } else if (type === 'heart') {
                el.style.background = 'radial-gradient(#ffb3c7, #ff3b6b)';
            } else {
                el.style.background = 'radial-gradient(#b8ecff, #4cc9f0)';
            }
            el.style.fontWeight = '700';
            el.style.color = '#ffffff';
            el.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
            el.style.fontSize = `${Math.max(12, size * 0.28)}px`;
            el.textContent = type === 'gold' ? '+5' : type === 'bomb' ? '💥' : type === 'heart' ? '+❤' : '+';
        }

        const spd = speedForLevel() * rand(0.85, 1.2);
        state.bubbles.set(id, { el, type, x, y, speed: spd, size });
        container.appendChild(el);

        el.addEventListener(CONFIG.inputEvent, onBubbleHit, { passive: true });
    }

    function onBubbleHit(ev) {
        const el = ev.currentTarget;
        if (!(el instanceof HTMLElement)) return;
        const id = Number(el.dataset.id);
        const data = state.bubbles.get(id);
        if (!data || !state.running) return;

        // Play pop sound for non-medusa bubbles
        if (data.type !== 'medusa') {
            popSound.currentTime = 0;
            popSound.play().catch(e => console.log("Error al reproducir sonido de pop:", e));
        }

        switch (data.type) {
            case 'medusa':
                loseLife(CONFIG.medusaPenalty);
                flash(el, '#ff1744');
                shake(container);
                break;
            case 'gold':
                addScore(CONFIG.points.gold);
                createParticles(data.x + data.size / 2, data.y + data.size / 2, '#e0a800');
                pop(el);
                break;
            case 'bomb':
                const gained = explode(el, data);
                addScore(CONFIG.points.bomb + gained);
                createParticles(data.x + data.size / 2, data.y + data.size / 2, '#444');
                break;
            case 'heart':
                if (state.lives < CONFIG.maxLives) {
                    state.lives++;
                    updateHUD();
                }
                createParticles(data.x + data.size / 2, data.y + data.size / 2, '#ff3b6b');
                pop(el);
                break;
            default:
                addScore(CONFIG.points.normal);
                createParticles(data.x + data.size / 2, data.y + data.size / 2, '#4cc9f0');
                pop(el);
                break;
        }
        removeBubble(id);
    }

    function removeBubble(id) {
        const b = state.bubbles.get(id);
        if (!b) return;
        b.el.removeEventListener(CONFIG.inputEvent, onBubbleHit);
        b.el.remove();
        state.bubbles.delete(id);
    }

    function pop(el) {
        el.classList.add('pop-animation');
        setTimeout(() => el.remove(), 300);
    }

    function explode(el, data) {
        const centerX = data.x + data.size / 2;
        const centerY = data.y + data.size / 2;
        let extra = 0;
        for (const [id, b] of Array.from(state.bubbles.entries())) {
            if (b.el === el || b.type === 'medusa') continue;
            const bx = b.x + b.size / 2;
            const by = b.y + b.size / 2;
            const dist = Math.hypot(bx - centerX, by - centerY);
            if (dist <= CONFIG.bombRadiusPx) {
                extra += (b.type === 'gold') ? 2 : 1;
                createParticles(bx, by, b.type === 'gold' ? '#e0a800' : b.type === 'heart' ? '#ff3b6b' : '#4cc9f0');
                pop(b.el);
                removeBubble(id);
            }
        }
        pop(el);
        flash(container, 'rgba(255,255,255,0.25)', 100);
        return extra;
    }

    function createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.background = color;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 50 + Math.random() * 50;
            particle.style.setProperty('--x', Math.cos(angle) * velocity + 'px');
            particle.style.setProperty('--y', Math.sin(angle) * velocity + 'px');
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }

    function flash(target, color = 'rgba(255,255,255,0.35)', ms = 160) {
        const prev = target.style.boxShadow;
        target.style.boxShadow = `inset 0 0 0 9999px ${color}`;
        setTimeout(() => target.style.boxShadow = prev, ms);
    }

    function shake(target) {
        target.animate([
            { transform: 'translate(0,0)' },
            { transform: `translate(-10px,0)` },
            { transform: `translate(10px,0)` },
            { transform: 'translate(0,0)' },
        ], { duration: 160, easing: 'ease-out' });
    }

    let lastTs = 0;
    function tick(ts) {
        if (!state.running) return;
        if (!lastTs) lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        lastTs = ts;

        const { height } = containerRect();

        for (const [id, b] of Array.from(state.bubbles.entries())) {
            b.y -= b.speed * dt;
            if (b.el) b.el.style.top = `${b.y}px`;
            if (b.y + b.size < 0) {
                removeBubble(id);
            }
        }

        const elapsed = Date.now() - state.levelStartTime;
        const remain = Math.max(0, CONFIG.levelDurationMs - elapsed);
        timerEl.textContent = `Tiempo: ${(remain / 1000).toFixed(0)}s`;

        if (remain <= 0) {
            endLevel();
            return;
        }

        state.rafId = requestAnimationFrame(tick);
    }

    function addScore(n) {
        state.score += n;
        if (state.score > state.highScore) saveHighScore();
        updateHUD();
    }

    function loseLife(n = 1) {
        state.lives = clamp(state.lives - n, 0, CONFIG.maxLives);
        updateHUD();
        if (state.lives <= 0) gameOver();
    }

    function startLevel() {
        state.running = true;
        state.levelStartTime = Date.now();
        updateHUD();
        setInstructions(`¡Explota burbujas! Evita las medusas. Objetivo: ${CONFIG.targetScoreFn(state.level)} puntos`);

        clearInterval(state.spawnerId);
        state.spawnerId = setInterval(spawnBubble, spawnInterval());

        cancelAnimationFrame(state.rafId);
        lastTs = 0;
        state.rafId = requestAnimationFrame(tick);

        // Try playing background audio after user interaction
        bgAudio.play().catch(e => console.log("Error al reproducir audio de fondo:", e));
    }

    function endLevel() {
        const target = CONFIG.targetScoreFn(state.level);
        if (state.score >= target) {
            state.level++;
            setInstructions(`¡Nivel superado! Nuevo objetivo: ${CONFIG.targetScoreFn(state.level)} puntos`);
            clearInterval(state.spawnerId);
            state.spawnerId = setInterval(spawnBubble, spawnInterval());
            state.levelStartTime = Date.now();
            cancelAnimationFrame(state.rafId);
            lastTs = 0;
            state.rafId = requestAnimationFrame(tick);
            updateHUD();
        } else {
            gameOver();
        }
    }

    function gameOver() {
        state.running = false;
        clearInterval(state.spawnerId);
        cancelAnimationFrame(state.rafId);
        for (const id of Array.from(state.bubbles.keys())) removeBubble(id);

        setInstructions(`Juego terminado. Puntuación: ${state.score}. Toque/clic para reiniciar.`);
        container.style.filter = 'grayscale(0.3)';
        bgAudio.pause();

        const handler = () => {
            container.removeEventListener(CONFIG.inputEvent, handler);
            container.style.filter = '';
            newGame();
        };
        container.addEventListener(CONFIG.inputEvent, handler, { once: true });
    }

    function newGame() {
        state.level = 1;
        state.score = 0;
        state.lives = 3;
        loadHighScore();
        updateHUD();
        startLevel();
    }

    function pause() {
        state.running = false;
        clearInterval(state.spawnerId);
        cancelAnimationFrame(state.rafId);
        setInstructions('Pausa. Vuelve a la ventana para continuar.');
        bgAudio.pause();
    }

    function resume() {
        if (state.lives <= 0) return;
        setInstructions(`¡Continúa! Objetivo: ${CONFIG.targetScoreFn(state.level)} puntos`);
        state.running = true;
        const elapsedBefore = Date.now() - state.levelStartTime;
        state.levelStartTime = Date.now() - elapsedBefore;
        state.spawnerId = setInterval(spawnBubble, spawnInterval());
        lastTs = 0;
        state.rafId = requestAnimationFrame(tick);
        bgAudio.play().catch(e => console.log("Error al reproducir audio de fondo:", e));
    }

    function init() {
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.minHeight = '70vh';
        loadHighScore();
        updateHUD();
        setInstructions('¡Haz click o toca para empezar! Evita las medusas ⚡');

        const startHandler = () => {
            container.removeEventListener(CONFIG.inputEvent, startHandler);
            newGame();
        };
        container.addEventListener(CONFIG.inputEvent, startHandler, { once: true });

        window.addEventListener('resize', () => {
            const { width, height } = containerRect();
            for (const b of state.bubbles.values()) {
                b.x = clamp(b.x, 0, Math.max(0, width - b.size));
                b.el.style.left = `${b.x}px`;
                b.y = Math.min(b.y, height + b.size);
                b.el.style.top = `${b.y}px`;
            }
        });

        window.addEventListener('blur', pause);
        window.addEventListener('focus', resume);
    }

    document.readyState === 'loading' ?
        document.addEventListener('DOMContentLoaded', init) : init();
})();



