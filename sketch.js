console.log("Script cargado");

let bg;
let selznickFont;

let gravity = 0.8;
let gameState = 'menu';

class Fighter {

    constructor(x, y, sprites, controls) {

        this.x = x;
        this.y = y;

        this.w = 300;
        this.h = 400;

        this.vx = 0;
        this.vy = 0;

        this.speed = 5;

        this.jumpForce = -15;

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
        this.drawScale = 1.1;

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
            hit_medio: { loop: false, delay: 5 }
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
        // Centro X de cada uno
        let myCenter = this.x + this.w / 2;
        let enemyCenter = enemy.x + enemy.w / 2;

        if (myCenter < enemyCenter) {
            this.facing = 1;
        } else {
            this.facing = -1;
        }
    }
    update(enemy) {

        this.vx = 0;

        let moving = false;

        // IZQUIERDA
        if (keyIsDown(this.controls.left)) {

            this.vx = -this.speed;

            this.facing = -1;

            moving = true;
        }

        // DERECHA
        if (keyIsDown(this.controls.right)) {

            this.vx = this.speed;

            this.facing = 1;

            moving = true;
        }

        // SALTO
        if (keyIsDown(this.controls.jump) && this.onGround) {

            this.vy = this.jumpForce;

            this.onGround = false;

            this.changeState("jump");
        }

        // ESTADO WALK - Solo cambiar si no estamos atacando
        if (!this.isAnimating) {
            if (moving && this.onGround && this.attackCooldown <= 0) {
                this.changeState("walk");
            } else if (!moving && this.onGround && this.attackCooldown <= 0) {
                this.changeState("idle");
            }
        }

        // FISICA
        this.x += this.vx;

        this.vy += gravity;

        this.y += this.vy;

        // PISO
        const groundY = height - this.h;
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

        // LIMITES
        this.x = constrain(this.x, 0, width - this.w);

        // COOLDOWN
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        this.updateReceiveHitBox();
        this.updateAnimation();
        this.processAttackHit(enemy);
    }
    
    draw() {
        push();

        const drawW = this.w * this.drawScale;
        const drawH = this.h * this.drawScale;
        const drawX = this.x - (drawW - this.w) / 2;
        const drawY = this.y - (drawH - this.h) / 2;

        if (this.facing === -1) {
            translate(drawX + drawW, drawY);
            scale(-1, 1);
            image(this.currentFrame, 0, 0, drawW, drawH);
        } else {
            image(this.currentFrame, drawX, drawY, drawW, drawH);
        }

        pop();

        if (this.activeAttackBox) {
            push();
            noFill();
            stroke(255, 0, 0, 180);
            strokeWeight(4);
            rect(this.activeAttackBox.x, this.activeAttackBox.y, this.activeAttackBox.w, this.activeAttackBox.h);
            pop();
        }

        if (this.receiveHitBox) {
            push();
            noFill();
            stroke(0, 180, 255, 180);
            strokeWeight(3);
            rect(this.receiveHitBox.x, this.receiveHitBox.y, this.receiveHitBox.w, this.receiveHitBox.h);
            pop();
        }

        // Mostrar onomatopeya al recibir un golpe (fade)
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
                // Animación no-looping terminada
                this.frameIndex = this.currentFrames.length - 1;
                this.isAnimating = false;
                if (this.state === 'hit_alto' || this.state === 'hit_medio') {
                    this.isHit = false;
                    this.hitState = null;
                }
                
                // Solo cambiar a idle cuando la animación termina
                if (this.onGround) {
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

        // Idle siempre puede ser interrumpido por otra animación.
        if (this.state === "idle" && state !== "idle") {
            this.isAnimating = false;
        }

        this.state = state;
        this.currentFrames = this.sprites[state] || this.sprites.idle;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameDelay = this.animationConfigs[state]?.delay || 6;
        this.currentFrame = this.currentFrames[0];
        
        // Marcar que está animando si es una animación de ataque o salto o hit
        let config = this.animationConfigs[state] || { loop: true };
        this.isAnimating = !config.loop;
    }

    receiveHit(attackHeight) {
        this.isHit = true;
        this.hitState = attackHeight <= 0.5 ? 'hit_alto' : 'hit_medio';
        this.changeState(this.hitState);
    }

    processAttackHit(enemy) {
        this.activeAttackBox = null;

        if (!enemy || !this.attackBoxes[this.state] || this.hasHit) return;

        const config = this.attackBoxes[this.state];
        if (!config.frames.includes(this.frameIndex)) return;

        const boxWidth = this.w * config.w;
        const boxHeight = this.h * config.h;
        const relativeX = this.w * config.x;
        const boxX = this.facing === 1
            ? this.x + relativeX
            : this.x + this.w - relativeX - boxWidth;
        const boxY = this.y + this.h * config.y;

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
        }
    }

    checkOverlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    updateReceiveHitBox() {
        const paddingX = this.w * 0.26;
        const paddingY = this.h * 0.08;
        this.receiveHitBox = {
            x: this.x + paddingX,
            y: this.y + paddingY,
            w: this.w - paddingX * 2,
            h: this.h - paddingY * 2
        };
    }

    attack(enemy, type) {
        // Permitir nuevos ataques incluso si hay cooldown, solo si están animando
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
let timerCounter = 0; // Contador para decrementar el timer cada segundo (60 frames)

// SISTEMA DE ROUNDS
let currentRound = 1;
let maxRounds = 3; // Mejor de 3 (primero en ganar 2)
let p1RoundsWon = 0;
let p2RoundsWon = 0;
let roundEnded = false;
let roundWinner = null;
let roundEndTimer = 0; // Contador para pasar al siguiente round después de 2 segundos

function preload() {
    console.log("Preload iniciado");
    
    // Cargar font local
    selznickFont = loadFont("assets/SelznickRemixNf-Dd3D.ttf");

    // Cargar fondo
    bg = loadImage("assets/bg.png");
    console.log("Fondo cargado");

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
        hit_medio: loadFrames("assets/p1/hit_medio", "hit mid_", 9, 2, 1)
    };
    console.log("Sprites P1 cargados");

    // PLAYER 2 - animaciones por estado (cada acción usa un arreglo de frames)
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
        hit_medio: loadFrames("assets/p2/hit_medio", "hit mid_", 9, 2, 1)
    };
    console.log("Sprites P2 cargados");
}

function setup() {
    createCanvas(1600, 900);
    
    console.log("Setup iniciado");
    console.log("p1sprites:", window.p1sprites);
    console.log("p2sprites:", window.p2sprites);
    console.log("bg:", bg);

    const startButton = select('#startButton');
    if (startButton) {
        startButton.mousePressed(startGame);
    }
    
    // PLAYER 1 - Izquierda
    p1 = new Fighter(250, 300, window.p1sprites, {
        left: 65,  // A
        right: 68, // D
        jump: 87,  // W
        LP: 82, MP: 84, HP: 89,   // R, T, Y
        LK: 70, MK: 71, HK: 72    // F, G, H
    });
    
    // PLAYER 2 - Derecha
    p2 = new Fighter(width - 470, 300, window.p2sprites, {
        left: 37,  // LEFT ARROW
        right: 39, // RIGHT ARROW
        jump: 38,  // UP ARROW
        LP: 73, MP: 79, HP: 80,   // I, O, P
        LK: 75, MK: 76, HK: 74    // K, L, J
    });
    
    console.log("Jugadores creados");
}

function draw() {

    if (gameState === 'menu') {
        background(0);
        if (bg) {
            const bgScale = 1.06;
            const bgWidth = width * bgScale;
            const bgHeight = height * bgScale;
            image(bg, -(bgWidth - width) / 2, -(bgHeight - height) / 2, bgWidth, bgHeight);
        }
        return;
    }

    background(255);

    if (bg) {
        const bgScale = 1.06;
        const bgWidth = width * bgScale;
        const bgHeight = height * bgScale;
        image(bg, -(bgWidth - width) / 2, -(bgHeight - height) / 2, bgWidth, bgHeight);
    } else {
        fill(100);
        textSize(20);
        text("BG no cargó", 20, 30);
    }

    if (p1 && p2) {
        // DECREMENTAR TIMER
        timerCounter++;
        if (timerCounter >= 60) { // Decrementar cada 60 frames (1 segundo a 60fps)
            if (timer > 0) {
                timer--;
            }
            timerCounter = 0;
        }

        // Mostrar mensajes de fin de round
        if (!roundEnded) {
            p1.update(p2);
            p2.update(p1);

            // Asegurar que siempre miren hacia el otro
            p1.orientTowards(p2);
            p2.orientTowards(p1);

            p1.draw();
            p2.draw();

            drawHUD();

            // CONDICIÓN: JUGADOR 1 PIERDE EL ROUND
            if (p1.health <= 0 && !roundEnded) {
                roundEnded = true;
                roundWinner = 2;
                p2RoundsWon++;
                console.log("ROUND " + currentRound + " GANADO POR P2. Score: P1=" + p1RoundsWon + " P2=" + p2RoundsWon);
            }

            // CONDICIÓN: JUGADOR 2 PIERDE EL ROUND
            if (p2.health <= 0 && !roundEnded) {
                roundEnded = true;
                roundWinner = 1;
                p1RoundsWon++;
                console.log("ROUND " + currentRound + " GANADO POR P1. Score: P1=" + p1RoundsWon + " P2=" + p2RoundsWon);
            }

            // CONDICIÓN: SE ACABÓ EL TIEMPO (empate en el round)
            if (timer <= 0 && p1.health > 0 && p2.health > 0 && !roundEnded) {
                roundEnded = true;
                roundWinner = 0; // Empate
                console.log("ROUND " + currentRound + " EMPATE. Score: P1=" + p1RoundsWon + " P2=" + p2RoundsWon);
            }
        } else {
            // Mostrar ganador del round durante 2 segundos, luego siguiente round
            showRoundWinner();
            
            // Contador para pasar al siguiente round (120 frames = 2 segundos a 60fps)
            roundEndTimer++;
            if (roundEndTimer >= 120) {
                roundEndTimer = 0;
                
                // Verificar si ya hay un ganador final
                if (p1RoundsWon < 2 && p2RoundsWon < 2) {
                    nextRound();
                }
            }
        }
    } else {
        fill(255, 0, 0);
        textSize(20);
        text("Jugadores no inicializados", 20, 60);
    }

    // CONDICIÓN: GANADOR FINAL (Mejor de 3)
    if (p1RoundsWon >= 2) {
        showFinalWinner("PLAYER 1 WINS THE MATCH!");
        noLoop();
    }

    if (p2RoundsWon >= 2) {
        showFinalWinner("PLAYER 2 WINS THE MATCH!");
        noLoop();
    }
}

