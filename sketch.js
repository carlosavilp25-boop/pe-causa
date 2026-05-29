console.log("Script cargado");

let bg;

let gravity = 0.8;

class Fighter {

    constructor(x, y, sprites, controls) {

        this.x = x;
        this.y = y;

        this.w = 220;
        this.h = 300;

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

        this.currentSprite = this.sprites.idle;

        this.state = "idle";

        this.stateTimer = 0;

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
    update() {

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

        // ESTADO WALK
        if (moving && this.onGround && this.attackCooldown <= 0) {

            this.changeState("walk");

        } else if (!moving && this.onGround && this.attackCooldown <= 0) {

            this.changeState("idle");
        }

        // FISICA
        this.x += this.vx;

        this.vy += gravity;

        this.y += this.vy;

        // PISO
        if (this.y >= height - 320) {

            this.y = height - 320;

            this.vy = 0;

            this.onGround = true;
        }

        // LIMITES
        this.x = constrain(this.x, 0, width - this.w);

        // COOLDOWN
        if (this.attackCooldown > 0) {

            this.attackCooldown--;

        } else {

            // VOLVER A IDLE
            if (this.onGround && !moving) {

                this.changeState("idle");
            }
        }
    }
    
    draw() {
        push();

        if (this.facing === -1) {
            translate(this.x + this.w, this.y);
            scale(-1, 1);
            image(this.currentSprite, 0, 0, this.w, this.h);
        } else {
            image(this.currentSprite, this.x, this.y, this.w, this.h);
        }

        pop();

        // Mostrar onomatopeya al recibir un golpe (fade)
        if (this.hitTimer > 0) {
            push();
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

    changeState(state) {

        this.state = state;

        this.currentSprite = this.sprites[state];
    }

    attack(enemy, type) {

        if (this.attackCooldown > 0) return;

        let damage = 0;
        let range = 0;
        let cooldown = 0;
        let attackHeight = 0.5; // Proporción vertical de donde golpea (0.5 = centro)

        switch(type){

            case "LP":
                damage = 4;
                range = 120;
                cooldown = 10;
                attackHeight = 0.4;
                this.changeState("lp");
                break;

            case "MP":
                damage = 7;
                range = 150;
                cooldown = 16;
                attackHeight = 0.5;
                this.changeState("mp");
                break;

            case "HP":
                damage = 12;
                range = 180;
                cooldown = 24;
                attackHeight = 0.6;
                this.changeState("hp");
                break;

            case "LK":
                damage = 5;
                range = 130;
                cooldown = 12;
                attackHeight = 0.7;
                this.changeState("lk");
                break;

            case "MK":
                damage = 8;
                range = 160;
                cooldown = 18;
                attackHeight = 0.6;
                this.changeState("mk");
                break;

            case "HK":
                damage = 15;
                range = 200;
                cooldown = 30;
                attackHeight = 0.5;
                this.changeState("hk");
                break;
        }

        // Posición del ataque basada en la dirección
        let attackX = this.x + this.w / 2 + (this.facing * range);
        let attackY = this.y + this.h * attackHeight;

        // Posición central del enemigo
        let enemyX = enemy.x + enemy.w / 2;
        let enemyY = enemy.y + enemy.h / 2;

        // Detección robusta: el enemigo debe estar ENFRENTE y DENTRO del rango horizontal y vertical
        let relativeX = enemyX - (this.x + this.w / 2);
        let inFront = (this.facing === 1 && relativeX > 0) || (this.facing === -1 && relativeX < 0);
        let withinRange = Math.abs(relativeX) <= range;
        let verticalTolerance = this.h * 0.5; // tolerancia vertical para el golpe
        let withinVertical = Math.abs(enemyY - attackY) <= verticalTolerance;

        if (inFront && withinRange && withinVertical) {
            enemy.health -= damage;
            console.log(type + " ¡GOLPE! Daño: " + damage);
            // Onomatopeya al recibir daño
            let onos = ["¡PAF!", "¡BAM!", "¡PUM!", "¡ZAS!", "¡BOOM!", "¡ZAC!"];
            enemy.hitText = random(onos);
            enemy.hitTimer = 45; // frames
            enemy.hitTextAlpha = 255;
        }

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
    
    // Cargar fondo
    bg = loadImage("assets/bg.png");
    console.log("Fondo cargado");

    // PLAYER 1
    window.p1sprites = {
        idle: loadImage("assets/p1/idle.png"),
        walk: loadImage("assets/p1/walk.png"),
        jump: loadImage("assets/p1/jump.png"),
        lp: loadImage("assets/p1/lp.png"),
        mp: loadImage("assets/p1/mp.png"),
        hp: loadImage("assets/p1/hp.png"),
        lk: loadImage("assets/p1/lk.png"),
        mk: loadImage("assets/p1/mk.png"),
        hk: loadImage("assets/p1/hk.png")
    };
    console.log("Sprites P1 cargados");

    // PLAYER 2
    window.p2sprites = {
        idle: loadImage("assets/p2/idle.png"),
        walk: loadImage("assets/p2/walk.png"),
        jump: loadImage("assets/p2/jump.png"),
        lp: loadImage("assets/p2/lp.png"),
        mp: loadImage("assets/p2/mp.png"),
        hp: loadImage("assets/p2/hp.png"),
        lk: loadImage("assets/p2/lk.png"),
        mk: loadImage("assets/p2/mk.png"),
        hk: loadImage("assets/p2/hk.png")
    };
    console.log("Sprites P2 cargados");
}

function setup() {
    createCanvas(1600, 900);
    
    console.log("Setup iniciado");
    console.log("p1sprites:", window.p1sprites);
    console.log("p2sprites:", window.p2sprites);
    console.log("bg:", bg);
    
    // PLAYER 1 - Izquierda
    p1 = new Fighter(250, 350, window.p1sprites, {
        left: 65,  // A
        right: 68, // D
        jump: 87,  // W
        LP: 82, MP: 84, HP: 89,   // R, T, Y
        LK: 90, MK: 88, HK: 67    // Z, X, C
    });
    
    // PLAYER 2 - Derecha
    p2 = new Fighter(width - 470, 350, window.p2sprites, {
        left: 37,  // LEFT ARROW
        right: 39, // RIGHT ARROW
        jump: 38,  // UP ARROW
        LP: 73, MP: 79, HP: 80,   // I, O, P
        LK: 75, MK: 76, HK: 186   // K, L, ;
    });
    
    console.log("Jugadores creados");
}

function draw() {

    background(255);

    if (bg) {
        image(bg, 0, 0, width, height);
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
            p1.update();
            p2.update();

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


function keyPressed() {

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
    p1.y = 350;
    p1.vx = 0;
    p1.vy = 0;
    p1.onGround = true;
    p1.attackCooldown = 0;
    p1.changeState("idle");
    p1.currentSprite = p1.sprites.idle;
    p1.facing = 1;

    p2.x = width - 470;
    p2.y = 350;
    p2.vx = 0;
    p2.vy = 0;
    p2.onGround = true;
    p2.attackCooldown = 0;
    p2.changeState("idle");
    p2.currentSprite = p2.sprites.idle;
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