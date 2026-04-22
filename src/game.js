/**
 * Pixel Pulse Defender - Vanilla JS Arcade Engine
 */

class SoundEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playShoot() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playExplosion() {
        const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = this.ctx.createBufferSource();
        s.buffer = b;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        s.connect(g);
        g.connect(this.ctx.destination);
        s.start();
    }

    playPowerUp() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.sound = new SoundEngine();
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'START'; // START, PLAYING, GAME_OVER

        this.player = {
            x: this.width / 2,
            y: this.height - 50,
            w: 30,
            h: 30,
            speed: 5,
            bullets: []
        };

        this.enemies = [];
        this.particles = [];
        this.stars = [];
        this.keys = {};
        this.shake = 0;

        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2,
                speed: Math.random() * 3 + 1
            });
        }

        this.initListeners();
        this.startLoop();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    }

    startGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.enemies = [];
        this.player.bullets = [];
        this.player.x = this.width / 2;
        this.gameState = 'PLAYING';
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        this.updateHUD();
    }

    gameOver() {
        this.gameState = 'GAME_OVER';
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    updateHUD() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('lives-val').textContent = '❤'.repeat(this.lives);
    }

    spawnEnemy() {
        if (this.gameState !== 'PLAYING') return;
        const types = ['SCOUT', 'BOMBER'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.enemies.push({
            x: Math.random() * (this.width - 40),
            y: -40,
            w: type === 'BOMBER' ? 40 : 30,
            h: 30,
            type: type,
            speed: 1 + Math.random() * this.level * 0.5,
            hp: type === 'BOMBER' ? 3 : 1
        });
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color
            });
        }
        this.sound.playExplosion();
    }

    update() {
        if (this.gameState !== 'PLAYING') return;

        if (this.shake > 0) this.shake *= 0.9;
        else this.shake = 0;

        // Stars
        this.stars.forEach(s => {
            s.y += s.speed;
            if (s.y > this.height) s.y = 0;
        });

        // Player movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed;
        
        // Clamp player
        this.player.x = Math.max(0, Math.min(this.width - this.player.w, this.player.x));

        // Shooting
        if (this.keys['Space'] && !this.lastShoot) {
            this.player.bullets.push({ x: this.player.x + this.player.w / 2 - 2, y: this.player.y, speed: 7 });
            this.sound.playShoot();
            this.lastShoot = true;
            setTimeout(() => this.lastShoot = false, 250);
        }

        // Bullets
        this.player.bullets.forEach((b, i) => {
            b.y -= b.speed;
            if (b.y < 0) this.player.bullets.splice(i, 1);
        });

        // Enemies
        if (Math.random() < 0.02 + (this.level * 0.005)) this.spawnEnemy();

        this.enemies.forEach((e, ei) => {
            e.y += e.speed;
            
            // Collision with bullets
            this.player.bullets.forEach((b, bi) => {
                if (b.x < e.x + e.w && b.x + 4 > e.x && b.y < e.y + e.h && b.y + 10 > e.y) {
                    e.hp--;
                    this.player.bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.type === 'BOMBER' ? '#ff00ff' : '#00f3ff');
                        this.enemies.splice(ei, 1);
                        this.score += 10;
                        if (this.score % 100 === 0) {
                            this.level++;
                            this.sound.playPowerUp();
                        }
                        this.updateHUD();
                    }
                }
            });

            // Collision with player
            if (this.player.x < e.x + e.w && this.player.x + this.player.w > e.x && this.player.y < e.y + e.h && this.player.y + this.player.h > e.y) {
                this.lives--;
                this.createExplosion(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#fff');
                this.enemies.splice(ei, 1);
                this.flashScreen();
                this.updateHUD();
                if (this.lives <= 0) this.gameOver();
            }

            if (e.y > this.height) {
                this.enemies.splice(ei, 1);
                // Missed enemy penalty? 
            }
        });

        // Particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

    flashScreen() {
        const flash = document.getElementById('flash-effect');
        flash.classList.remove('anim-flash');
        void flash.offsetWidth; // trigger reflow
        flash.classList.add('anim-flash');
        this.shake = 10;
    }

    draw() {
        this.ctx.save();
        if (this.shake > 0) {
            this.ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }

        this.ctx.fillStyle = '#050508'; // Matches var(--game-bg)
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(s => {
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        this.ctx.globalAlpha = 1.0;

        // Grid effect
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
        for(let i=0; i<this.width; i+=40) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.height);
            this.ctx.stroke();
        }
        for(let j=0; j<this.height; j+=40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, j);
            this.ctx.lineTo(this.width, j);
            this.ctx.stroke();
        }

        if (this.gameState === 'PLAYING') {
            // Draw Player (Artistic Flair Style)
            // Body top
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(this.player.x + 12, this.player.y, 6, 15);
            // Body base
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillRect(this.player.x, this.player.y + 15, 30, 10);
            // Thrusters pulse
            this.ctx.fillStyle = '#ff00ff';
            if (Math.random() > 0.4) {
                this.ctx.fillRect(this.player.x + 10, this.player.y + 25, 10, 5);
            }

            // Draw Bullets (Glowing white)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ffff';
            this.player.bullets.forEach(b => {
                this.ctx.fillRect(b.x, b.y, 4, 15);
            });
            this.ctx.shadowBlur = 0;

            // Draw Enemies
            this.enemies.forEach(e => {
                if (e.type === 'SCOUT') {
                    this.ctx.fillStyle = '#ff00ff';
                    this.ctx.fillRect(e.x, e.y, e.w, e.h);
                    this.ctx.fillStyle = '#050508';
                    this.ctx.fillRect(e.x + 10, e.y + 5, 10, 10);
                } else {
                    this.ctx.fillStyle = '#00ffff';
                    this.ctx.fillRect(e.x, e.y, e.w, e.h);
                    this.ctx.fillStyle = '#050508';
                    this.ctx.fillRect(e.x + 5, e.y + e.h / 2 - 2, e.w - 10, 4);
                }
            });
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 3, 3);
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    startLoop() {
        const loop = () => {
            this.update();
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// Start core
window.onload = () => {
    new Game();
};
