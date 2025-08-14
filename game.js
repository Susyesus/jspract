// --- Canvas setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Area ---
let area = {
    width: 550,
    height: 400,
    x: (canvas.width - 550) / 2,
    y: (canvas.height - 400) - 50
};

// --- Load images ---
const bgImage = new Image();
bgImage.src = "moves/moves/background.png";

const areaImage = new Image();
areaImage.src = "moves/moves/area.png";

const walkRight = [], walkLeft = [];
const jumpUp = [];
const idle = new Image();
idle.src = "moves/moves/idle-1.png";

const dock = [];
for (let i = 1; i <= 5; i++) {
    dock.push(new Image());
    dock[i - 1].src = `moves/moves/dock-${i}.png`;
}
for (let i = 1; i <= 5; i++) {
    walkRight.push(new Image());
    walkRight[i - 1].src = `moves/moves/right-${i}.png`;
    walkLeft.push(new Image());
    walkLeft[i - 1].src = `moves/moves/left-${i}.png`;
}
for (let i = 1; i <= 7; i++) {
    jumpUp.push(new Image());
    jumpUp[i - 1].src = `moves/moves/jump-${i}.png`;
}

// --- Player template ---
const spriteWidth = 256;
const spriteHeight = 256;
const scale = 0.5;

// --- Player object ---
let player = createPlayer();
function createPlayer() {
    return {
        width: spriteWidth * scale,
        height: spriteHeight * scale,
        x: (canvas.width - spriteWidth * scale) / 2,
        y: area.y - spriteHeight * scale,
        speedX: 0,
        speedY: 0,
        gravity: 0.5,
        jumpStrength: -12,
        onGround: true,
        direction: "right",
        state: "idle",
        prevState: "idle",
        frameIndex: 0,
        frameTimer: 0,
        frameSpeed: 8,
        dockFinished: false,
        hp: 100,
        maxHp: 100,
        alive: true
    };
}

// --- Keyboard input ---
let keys = {};
window.addEventListener("keydown", function(e) {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

// --- Bullets ---
let bullets = [];
const bulletSpeed = 5;
const bullet_h = new Image();
bullet_h.src = "moves/moves/bullet_h.png";
const bullet_v = new Image();
bullet_v.src = "moves/moves/bullet_v.png";
function spawnBullet() {
    const edge = Math.random() < 0.5 ? "top" : "right";
    let bullet = { x:0, y:0, vx:0, vy:0, img:null, width:32, height:32 };
    if(edge === "top"){ bullet.x = Math.random()*canvas.width; bullet.y=-bullet.height; bullet.vy=bulletSpeed; bullet.img = bullet_v; }
    else{ bullet.x = canvas.width; bullet.y=Math.random()*canvas.height; bullet.vx=-bulletSpeed; bullet.img = bullet_h; }
    bullets.push(bullet);
}
setInterval(spawnBullet, 1000);

// --- Cherries ---
let cherries = [];
const cherrySpeed = 3;
const cherryImg = new Image();
cherryImg.src = "moves/moves/cherry.png";
function spawnCherry() {
    const edge = Math.random() < 0.5 ? "top" : "right";
    let cherry = { x:0, y:0, vx:0, vy:0, width:32, height:32, img:cherryImg };
    if(edge === "top"){ cherry.x = Math.random()*canvas.width; cherry.y=-cherry.height; cherry.vy=cherrySpeed; }
    else{ cherry.x = canvas.width; cherry.y=Math.random()*canvas.height; cherry.vx=-cherrySpeed; }
    cherries.push(cherry);
}
setInterval(spawnCherry, 3000);

// --- Handle resize ---
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    area.x = (canvas.width - area.width) / 2;
    area.y = (canvas.height - area.height) - 50;
    player.y = area.y - player.height;
});

// --- Wait for images ---
const images = [bgImage, areaImage, idle, ...walkRight, ...walkLeft, ...jumpUp, ...dock, bullet_h, bullet_v, cherryImg];
let loadedCount = 0;
images.forEach(img=>{ img.onload = ()=>{ loadedCount++; if(loadedCount===images.length) requestAnimationFrame(gameLoop); } });

// --- Restart game ---
function restartGame() {
    player = createPlayer();
    bullets = [];
    cherries = [];
    requestAnimationFrame(gameLoop);
}

