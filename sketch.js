console.log("Script cargado");

let bg;
let selznickFont;
let fukuaPort;
let squiglyPort;

let gravity = 0.8;
let gameState = 'menu';

let menuMusic;
let stageMusic;
let hitSounds = [];

let bgOffsetY = 0; // <- mueve el fondo en Y (positivo = baja, negativo = sube)

// Presiona Q en juego para mostrar/ocultar cajas de debug
let debugBoxes = true;

// Cámara dinámica
let currentZoom = 1.35;   // zoom actual (interpolado suavemente)
const ZOOM_MAX  = 1.45;   // zoom cuando los personajes están muy cerca
const ZOOM_MIN  = 1.10;   // zoom cuando están muy lejos
const ZOOM_LERP = 0.04;   // velocidad de transición

// Cámara vertical — desplaza TODO el mundo (fondo + personajes) hacia abajo
// cuando saltan, para que el piso siempre quede visible abajo
let camY        = 0;      // valor actual interpolado
const CAM_LERP  = 0.07;   // suavidad del pan vertical

// Zoom dinámico de personajes según distancia
let charScale        = 1.5;   // escala actual de los personajes (interpolada)
const CHAR_SCALE_MAX = 1.6;   // escala cuando están muy cerca
const CHAR_SCALE_MIN = 1.1;   // escala cuando están muy lejos
const CHAR_LERP      = 0.04;  // suavidad del cambio de tamaño

class Fighter {

    constructor(x, y, sprites, controls) {

        this.x = x;
        this.y = y;

        this.w = 300;
        this.h = 400;

        this.vx = 0;
        this.vy = 0;

        this.speed = 5;

        this.jumpForce = -22;

        this.onGround = false;

        this.health = 100;

        this.controls = controls;

        this.attackCooldown = 0;

        this.facing = 1;

        this.isAttacking = false;
        this.attackType = null;
        this.attackDamage = 0;
        this.attackRange = 0;

        // Sprites
        this.sprites = sprites;
        this.currentFrames = this.sprites.idle;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDelay = 6;
        this.currentFrame = this.currentFrames[0];

        this.state = "idle";
        this.isAnimating = false;
        this.drawScale = 1.5;

        // Temblor al recibir golpe
        this.shakeTimer    = 0;   // frames que dura el temblor
        this.shakeIntensity = 0;  // magnitud máxima en px

        this.animationConfigs = {
            idle: { loop: true, delay: 6 },
            walk: { loop: true, delay: 4 },
            jump: { loop: false, delay: 8 },
            lp: { loop: false, delay: 4, cooldown: 24 },
            mp: { loop: false, delay: 5, cooldown: 35 },
            hp: { loop: false, delay: 6, cooldown: 72 },
            lk: { loop: false, delay: 4, cooldown: 52 },
            mk: { loop: false, delay: 5, cooldown: 50 },
            hk: { loop: false, delay: 6, cooldown: 84 },
            hit_alto: { loop: false, delay: 5 },
            hit_medio: { loop: false, delay: 5 },
            ko: { loop: false, delay: 6 }
        };

        this.attackBoxes = {
            lp: { x: 0.74, y: 0.51, w: 0.08, h: 0.15, frames: [2, 3] },
            mp: { x: 0.70, y: 0.46, w: 0.12, h: 0.17, frames: [3, 4] },
            hp: { x: 0.72, y: 0.44, w: 0.17, h: 0.20, frames: [4, 5, 6] },
            lk: { x: 0.79, y: 0.55, w: 0.10, h: 0.16, frames: [2, 3] },
            mk: { x: 0.79, y: 0.52, w: 0.16, h: 0.18, frames: [3, 4] },
            hk: { x: 0.72, y: 0.48, w: 0.22, h: 0.22, frames: [4, 5, 6] }
        };

        this.isHit = false;
        this.hitState = null;
        this.hasHit = false;
        this.activeAttackBox = null;
        this.receiveHitBox = null;

        // Hit effect (onomatopeya)
        this.hitText = "";
        this.hitTimer = 0;
        this.hitTextAlpha = 255;
    }

    // Orienta al personaje mirando hacia el enemigo
    orientTowards(enemy) {
        if (!enemy) return;
        let myCenter = this.x + this.w / 2;
        let enemyCenter = enemy.x + enemy.w / 2;

        if (myCenter < enemyCenter) {
            this.facing = 1;
        } else {
            this.facing = -1;
        }
    }