function drawHUD() {
    
    // FONDO SEMI-TRANSPARENTE DEL HUD
    fill(0, 0, 0, 60);
    noStroke();
    rect(0, 0, width, 140);
    
    // ===== JUGADOR 1 (IZQUIERDA) =====
    
    // Sombra de la caja
    fill(0, 0, 0, 40);
    rect(30, 25, 550, 90, 15);
    
    // Caja principal P1
    fill(30, 30, 60);
    stroke(255, 215, 0);
    strokeWeight(4);
    rect(25, 20, 550, 90, 15);
    
    // Nombre del jugador con estilo
    fill(255, 215, 0);
    textSize(18);
    textStyle(BOLD);
    textAlign(LEFT);
    text("P1", 45, 40);
    
    // Rounds ganados (mostrando coronitas o puntos)
    fill(255, 215, 0);
    textSize(12);
    text("ROUNDS: ", 45, 60);
    for (let i = 0; i < p1RoundsWon; i++) {
        text("●", 130 + (i * 15), 60);
    }
    
    // BARRA DE VIDA BACKGROUND
    fill(40, 20, 20);
    noStroke();
    rect(95, 35, 460, 30, 8);
    
    // BARRA DE VIDA RELLENO CON GRADIENTE
    let healthP1 = p1.health * 4.6; // 100 * 4.6 = 460px
    fill(0, 220, 100);
    if (p1.health < 30) fill(255, 100, 0);
    if (p1.health < 15) fill(255, 50, 50);
    rect(95, 35, healthP1, 30, 8);
    
    // Efecto de brillo en la barra
    fill(255, 255, 255, 80);
    rect(95, 35, healthP1, 12, 8);
    
    // Texto de salud
    fill(255);
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER);
    text(int(p1.health) + " / 100", 325, 55);
    
    // Estado de salud
    textSize(11);
    textAlign(RIGHT);
    if (p1.health > 60) text("BUENA", 555, 73);
    else if (p1.health > 30) text("MEDIA", 555, 73);
    else text("CRÍTICA", 555, 73);
    
    // ===== JUGADOR 2 (DERECHA) =====
    
    // Sombra de la caja
    fill(0, 0, 0, 40);
    rect(width - 580, 25, 550, 90, 15);
    
    // Caja principal P2
    fill(60, 30, 30);
    stroke(255, 100, 100);
    strokeWeight(4);
    rect(width - 575, 20, 550, 90, 15);
    
    // Nombre del jugador con estilo
    fill(255, 100, 100);
    textSize(18);
    textStyle(BOLD);
    textAlign(RIGHT);
    text("P2", width - 45, 40);
    
    // Rounds ganados
    fill(255, 100, 100);
    textSize(12);
    textAlign(LEFT);
    text("ROUNDS: ", width - 555, 60);
    for (let i = 0; i < p2RoundsWon; i++) {
        text("●", width - 440 + (i * 15), 60);
    }
    
    // BARRA DE VIDA BACKGROUND
    fill(40, 20, 20);
    noStroke();
    rect(width - 555, 35, 460, 30, 8);
    
    // BARRA DE VIDA RELLENO CON GRADIENTE
    let healthP2 = p2.health * 4.6;
    fill(220, 0, 0);
    if (p2.health < 30) fill(255, 100, 0);
    if (p2.health < 15) fill(255, 50, 50);
    rect(width - 555, 35, healthP2, 30, 8);
    
    // Efecto de brillo en la barra
    fill(255, 255, 255, 80);
    rect(width - 555, 35, healthP2, 12, 8);
    
    // Texto de salud
    fill(255);
    textSize(14);
    textStyle(NORMAL);
    textAlign(CENTER);
    text(int(p2.health) + " / 100", width - 325, 55);
    
    // Estado de salud
    textSize(11);
    textAlign(LEFT);
    if (p2.health > 60) text("BUENA", width - 555, 73);
    else if (p2.health > 30) text("MEDIA", width - 555, 73);
    else text("CRÍTICA", width - 555, 73);
    
    // ===== TIMER CENTRAL =====
    
    // Sombra del timer
    fill(0, 0, 0, 80);
    ellipse(width / 2, 80, 110, 110);
    
    // Círculo de fondo del timer
    fill(255, 215, 0);
    stroke(255, 255, 0);
    strokeWeight(4);
    ellipse(width / 2, 75, 100, 100);
    
    // Círculo interior oscuro
    fill(40, 30, 0);
    noStroke();
    ellipse(width / 2, 75, 85, 85);
    
    // Número del timer
    fill(255, 215, 0);
    textSize(56);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text(timer, width / 2, 78);
    
    // Etiqueta de round y tiempo
    fill(200, 180, 0);
    textSize(10);
    textAlign(CENTER);
    text("ROUND " + currentRound, width / 2, 110);
    
    noStroke();
}