// --- Game loop ---
function gameLoop() {
    if(!player.alive){
        player.state="idle"; player.frameIndex=0; player.frameTimer=0;
        alert("You died!");
        restartGame();
        return;
    }

    ctx.drawImage(bgImage,0,0,canvas.width,canvas.height);

    // --- Player movement ---
    let moving=false;
    if(keys["ArrowRight"]){ player.x+=5; player.direction="right"; moving=true; }
    if(keys["ArrowLeft"]){ player.x-=5; player.direction="left"; moving=true; }
    if((keys["ArrowUp"]||keys["Space"])&&player.onGround){ player.speedY=player.jumpStrength; player.onGround=false; }

    player.speedY += player.gravity;
    player.y += player.speedY;

    // --- Area collision ---
    player.onGround = false;
    if(player.x<area.x+area.width && player.x+player.width>area.x &&
       player.y+player.height>=area.y && player.y+player.height-player.speedY<=area.y){
        player.y = area.y - player.height;
        player.speedY = 0;
        player.onGround = true;
    }

    // --- Death by falling ---
    if(player.y>canvas.height){ player.alive=false; player.state="idle"; player.frameIndex=0; player.frameTimer=0; }

    // --- Player state ---
    if(!player.onGround) player.state="jump";
    else if(keys["ArrowDown"]&&player.onGround) player.state="dock";
    else if(moving) player.state="walk";
    else player.state="idle";

    if(player.state!==player.prevState){
        player.frameIndex=0;
        player.frameTimer=0;
        if(player.state!=="dock") player.dockFinished=false;
    }
    player.prevState = player.state;

    let animFrames;
    switch(player.state){
        case "walk": animFrames = player.direction==="right"?walkRight:walkLeft; break;
        case "jump": animFrames = jumpUp; break;
        case "dock": animFrames = dock; break;
        case "idle": animFrames = [idle]; break;
        default: animFrames=walkRight;
    }

    player.frameTimer++;
    if(player.state==="dock"){
        if(!player.dockFinished && player.frameTimer>=player.frameSpeed){
            player.frameTimer=0;
            if(player.frameIndex<dock.length-1) player.frameIndex++;
            else player.dockFinished=true;
        }
    }else{
        if(player.frameTimer>=player.frameSpeed){
            player.frameTimer=0;
            player.frameIndex=(player.frameIndex+1)%animFrames.length;
        }
    }

    let drawHeight = player.height;
    let drawY = player.y;
    if(player.state==="dock"){ drawHeight = player.height*0.6; drawY = player.y + (player.height-drawHeight); }

    ctx.drawImage(areaImage, area.x, area.y, area.width, area.height);
    ctx.drawImage(animFrames[player.frameIndex], player.x, drawY, player.width, drawHeight);

    // --- Update bullets ---
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.x+=b.vx; b.y+=b.vy;

        if(b.x<-b.width||b.x>canvas.width||b.y<-b.height||b.y>canvas.height){ bullets.splice(i,1); continue; }

        if(player.x<b.x+b.width && player.x+player.width>b.x && player.y<b.y+b.height && player.y+player.height>b.y){
            player.hp-=10; bullets.splice(i,1);
            if(player.hp<=0){ player.alive=false; player.state="idle"; player.frameIndex=0; player.frameTimer=0; }
            continue;
        }
        ctx.drawImage(b.img,b.x,b.y,b.width,b.height);
    }

    // --- Update cherries ---
    for(let i=cherries.length-1;i>=0;i--){
        const c=cherries[i];
        c.x+=c.vx; c.y+=c.vy;

        if(c.x<-c.width||c.x>canvas.width||c.y<-c.height||c.y>canvas.height){ cherries.splice(i,1); continue; }

        if(player.x<c.x+c.width && player.x+player.width>c.x && player.y<c.y+c.height && player.y+player.height>c.y){
            player.hp+=20; if(player.hp>player.maxHp) player.hp=player.maxHp;
            cherries.splice(i,1);
            continue;
        }
        ctx.drawImage(c.img,c.x,c.y,c.width,c.height);
    }

    // --- HP bar ---
    const barWidth=200, barHeight=20, padding=20;
    const x = canvas.width-barWidth-padding;
    const y = canvas.height-barHeight-padding;
    ctx.fillStyle="#555"; ctx.fillRect(x,y,barWidth,barHeight);
    ctx.fillStyle="#f00"; ctx.fillRect(x,y,barWidth*(player.hp/player.maxHp),barHeight);
    ctx.strokeStyle="#000"; ctx.lineWidth=2; ctx.strokeRect(x,y,barWidth,barHeight);

    requestAnimationFrame(gameLoop);
}