    update(enemy) {

        if (this.health <= 0) {
            if (this.state !== "ko") {
                this.changeState("ko", true);
            }
            this.vx = 0;
            this.hasHit = false;
            this.attackCooldown = 0;
            this.activeAttackBox = null;

            if (!this.onGround) {
                this.vy += gravity;
                this.y += this.vy;
                const drawH = this.h * this.drawScale;
                const groundY = height - (drawH + this.h) / 2;
                if (this.y >= groundY) {
                    this.y = groundY;
                    this.vy = 0;
                    this.onGround = true;
                }
            }

            this.updateReceiveHitBox();
            this.updateAnimation();
            return;
        }

        this.vx = 0;

        let moving = false;

        if (keyIsDown(this.controls.left)) {
            this.vx = -this.speed;
            this.facing = -1;
            moving = true;
        }

        if (keyIsDown(this.controls.right)) {
            this.vx = this.speed;
            this.facing = 1;
            moving = true;
        }

        if (keyIsDown(this.controls.jump) && this.onGround) {
            this.vy = this.jumpForce;
            this.onGround = false;
            this.changeState("jump");
        }

        if (!this.isAnimating) {
            if (moving && this.onGround && this.attackCooldown <= 0) {
                this.changeState("walk");
            } else if (!moving && this.onGround && this.attackCooldown <= 0) {
                this.changeState("idle");
            }
        }

        this.x += this.vx;
        this.vy += gravity;
        this.y += this.vy;

        const drawH = this.h * this.drawScale;
        const groundY = height - (drawH + this.h) / 2;
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;

            if (!this.onGround) {
                this.onGround = true;
                if (this.state === "jump") {
                    this.changeState("idle");
                }
            } else {
                this.onGround = true;
            }
        }

