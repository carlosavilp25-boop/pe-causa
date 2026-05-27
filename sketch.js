let bg;

let gravity = 0.8;

class Fighter {

    constructor(x, y, sprites, controls) {

        this.x = x;
        this.y = y;

        this.w = 160;
        this.h = 160;

        this.vx = 0;
        this.vy = 0;

        this.speed = 5;

        this.jumpForce = -15;

        this.onGround = false;

        this.health = 100;

        this.controls = controls;

        this.attackCooldown = 0;

        this.facing = 1;

        // Sprites
        this.sprites = sprites;

        this.currentSprite = this.sprites.idle;

        this.state = "idle";

        this.stateTimer = 0;
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
        if (this.y >= height - 240) {

            this.y = height - 240;

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

        switch(type){

            case "LP":
                damage = 4;
                range = 90;
                cooldown = 10;
                this.changeState("lp");
                break;

            case "MP":
                damage = 7;
                range = 110;
                cooldown = 16;
                this.changeState("mp");
                break;

            case "HP":
                damage = 12;
                range = 140;
                cooldown = 24;
                this.changeState("hp");
                break;

            case "LK":
                damage = 5;
                range = 100;
                cooldown = 12;
                this.changeState("lk");
                break;

            case "MK":
                damage = 8;
                range = 130;
                cooldown = 18;
                this.changeState("mk");
                break;

            case "HK":
                damage = 15;
                range = 170;
                cooldown = 30;
                this.changeState("hk");
                break;
        }

        let d = dist(this.x, this.y, enemy.x, enemy.y);

        if (d < range) {

            enemy.health -= damage;
        }

        this.attackCooldown = cooldown;
    }
}

let p1;
let p2;

let timer = 99;

function preload() {

    bg = loadImage("assets/bg.png");

    // PLAYER 1
    let p1sprites = {

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

    // PLAYER 2
    let p2sprites = {

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

    window.p1sprites = p1sprites;
    window.p2sprites = p2sprites;
}

function setup() {

    createCanvas(1536, 864);

    p1 = new Fighter(
        300,
        500,
        window.p1sprites,
        {
            left: 65,
            right: 68,
            jump: 87,

            LP: 70,
            MP: 71,
            HP: 72,

            LK: 86,
            MK: 66,
            HK: 78
        }
    );

    p2 = new Fighter(
        1050,
        500,
        window.p2sprites,
        {
            left: LEFT_ARROW,
            right: RIGHT_ARROW,
            jump: UP_ARROW,

            LP: 74,
            MP: 75,
            HP: 76,

            LK: 85,
            MK: 73,
            HK: 79
        }
    );

    setInterval(() => {

        if (timer > 0) {

            timer--;
        }

    }, 1000);
}

function draw() {

    image(bg, 0, 0, width, height);

    p1.update();
    p2.update();

    p1.draw();
    p2.draw();

    drawHUD();

    if (p1.health <= 0) {

        showWinner("PLAYER 2 WINS");

        noLoop();
    }

    if (p2.health <= 0) {

        showWinner("PLAYER 1 WINS");

        noLoop();
    }
}

function drawHUD() {

    fill(30);

    rect(50, 50, 500, 40);

    rect(width - 550, 50, 500, 40);

    fill(0,255,0);

    rect(50, 50, p1.health * 5, 40);

    fill(255,0,0);

    rect(width - 550, 50, p2.health * 5, 40);

    fill(255);

    textSize(50);

    textAlign(CENTER);

    text(timer, width/2, 80);
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

function showWinner(txt) {

    fill(0,180);

    rect(0,0,width,height);

    fill(255);

    textSize(80);

    textAlign(CENTER,CENTER);

    text(txt, width/2, height/2);
}