function startGame() {
    const menu = document.getElementById('menu-screen');
    if (menu) {
        menu.style.display = 'none';
    }
    gameState = 'playing';
}

function keyPressed() {

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
    // Fondo semi-transparente oscuro
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);

    // Determinar texto del round
    let txt = "";
    let color1 = 255;
    let color2 = 255;
    let color3 = 255;

    if (roundWinner === 1) {
        txt = "ROUND " + currentRound + " - PLAYER 1 WINS!";
        color1 = 100;
        color2 = 255;
        color3 = 100;
    } else if (roundWinner === 2) {
        txt = "ROUND " + currentRound + " - PLAYER 2 WINS!";
        color1 = 255;
        color2 = 100;
        color3 = 100;
    } else {
        txt = "ROUND " + currentRound + " - TIE!";
        color1 = 255;
        color2 = 215;
        color3 = 0;
    }

    // Caja del mensaje
    fill(color1, color2, color3);
    stroke(255, 255, 255);
    strokeWeight(5);
    rectMode(CENTER);
    rect(width/2, height/2 - 80, 700, 200, 20);
    rectMode(CORNER);

    // Texto principal
    fill(0);
    textSize(60);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 80);

    // Score actual
    fill(100, 200, 255);
    textSize(32);
    textStyle(NORMAL);
    textAlign(CENTER);
    text("Score: P1 " + p1RoundsWon + " - " + p2RoundsWon + " P2", width/2, height/2 + 80);

    // Siguiente round
    fill(200, 200, 200);
    textSize(18);
    text("Siguiente round en 2 segundos...", width/2, height/2 + 140);
}

function showFinalWinner(txt) {

    // Fondo semi-transparente oscuro
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, width, height);

    // Caja del mensaje
    fill(255, 215, 0);
    stroke(255, 255, 0);
    strokeWeight(8);
    rectMode(CENTER);
    rect(width/2, height/2, 800, 400, 20);
    rectMode(CORNER);

    // Texto principal
    fill(0);
    textSize(100);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 80);

    // Score final
    fill(50);
    textSize(36);
    textStyle(NORMAL);
    text("SCORE FINAL: P1 " + p1RoundsWon + " - " + p2RoundsWon + " P2", width/2, height/2 + 40);

    // Subtexto
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

    // Restaurar salud
    p1.health = 100;
    p2.health = 100;
    // Restaurar posiciones, velocidades y estados a valores iniciales
    p1.x = 250;
    p1.y = 300;
    p1.vx = 0;
    p1.vy = 0;
    p1.onGround = true;
    p1.attackCooldown = 0;
    p1.isAnimating = false;
    p1.changeState("idle");
    p1.facing = 1;

    p2.x = width - 470;
    p2.y = 300;
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

    // Fondo semi-transparente oscuro
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, width, height);

    // Caja del mensaje
    fill(255, 215, 0);
    stroke(255, 255, 255);
    strokeWeight(5);
    rectMode(CENTER);
    rect(width/2, height/2, 700, 300, 20);
    rectMode(CORNER);

    // Texto principal
    fill(0);
    textSize(80);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(txt, width/2, height/2 - 40);

    // Subtexto
    fill(50);
    textSize(24);
    textStyle(NORMAL);
    text("Presiona F5 para reiniciar", width/2, height/2 + 80);
}