        this.x = constrain(this.x, 0, width - this.w);

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        this.updateReceiveHitBox();
        this.updateAnimation();
        this.processAttackHit(enemy);
    }

    draw() {
        push();

        // Temblor: offset aleatorio que se aplica SOLO al dibujo, no a la posición real
        let shakeX = 0;
        let shakeY = 0;
        if (this.shakeTimer > 0) {
            shakeX = random(-this.shakeIntensity, this.shakeIntensity);
            shakeY = random(-this.shakeIntensity, this.shakeIntensity);
            this.shakeTimer--;
            // Reducir intensidad progresivamente
            this.shakeIntensity = this.shakeIntensity * 0.88;
        }

        const drawW = this.w * this.drawScale;
        const drawH = this.h * this.drawScale;
        const drawX = this.x - (drawW - this.w) / 2 + shakeX;
        const drawY = this.y - (drawH - this.h) / 2 + shakeY;

        if (this.facing === -1) {
            translate(drawX + drawW, drawY);
            scale(-1, 1);
            image(this.currentFrame, 0, 0, drawW, drawH);
        } else {
            image(this.currentFrame, drawX, drawY, drawW, drawH);
        }

        pop();

        if (this.activeAttackBox && debugBoxes) {
            push();
            noFill();
            stroke(255, 0, 0, 200);
            strokeWeight(3);
            rect(this.activeAttackBox.x, this.activeAttackBox.y, this.activeAttackBox.w, this.activeAttackBox.h);
            // Etiqueta con estado y frame actual
            fill(255, 0, 0, 220);
            noStroke();
            textSize(14);
            textAlign(LEFT, BOTTOM);
            text(this.state + " f:" + this.frameIndex, this.activeAttackBox.x, this.activeAttackBox.y - 4);
            pop();
        }

        if (this.receiveHitBox && debugBoxes) {
            push();
            noFill();
            stroke(0, 180, 255, 200);
            strokeWeight(3);
            rect(this.receiveHitBox.x, this.receiveHitBox.y, this.receiveHitBox.w, this.receiveHitBox.h);
            pop();
        }

        if (this.hitTimer > 0) {
            push();
            textFont(selznickFont);
            textSize(32);
            textAlign(CENTER, BOTTOM);
            stroke(0);
            strokeWeight(3);
            fill(255, 240, 0, this.hitTextAlpha);
            text(this.hitText, this.x + this.w / 2, this.y - 10);
            pop();

            this.hitTimer--;
            this.hitTextAlpha = max(0, this.hitTextAlpha - (255 / 45));
        }
    }

    updateAnimation() {
        this.frameTimer++;
        if (this.frameTimer < this.frameDelay) return;

        this.frameTimer = 0;
        this.frameIndex++;

        let config = this.animationConfigs[this.state] || { loop: true };
        if (this.frameIndex >= this.currentFrames.length) {
            if (config.loop) {
                this.frameIndex = 0;
            } else {
                this.frameIndex = this.currentFrames.length - 1;
                this.isAnimating = false;
                if (this.state === 'hit_alto' || this.state === 'hit_medio') {
                    this.isHit = false;
                    this.hitState = null;
                }

                if (this.state !== 'ko' && this.onGround) {
                    if (this.vx !== 0) {
                        this.changeState("walk");
                    } else {
                        this.changeState("idle");
                    }
                }
            }
        }

        this.currentFrame = this.currentFrames[this.frameIndex];
    }

    changeState(state, force = false) {
        if (this.state === state && !force) return;

        if (this.state === "idle" && state !== "idle") {
            this.isAnimating = false;
        }

        this.state = state;
        this.currentFrames = this.sprites[state] || this.sprites.idle;
        if (!this.currentFrames || this.currentFrames.length === 0) {
            this.currentFrames = this.sprites.idle;
            this.state = "idle";
        }
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDelay = this.animationConfigs[this.state]?.delay || 6;
        this.currentFrame = this.currentFrames[0] || null;

        let config = this.animationConfigs[state] || { loop: true };
        this.isAnimating = !config.loop;
    }

    receiveHit(attackHeight) {
        this.isHit = true;
        this.hitState = attackHeight <= 0.5 ? 'hit_alto' : 'hit_medio';
        this.changeState(this.hitState);

        // Iniciar temblor (independiente de la animación)
        this.shakeTimer     = 18;   // duración en frames
        this.shakeIntensity = 9;    // intensidad inicial en px
    }

    processAttackHit(enemy) {
        this.activeAttackBox = null;

        if (!enemy || !this.attackBoxes[this.state] || this.hasHit) return;

        const config = this.attackBoxes[this.state];
        if (!config.frames.includes(this.frameIndex)) return;

        // Usar dimensiones escaladas para que el attackbox coincida con el sprite
        const sw       = this.w * this.drawScale;
        const sh       = this.h * this.drawScale;
        const originX  = this.x - (sw - this.w) / 2;
        const originY  = this.y - (sh - this.h) / 2;

        const boxWidth  = sw * config.w;
        const boxHeight = sh * config.h;
        const relativeX = sw * config.x;
        const boxX = this.facing === 1
            ? originX + relativeX
            : originX + sw - relativeX - boxWidth;
        const boxY = originY + sh * config.y;

        this.activeAttackBox = { x: boxX, y: boxY, w: boxWidth, h: boxHeight };

        const enemyHitBox = enemy.receiveHitBox || {
            x: enemy.x,
            y: enemy.y + enemy.h * 0.15,
            w: enemy.w,
            h: enemy.h * 0.7
        };

        if (this.checkOverlap(this.activeAttackBox, enemyHitBox)) {
            this.hasHit = true;
            const damageMap = {
                lp: 4,
                mp: 7,
                hp: 12,
                lk: 5,
                mk: 8,
                hk: 15
            };
            const damage = damageMap[this.state] || 0;
            enemy.health -= damage;
            console.log(this.state + " ¡GOLPE! Daño: " + damage);
            const onos = ["¡PAF!", "¡BAM!", "¡PUM!", "¡ZAS!", "¡BOOM!", "¡ZAC!"];
            enemy.hitText = random(onos);
            enemy.hitTimer = 45;
            enemy.hitTextAlpha = 255;
            enemy.receiveHit(config.y);
            playRandomHitSound();
        }
    }

    checkOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    updateReceiveHitBox() {
        // La hitbox escala junto con el sprite visual
        const sw       = this.w * this.drawScale;
        const sh       = this.h * this.drawScale;
        const originX  = this.x - (sw - this.w) / 2;
        const originY  = this.y - (sh - this.h) / 2;
        // paddingX mayor = hitbox más angosta horizontalmente (ajusta 0.32 a gusto)
        const paddingX = sw * 0.32;
        const paddingY = sh * 0.08;
        this.receiveHitBox = {
            x: originX + paddingX,
            y: originY + paddingY,
            w: sw - paddingX * 2,
            h: sh - paddingY * 2
        };
    }

    attack(enemy, type) {
        if (this.attackCooldown > 0 && !this.isAnimating) return;

        let cooldown = 0;

        switch(type){
            case "LP":
                cooldown = this.animationConfigs.lp.cooldown;
                this.changeState("lp");
                break;
            case "MP":
                cooldown = this.animationConfigs.mp.cooldown;
                this.changeState("mp");
                break;
            case "HP":
                cooldown = this.animationConfigs.hp.cooldown;
                this.changeState("hp");
                break;
            case "LK":
                cooldown = this.animationConfigs.lk.cooldown;
                this.changeState("lk");
                break;
            case "MK":
                cooldown = this.animationConfigs.mk.cooldown;
                this.changeState("mk");
                break;
            case "HK":
                cooldown = this.animationConfigs.hk.cooldown;
                this.changeState("hk");
                break;
        }

        this.hasHit = false;
        this.attackCooldown = cooldown;
    }
}

