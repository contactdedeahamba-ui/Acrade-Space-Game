/**
 * NEON VOID - Pure Vanilla JavaScript Arcade Engine
 */

class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playLaser() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }

    playExplode() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    }

    playWave() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.5);
    }
}

class NeonVoid {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 500;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.sfx = new SoundFX();
        this.gameState = 'START';
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        this.shake = 0;

        this.player = {
            x: this.width / 2 - 15,
            y: this.height - 60,
            w: 30, h: 40,
            speed: 6,
            bullets: []
        };

        this.enemies = [];
        this.particles = [];
        this.stars = [];
        this.keys = {};

        // Generate static starfield
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 0.5
            });
        }

        this.bindEvents();
        this.run();
    }

    bindEvents() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        document.getElementById('start-btn').addEventListener('click', () => this.initGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.initGame());

        // Keyboard "Start" fallback
        window.addEventListener('keypress', e => {
            if (e.code === 'Space' && this.gameState !== 'PLAYING') this.initGame();
        });
    }

    initGame() {
        this.gameState = 'PLAYING';
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.enemies = [];
        this.player.bullets = [];
        this.player.x = this.width / 2 - 15;
        this.player.y = this.height - 60;

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.sfx.playWave();
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('score-val').textContent = String(this.score).padStart(8, '0');
        document.getElementById('wave-val').textContent = String(this.wave).padStart(2, '0');
        document.getElementById('lives-display').textContent = '❤❤❤'.slice(0, (this.lives) * 3);
    }

    spawn() {
        if (this.gameState !== 'PLAYING') return;
        const types = ['SCOUT', 'HEAVY'];
        const type = types[Math.random() < 0.2 ? 1 : 0];

        this.enemies.push({
            x: Math.random() * (this.width - 40),
            y: -50,
            w: type === 'HEAVY' ? 50 : 30,
            h: 30,
            type,
            hp: type === 'HEAVY' ? 3 : 1,
            speed: 1.5 + (this.wave * 0.2) + Math.random()
        });
    }

    explode(x, y, color) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
                color
            });
        }
        this.sfx.playExplode();
    }

    flash() {
        const f = document.getElementById('flash-effect');
        f.classList.remove('anim-flash');
        void f.offsetWidth;
        f.classList.add('anim-flash');
        this.shake = 12;
    }

    update() {
        if (this.gameState !== 'PLAYING') return;

        if (this.shake > 0) this.shake *= 0.9;
        this.stars.forEach(s => {
            s.y += s.speed;
            if (s.y > this.height) s.y = 0;
        });

        // Player movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed;
        this.player.x = Math.max(0, Math.min(this.width - this.player.w, this.player.x));

        // Fire
        if (this.keys['Space'] && !this.cooldown) {
            this.player.bullets.push({ x: this.player.x + this.player.w/2 - 2, y: this.player.y, s: 10 });
            this.sfx.playLaser();
            this.cooldown = true;
            setTimeout(() => this.cooldown = false, 200);
        }

        // Sim logic
        this.player.bullets.forEach((b, i) => {
            b.y -= b.s;
            if (b.y < -20) this.player.bullets.splice(i, 1);
        });

        if (Math.random() < 0.02 + (this.wave * 0.002)) this.spawn();

        this.enemies.forEach((e, ei) => {
            e.y += e.speed;

            // Combat
            this.player.bullets.forEach((b, bi) => {
                if (b.x < e.x + e.w && b.x + 4 > e.x && b.y < e.y + e.h && b.y + 15 > e.y) {
                    e.hp--;
                    this.player.bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.explode(e.x + e.w/2, e.y + e.h/2, e.type === 'HEAVY' ? '#00ffff' : '#ff00ff');
                        this.enemies.splice(ei, 1);
                        this.score += 100;
                        if (this.score % 1000 === 0) {
                            this.wave++;
                            this.sfx.playWave();
                        }
                        this.updateHUD();
                    }
                }
            });

            // Collision
            if (this.player.x < e.x + e.w && this.player.x + this.player.w > e.x && this.player.y < e.y + e.h && this.player.y + this.player.h > e.y) {
                this.lives--;
                this.explode(this.player.x + this.player.w/2, this.player.y + this.player.h/2, '#fff');
                this.enemies.splice(ei, 1);
                this.flash();
                this.updateHUD();
                if (this.lives <= 0) this.gameOver();
            }

            if (e.y > this.height) this.enemies.splice(ei, 1);
        });

        this.particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.03;
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    render() {
        this.ctx.save();
        if (this.shake > 0.5) {
            this.ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
        }

        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = 0.2;
            this.ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        this.ctx.globalAlpha = 1.0;

        // Grid lines
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
        for(let i=0; i<this.width; i+=40) { this.ctx.strokeRect(i, 0, 1, this.height); }
        for(let j=0; j<this.height; j+=40) { this.ctx.strokeRect(0, j, this.width, 1); }

        if (this.gameState === 'PLAYING') {
            // Player
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(this.player.x + 12, this.player.y, 6, 20); // Tip
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(this.player.x, this.player.y + 20, 30, 10); // Base
            this.ctx.fillStyle = '#ff00ff';
            if (Math.random() > 0.3) this.ctx.fillRect(this.player.x + 8, this.player.y + 30, 14, 5); // Thruster

            // Bullets
            this.ctx.fillStyle = '#fff';
            this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#00ffff';
            this.player.bullets.forEach(b => this.ctx.fillRect(b.x, b.y, 4, 15));
            this.ctx.shadowBlur = 0;

            // Enemies
            this.enemies.forEach(e => {
                if (e.type === 'SCOUT') {
                    this.ctx.fillStyle = '#ff00ff';
                    this.ctx.fillRect(e.x, e.y, e.w, e.h);
                    this.ctx.fillStyle = '#050508';
                    this.ctx.fillRect(e.x + 10, e.y + 8, 10, 10);
                } else {
                    this.ctx.fillStyle = '#00ffff';
                    this.ctx.fillRect(e.x, e.y, e.w, e.h);
                    this.ctx.fillStyle = '#050508';
                    this.ctx.fillRect(e.x + 5, e.y + 12, e.w - 10, 6);
                }
            });
        }

        // FX
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });

        this.ctx.restore();
    }

    run() {
        const frame = () => {
            this.update();
            this.render();
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
}

window.addEventListener('load', () => new NeonVoid());