let p1;
let p2;

let timer = 99;
let timerCounter = 0;

// SISTEMA DE ROUNDS
let currentRound = 1;
let maxRounds = 3;
let p1RoundsWon = 0;
let p2RoundsWon = 0;
let roundEnded = false;
let roundWinner = null;
let roundEndTimer = 0;

function preload() {
    console.log("Preload iniciado");

    selznickFont = loadFont("assets/SelznickRemixNf-Dd3D.ttf");

    bg = loadImage("assets/bg.png");
    fukuaPort = loadImage("assets/Fukua port_Capa 1.png");
    squiglyPort = loadImage("assets/Squigly port_Capa 1.png");

    menuMusic = loadSound("sounds/Menu.mp3");
    stageMusic = loadSound("sounds/Stage.mp3");
    hitSounds = [
        loadSound("sounds/Hit.mp3"),
        loadSound("sounds/hit .mp3")
    ];
    console.log("Fondo y sonidos cargados");

    function loadFrames(folder, prefix, count, pad = 0, start = 0) {
        const frames = [];
        for (let i = 0; i < count; i++) {
            const frameIndex = i + start;
            const index = pad > 0 ? nf(frameIndex, pad) : frameIndex;
            frames.push(loadImage(`${folder}/${prefix}${index}.png`));
        }
        return frames;
    }

    // PLAYER 1
    window.p1sprites = {
        idle: loadFrames("assets/p1/idle", "idle_", 12, 2),
        walk: loadFrames("assets/p1/walk", "walk_", 12, 2, 1),
        jump: loadFrames("assets/p1/jump", "jump_", 11, 2),
        lp: loadFrames("assets/p1/lp", "lp_", 9, 0),
        mp: loadFrames("assets/p1/mp", "mp_", 8, 0),
        hp: loadFrames("assets/p1/hp", "hp_", 12, 2, 1),
        lk: loadFrames("assets/p1/lk", "lk_", 14, 2),
        mk: loadFrames("assets/p1/mk", "mk_", 11, 2),
        hk: loadFrames("assets/p1/hk", "hk_", 14, 2),
        hit_alto: loadFrames("assets/p1/hit_alto", "hit_", 9, 2, 1),
        hit_medio: loadFrames("assets/p1/hit_medio", "hit mid_", 9, 2, 1),
        ko: loadFrames("assets/p1/KO", "k.o_", 22, 2, 1)
    };
    console.log("Sprites P1 cargados");

    // PLAYER 2
    window.p2sprites = {
        idle: loadFrames("assets/p2/idle", "idle_", 15, 2),
        walk: loadFrames("assets/p2/walk", "walk_", 6, 0, 1),
        jump: loadFrames("assets/p2/jump", "jump_", 7, 0, 1),
        lp: loadFrames("assets/p2/lp", "lp_", 7, 0),
        mp: loadFrames("assets/p2/mp", "mp_", 17, 2),
        hp: loadFrames("assets/p2/hp", "hp_", 13, 2),
        lk: loadFrames("assets/p2/lk", "lk_", 17, 2),
        mk: loadFrames("assets/p2/mk", "mk_", 15, 2),
        hk: loadFrames("assets/p2/hk", "hk_", 13, 2),
        hit_alto: loadFrames("assets/p2/hit_alto", "hit_", 8, 0, 1),
        hit_medio: loadFrames("assets/p2/hit_medio", "hit mid_", 9, 2, 1),
        ko: loadFrames("assets/p2/KO", "k.o_", 7, 2, 1)
    };
    console.log("Sprites P2 cargados");
}

function setup() {
    createCanvas(1600, 900);

    console.log("Setup iniciado");

    const startButton = select('#startButton');
    if (startButton) {
        startButton.mousePressed(startGame);
    }

    if (menuMusic) {
        menuMusic.setLoop(true);
        menuMusic.setVolume(0.45);
        menuMusic.loop();
    }

    // PLAYER 1 - Izquierda
    p1 = new Fighter(200, 90, window.p1sprites, {
        left: 65,  // A
        right: 68, // D
        jump: 87,  // W
        LP: 82, MP: 84, HP: 89,
        LK: 70, MK: 71, HK: 72
    });

    // PLAYER 2 - Derecha
    p2 = new Fighter(width - 500, 90, window.p2sprites, {
        left: 37,
        right: 39,
        jump: 38,
        LP: 73, MP: 79, HP: 80,
        LK: 75, MK: 76, HK: 74
    });

    console.log("Jugadores creados");
}

function draw() {

    if (gameState === 'menu') {
        background(0);
        if (bg) image(bg, 0, 0, width, height);
        return;
    }

    background(20, 20, 20);

    // ── 1. Calcular zoom de fondo (distancia entre personajes) ──────────────
    if (p1 && p2) {
        const dist      = abs((p2.x + p2.w / 2) - (p1.x + p1.w / 2));
        const maxDist   = width * 0.75;
        let targetZoom  = map(dist, 0, maxDist, ZOOM_MAX, ZOOM_MIN);
        targetZoom      = constrain(targetZoom, ZOOM_MIN, ZOOM_MAX);
        currentZoom     = lerp(currentZoom, targetZoom, ZOOM_LERP);

        // ── 2. Calcular zoom de personajes (misma distancia) ────────────────
        let targetChar  = map(dist, 0, maxDist, CHAR_SCALE_MAX, CHAR_SCALE_MIN);
        targetChar      = constrain(targetChar, CHAR_SCALE_MIN, CHAR_SCALE_MAX);
        charScale       = lerp(charScale, targetChar, CHAR_LERP);
        // Propagar drawScale a cada fighter
        p1.drawScale    = charScale;
        p2.drawScale    = charScale;

        // ── 3. Cámara vertical: bajar el mundo cuando alguien salta ─────────
        // "Rise" = cuántos px por encima del suelo está el personaje
        const groundY   = height - (p1.h * charScale + p1.h) / 2;
        const p1Rise    = max(0, groundY - p1.y);
        const p2Rise    = max(0, groundY - p2.y);
        const maxRise   = max(p1Rise, p2Rise);
        // Cuando hay salto → camY positivo → translate baja el mundo
        // (el personaje sigue visualmente hacia arriba pero el piso baja con él)
        let targetCamY  = map(maxRise, 0, groundY * 0.55, 0, 110);
        targetCamY      = constrain(targetCamY, 0, 110);
        camY            = lerp(camY, targetCamY, CAM_LERP);
    }

    // ── 4. Dibujar fondo con translate de cámara ────────────────────────────
    push();
    translate(0, camY);   // bajar el mundo entero

    if (bg) {
        const bgW = width  * currentZoom;
        const bgH = height * currentZoom;
        const bgX = (width - bgW) / 2;
        // Borde inferior del fondo siempre pegado al piso de pantalla
        // (que en coordenadas del mundo = height, antes del translate)
        const bgY = height - bgH + bgOffsetY;
        image(bg, bgX, bgY, bgW, bgH);
    }

    // ── 5. Actualizar y dibujar personajes (dentro del translate) ───────────
    if (p1 && p2) {
        timerCounter++;
        if (timerCounter >= 60) {
            if (timer > 0) timer--;
            timerCounter = 0;
        }

        if (!roundEnded) {
            p1.update(p2);
            p2.update(p1);
            p1.orientTowards(p2);
            p2.orientTowards(p1);
            p1.draw();
            p2.draw();

            if (p1.health <= 0 && p1.state === 'ko' && !p1.isAnimating && p2.health > 0) {
                roundEnded = true;
                roundWinner = 2;
                p2RoundsWon++;
                console.log("ROUND " + currentRound + " GANADO POR P2. Score: P1=" + p1RoundsWon + " P2=" + p2RoundsWon);
            }
            if (p2.health <= 0 && p2.state === 'ko' && !p2.isAnimating && p1.health > 0) {
                roundEnded = true;
                roundWinner = 1;
                p1RoundsWon++;
                console.log("ROUND " + currentRound + " GANADO POR P1. Score: P1=" + p1RoundsWon + " P2=" + p2RoundsWon);
            }
            if (p1.health <= 0 && p2.health <= 0 && p1.state === 'ko' && !p1.isAnimating && p2.state === 'ko' && !p2.isAnimating) {
                roundEnded = true;
                roundWinner = 0;
                console.log("ROUND " + currentRound + " EMPATE.");
            }
            if (timer <= 0 && p1.health > 0 && p2.health > 0 && !roundEnded) {
                roundEnded = true; roundWinner = 0;
                console.log("ROUND " + currentRound + " EMPATE.");
            }
        } else {
            p1.draw();
            p2.draw();
            showRoundWinner();
            roundEndTimer++;
            if (roundEndTimer >= 120) {
                roundEndTimer = 0;
                if (p1RoundsWon < 2 && p2RoundsWon < 2) nextRound();
            }
        }
    } else {
        fill(255, 0, 0);
        textSize(20);
        text("Jugadores no inicializados", 20, 60);
    }

    pop(); // fin del translate de cámara

    // ── 6. HUD siempre fijo (fuera del translate) ────────────────────────────
    if (p1 && p2 && !roundEnded) drawHUD();

    // ── 7. Ganador final ─────────────────────────────────────────────────────
    if (p1RoundsWon >= 2) { showFinalWinner("PLAYER 1 WINS THE MATCH!"); noLoop(); }
    if (p2RoundsWon >= 2) { showFinalWinner("PLAYER 2 WINS THE MATCH!"); noLoop(); }
}

// =====================================================
// HUD - Rediseñado para coincidir con imagen objetivo
// =====================================================

function drawHUD() {
    textFont(selznickFont);

    // Dimensiones generales del HUD
    const HUD_H       = 160;   // altura total de la banda oscura
    const PORT_SIZE   = 120;   // diámetro del retrato circular
    const PORT_PAD    = 14;    // margen exterior del retrato
    const PORT_Y      = 10;    // Y del retrato

    // Anchura de cada panel de barra (izquierdo y derecho)
    // Deja espacio para el timer central (~180px) y los retratos
    const PANEL_W     = (width - PORT_SIZE * 2 - PORT_PAD * 4 - 200) / 2;
    const PANEL_H     = 100;   // alto del panel de película
    const PANEL_Y     = 12;    // Y del panel

    // X inicio de cada panel (a la derecha del retrato izquierdo / izquierda del retrato derecho)
    const PANEL_X1    = PORT_PAD + PORT_SIZE + PORT_PAD;
    const PANEL_X2    = width - PORT_PAD - PORT_SIZE - PORT_PAD - PANEL_W;

    // Barra de salud dentro del panel
    const BAR_MARGIN  = 12;    // margen interno del panel a la barra
    const BAR_H       = 44;    // alto de la barra
    const BAR_Y       = PANEL_Y + (PANEL_H - BAR_H) / 2;

    // ── Fondo oscuro del HUD ─────────────────────────
    noStroke();
    fill(8, 8, 22, 215);
    rect(0, 0, width, HUD_H);

    // Línea inferior sutil
    stroke(255, 215, 0, 60);
    strokeWeight(1);
    line(0, HUD_H, width, HUD_H);

    // ── P1: panel película + barra + retrato ─────────
    drawFilmPanel(PANEL_X1, PANEL_Y, PANEL_W, PANEL_H, color(255, 215, 0));
    drawHealthBar_LtoR(
        PANEL_X1 + BAR_MARGIN,
        BAR_Y,
        PANEL_W - BAR_MARGIN * 2,
        BAR_H,
        p1.health,
        color(0, 220, 70)
    );
    drawCirclePortrait(fukuaPort, PORT_PAD, PORT_Y, PORT_SIZE, color(255, 215, 0));

    // Etiqueta P1 (pequeña, esquina inferior izquierda del retrato)
    noStroke();
    fill(10, 10, 10, 200);
    rect(PORT_PAD + 2, PORT_Y + PORT_SIZE - 26, 36, 22, 4);
    fill(255, 215, 0);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text("P1", PORT_PAD + 20, PORT_Y + PORT_SIZE - 15);

    // Nombre FUKUA debajo del panel
    noStroke();
    fill(255, 215, 0);
    textAlign(LEFT, TOP);
    textSize(26);
    textStyle(BOLD);
    text("★  FUKUA", PANEL_X1 + 8, PANEL_Y + PANEL_H + 6);

    // ── P2: panel película + barra + retrato ─────────
    drawFilmPanel(PANEL_X2, PANEL_Y, PANEL_W, PANEL_H, color(255, 60, 60));
    drawHealthBar_RtoL(
        PANEL_X2 + BAR_MARGIN,
        BAR_Y,
        PANEL_W - BAR_MARGIN * 2,
        BAR_H,
        p2.health,
        color(220, 30, 30)
    );
    const portX2 = width - PORT_PAD - PORT_SIZE;
    drawCirclePortrait(squiglyPort, portX2, PORT_Y, PORT_SIZE, color(255, 60, 60));

    // Etiqueta P2
    noStroke();
    fill(10, 10, 10, 200);
    rect(portX2 + PORT_SIZE - 38, PORT_Y + PORT_SIZE - 26, 36, 22, 4);
    fill(255, 80, 80);
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text("P2", portX2 + PORT_SIZE - 20, PORT_Y + PORT_SIZE - 15);

    // Nombre SQUIGLY debajo del panel
    noStroke();
    fill(255, 80, 80);
    textAlign(RIGHT, TOP);
    textSize(26);
    textStyle(BOLD);
    text("SQUIGLY  ★", PANEL_X2 + PANEL_W - 8, PANEL_Y + PANEL_H + 6);

    // ── Timer central ────────────────────────────────
    drawTimerCircle(width / 2, 68, 68);
}

// Panel estilo tira de película con puntos en borde superior e inferior
function drawFilmPanel(x, y, w, h, borderCol) {
    push();
    // Fondo del panel
    fill(12, 12, 35);
    stroke(borderCol);
    strokeWeight(3);
    rect(x, y, w, h, 10);

    // Puntos decorativos (perforaciones de película) arriba y abajo
    noStroke();
    fill(borderCol);
    const dotR   = 5;
    const dotGap = 20;
    const dotCount = floor((w - 20) / dotGap);
    for (let i = 0; i < dotCount; i++) {
        let dx = x + 10 + i * dotGap;
        ellipse(dx, y + 8,  dotR * 2);
        ellipse(dx, y + h - 8, dotR * 2);
    }
    pop();
}

// Barra de vida que se vacía de derecha a izquierda (P1 -> llena desde la izquierda)
function drawHealthBar_LtoR(x, y, w, h, hp, fillCol) {
    push();
    // Fondo negro
    fill(20, 20, 20);
    noStroke();
    rect(x, y, w, h, 8);

    // Relleno proporcional a la salud
    const fillW = map(hp, 0, 100, 0, w);
    fill(fillCol);
    rect(x, y, fillW, h, 8);

    // Brillo superior para dar volumen
    fill(255, 255, 255, 45);
    rect(x, y, fillW, h * 0.35, 8);
    pop();
}

// Barra de vida que se vacía de izquierda a derecha (P2 -> llena desde la derecha)
function drawHealthBar_RtoL(x, y, w, h, hp, fillCol) {
    push();
    fill(20, 20, 20);
    noStroke();
    rect(x, y, w, h, 8);

    const fillW = map(hp, 0, 100, 0, w);
    fill(fillCol);
    // Dibujar desde el extremo derecho
    rect(x + w - fillW, y, fillW, h, 8);

    fill(255, 255, 255, 45);
    rect(x + w - fillW, y, fillW, h * 0.35, 8);
    pop();
}

// Retrato circular con doble aro y clip real
function drawCirclePortrait(img, x, y, size, ringCol) {
    push();
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r  = size / 2;

    // Sombra sutil
    noStroke();
    fill(0, 0, 0, 100);
    ellipse(cx + 4, cy + 4, size + 24);

    // Aro exterior del color del jugador
    stroke(ringCol);
    strokeWeight(6);
    fill(25, 15, 5);
    ellipse(cx, cy, size + 18);

    // Aro dorado interior fino
    stroke(255, 215, 0);
    strokeWeight(2);
    noFill();
    ellipse(cx, cy, size + 4);

    // Imagen con clip circular
    if (img) {
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.arc(cx, cy, r, 0, Math.PI * 2);
        drawingContext.clip();
        image(img, x, y, size, size);
        drawingContext.restore();
    }
    pop();
}

// Timer central: medallón circular dorado con número grande
function drawTimerCircle(cx, cy, r) {
    push();

    // Sombra
    noStroke();
    fill(0, 0, 0, 110);
    ellipse(cx + 4, cy + 4, r * 2 + 28);

    // Aro exterior amarillo sólido
    stroke(180, 130, 0);
    strokeWeight(5);
    fill(255, 215, 0);
    ellipse(cx, cy, r * 2 + 24);

    // Puntitos en el aro exterior (decoración tipo película)
    noStroke();
    fill(255, 170, 0);
    for (let i = 0; i < 14; i++) {
        let a = TWO_PI / 14 * i;
        ellipse(
            cx + cos(a) * (r + 8),
            cy + sin(a) * (r + 8),
            7
        );
    }

    // Círculo interior oscuro
    stroke(255, 215, 0);
    strokeWeight(3);
    fill(12, 12, 35);
    ellipse(cx, cy, r * 2);

    // Aro interior dorado fino
    noStroke();
    stroke(255, 215, 0, 120);
    strokeWeight(1);
    noFill();
    ellipse(cx, cy, r * 1.7);

    // Número del timer
    noStroke();
    fill(255, 240, 0);
    textFont(selznickFont);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(56);
    text(timer, cx, cy - 6);

    // Etiqueta TIME debajo del número
    fill(255, 215, 0);
    textSize(14);
    textStyle(NORMAL);
    text("TIME", cx, cy + 30);

    pop();
}

// =====================================================
// FIN DEL HUD
// =====================================================

function startGame() {
    const menu = document.getElementById('menu-screen');
    if (menu) {
        menu.style.display = 'none';
    }

    if (typeof userStartAudio === 'function') {
        userStartAudio();
    }

    if (menuMusic && menuMusic.isPlaying()) {
        menuMusic.stop();
    }
    if (stageMusic) {
        stageMusic.setLoop(true);
        stageMusic.setVolume(0.5);
        stageMusic.loop();
    }

    gameState = 'playing';
}

function playRandomHitSound() {
    if (!hitSounds || hitSounds.length === 0) return;
    const soundFile = random(hitSounds);
    if (soundFile) {
        soundFile.play();
    }
}

function keyPressed() {

    // Q → mostrar/ocultar cajas de debug (funciona siempre)
    if (key === 'q' || key === 'Q') {
        debugBoxes = !debugBoxes;
        return;
    }

    if (gameState !== 'playing') return;

    // PLAYER 1
    if (keyCode === p1.controls.LP) p1.attack(p2, "LP");
    if (keyCode === p1.controls.MP) p1.attack(p2, "MP");
    if (keyCode === p1.controls.HP) p1.attack(p2, "HP");

    if (keyCode === p1.controls.LK) p1.attack(p2, "LK");
    if (keyCode === p1.controls.MK) p1.attack(p2, "MK");
    if (keyCode === p1.controls.HK) p1.attack(p2, "HK");

    // PLAYER 2
    if (keyCode === p2.controls.LP) p2.attack(p1, "LP");
    if (keyCode === p2.controls.MP) p2.attack(p1, "MP");
    if (keyCode === p2.controls.HP) p2.attack(p1, "HP");

    if (keyCode === p2.controls.LK) p2.attack(p1, "LK");
    if (keyCode === p2.controls.MK) p2.attack(p1, "MK");
    if (keyCode === p2.controls.HK) p2.attack(p1, "HK");
}

function showRoundWinner() {
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);

    let txt = "";
    let color1 = 255;
    let color2 = 255;
    let color3 = 255;

    if (roundWinner === 1) {
        txt = "ROUND " + currentRound + " - PLAYER 1 WINS!";
        color1 = 100; color2 = 255; color3 = 100;
    } else if (roundWinner === 2) {
        txt = "ROUND " + currentRound + " - PLAYER 2 WINS!";
        color1 = 255; color2 = 100; color3 = 100;
    } else {
        txt = "ROUND " + currentRound + " - TIE!";
        color1 = 255; color2 = 215; color3 = 0;
    }

    fill(color1, color2, color3);
    stroke(255, 255, 255);
    strokeWeight(5);
    rectMode(CENTER);
    rect(width/2, height/2 - 80, 700, 200, 20);
    rectMode(CORNER);

    fill(0);
    textFont(selznickFont);
    textSize(60);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 80);

    fill(100, 200, 255);
    textSize(32);
    textStyle(NORMAL);
    textAlign(CENTER);
    text("Score: P1 " + p1RoundsWon + " - " + p2RoundsWon + " P2", width/2, height/2 + 80);

    fill(200, 200, 200);
    textSize(18);
    text("Siguiente round en 2 segundos...", width/2, height/2 + 140);
}

function showFinalWinner(txt) {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, width, height);

    fill(255, 215, 0);
    stroke(255, 255, 0);
    strokeWeight(8);
    rectMode(CENTER);
    rect(width/2, height/2, 800, 400, 20);
    rectMode(CORNER);

    fill(0);
    textFont(selznickFont);
    textSize(100);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 80);

    fill(50);
    textSize(36);
    textStyle(NORMAL);
    text("SCORE FINAL: P1 " + p1RoundsWon + " - " + p2RoundsWon + " P2", width/2, height/2 + 40);

    fill(100);
    textSize(20);
    text("Presiona F5 para reiniciar", width/2, height/2 + 120);
}

function nextRound() {
    currentRound++;
    timer = 99;
    timerCounter = 0;
    roundEnded = false;
    roundWinner = null;

    p1.health = 100;
    p2.health = 100;

    p1.x = 200;
    p1.y = 100;
    p1.vx = 0;
    p1.vy = 0;
    p1.onGround = true;
    p1.attackCooldown = 0;
    p1.isAnimating = false;
    p1.changeState("idle");
    p1.facing = 1;

    p2.x = width - 500;
    p2.y = 100;
    p2.vx = 0;
    p2.vy = 0;
    p2.onGround = true;
    p2.attackCooldown = 0;
    p2.isAnimating = false;
    p2.changeState("idle");
    p2.facing = -1;

    console.log("=== INICIANDO ROUND " + currentRound + " ===");
}

function showWinner(txt) {
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, width, height);

    fill(255, 215, 0);
    stroke(255, 255, 255);
    strokeWeight(5);
    rectMode(CENTER);
    rect(width/2, height/2, 700, 300, 20);
    rectMode(CORNER);

    fill(0);
    textFont(selznickFont);
    textSize(80);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 40);

    fill(50);
    textSize(24);
    textStyle(NORMAL);
    text("Presiona F5 para reiniciar", width/2, height/2 + 80);
}