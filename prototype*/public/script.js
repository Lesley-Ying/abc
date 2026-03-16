let socket;
if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
    socket = io({ path: "/lesley/port-4290/socket.io" });
} else {
    socket = io();
}

let myRole = null;
let alpha = 0, beta = 0, gamma = 0;
let fireX, fireY;
let velX = 0, velY = 0;
let candlesOnFireSide = {};
let igniteDistance = 30;
let warmDistance = 150;
let isBurning = false;
let warmBrightness = 0;
let candleHeight;
let maxCandleHeight = 50;
let meltRate = 0.01;
let isExtinguished = false;
let smokeFrame = 0;
let asciiChars = " .:-=+*#%@";
let cols = 80, rows = 100;
let base_y;
let sounds = [];
let currentSound = null;
let mySoundIdx = 0;
let started = false;          // after clicking start button
let betaReady = false;        // beta in 70-100 range
let fireVisible = false;      // fire is being displayed
let fireFellOffScreen = false;// fire has fallen off
let audioStarted = false;     // candle audio playing
let candleVisible = false;    // candle visible on candle side
let allCandlesReady = false;  // server told us all candles are ready
let fireDisplayTimer = 0;     // frameCount when fire became visible
let fireDropping = false;     // fire is in drop phase (after 3s)
let fireDropY = 0;            // extra Y offset during drop


let btn = document.querySelector("#start-button");
btn.addEventListener("click", function(){
        //     // userStartAudio();
    //     // sounds[0].play();
    //     // 


    socket.on("burn", function (data) {
        if (!isBurning) {
            isBurning = true;
            meltRate = data.meltRate;
            warmBrightness = 0;
        }

        console.log("burning", mySoundIdx, sounds, audioStarted )
        if (!audioStarted && sounds.length > 0) {
            let sIdx = mySoundIdx % sounds.length
            console.log("burning", mySoundIdx, sIdx, document.querySelector("#sound"+(sIdx+1)) )
            document.querySelector("#sound"+(sIdx+1)).play();
            // audioStarted = true;
            // currentSound = sounds[mySoundIdx % sounds.length];
            // currentSound.setLoop(true);
            // currentSound.play();
            console.log("audio started, idx:", mySoundIdx);
        
        }

    });

    
        console.log("oihdoin")
        console.log( document.querySelector("#sound1"))

        document.querySelector("#sound1").play();
        setTimeout(function(){
            document.querySelector("#sound1").pause();
        }, 500)
    //     // a.play()
    //     // a.mute = false;

        requestOrientation(); 
        document.querySelector("#start-overlay").style.display = 'none';
        started = true;
})

function handleOrientation(eventData) {
    alpha = eventData.alpha;
    beta  = eventData.beta;
    gamma = eventData.gamma;
}

socket.emit("request-role");

socket.on("role", function (data, extra) {
    myRole = data;

    if (data == "fire") {
        console.log("I am fire");

        socket.on("new-candle", function (candle) {
            addCandleToFire(candle.id);
        });
        socket.on("existing-candles", function (data) {
            for (let i = 0; i < data.length; i++) {
                addCandleToFire(data[i].id);
            }
        });
        socket.on("remove-candle", function (data) {
            removeCandleFromFire(data.id);
        });
        socket.on("all-candles-ready", function (data) {
            allCandlesReady = data.ready;
        });

    } else if (data == "candle") {
        console.log("I am a candle");
        if (extra && extra.soundIdx !== undefined) {
            mySoundIdx = extra.soundIdx;
        }

        socket.on("warm-up", function (data) {
            if (!isBurning) warmBrightness = data.brightness;
        });
        
        
    }
});

function addCandleToFire(candleId) {
    let x = random(300, width - 300);
    let y = random(300, height - 300);
    candlesOnFireSide[candleId] = { id: candleId, x, y, nearness: 0 };
}
function removeCandleFromFire(candleId) {
    delete candlesOnFireSide[candleId];
}

function preload() {
    sounds.push(loadSound("assets/sound1.mp3"));
    sounds.push(loadSound("assets/sound2.mp3"));
    sounds.push(loadSound("assets/sound3.mp3"));
    sounds.push(loadSound("assets/sound4.mp3"));
    sounds.push(loadSound("assets/sound5.mp3"));
    sounds.push(loadSound("assets/sound6.mp3"));
    sounds.push(loadSound("assets/sound7.mp3"));
}

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-container');
    frameRate(14);
    textFont('Courier New');
    textSize(8);
    fireX = width / 2;
    fireY = height / 2;
    fireDropY = fireY;
    candleHeight = maxCandleHeight;
    base_y = rows - 10;

    // build start button overlay
    // let overlay = document.createElement('div');
    // overlay.id = 'start-overlay';
    // overlay.style.cssText = `
    //     position:fixed; top:0; left:0; width:100%; height:100%;
    //     background:#000; display:flex; align-items:center; justify-content:center;
    //     z-index:999;
    // `;
    // let btn = document.createElement('button');
    // btn.innerText = 'start';
    // btn.style.cssText = `
    //     background:none; border:1px solid #fff; color:#fff;
    //     font-family:'Courier New',monospace; font-size:18px;
    //     padding:14px 40px; cursor:pointer; letter-spacing:4px;
    // `;
    // btn.addEventListener('click', function () {
    //     // userStartAudio();
    //     // sounds[0].play();
    //     // document.querySelector("#sounds1").play();
    //     console.log("oihdoin")
    //     console.log( document.querySelector("#sounds1"))
    //     // a.play()
    //     // a.mute = false;

    //     requestOrientation(); 
    //     overlay.style.display = 'none';
    //     started = true;
    // });
    
    // overlay.appendChild(btn);
    // document.body.appendChild(overlay);
}

function draw() {
    blendMode(BLEND); 
    background(0);
    blendMode(SCREEN); 
    if (!started) return; 

    if (myRole == "fire") {
        drawFireRole();
    } else if (myRole == "candle") {
        drawCandleRole();
    }
}

function drawFireRole() {
    if (fireFellOffScreen) return;
    // check beta
    // let inRange = (beta >= 70 && beta <= 100);

    // if (!inRange) {
    //     // show "await you"
    //     fill(80);
    //     textSize(14);
    //     textAlign(CENTER, CENTER);
    //     text("await you", width / 2, height / 2);
    //     textSize(8);
    //     return;
    //}

    // beta in range — fire shows when allCandlesReady
    if (!allCandlesReady) {
        fill(80);
        textSize(14);
        textAlign(CENTER, CENTER);
        text("awaiting you", width / 2, height / 2);
        textSize(8);
        return;
    }

    // fire becomes visible
    if (!fireVisible) {
        fireVisible = true;
        fireDisplayTimer = frameCount;
        // trigger warmth effect on all candles immediately
        for (let id in candlesOnFireSide) {
            socket.emit("warm-candle", { id, brightness: 1 });
        }
    }

    // 3 seconds after visible, start dropping
    let elapsed = (frameCount - fireDisplayTimer) / frameRate();
    if (elapsed >= 3 && !fireDropping) {
        fireDropping = true;
        fireDropY = fireY;
    }

    if (fireDropping) {
        velY = lerp(velY, 30, 0.05); 
        fireDropY += velY;
    
        if (fireDropY > height-50) {
            for (let id in candlesOnFireSide) {
                socket.emit("ignite-candle", { id });
            }
            fireFellOffScreen = true;
            socket.disconnect();
            velY = 0;
            return;
        }
        drawFireAscii(fireX, fireDropY, 1.5);
    
    } else {
        fireX = width / 2;
        fireY = height / 2;
        drawFireAscii(fireX, fireY, 1.5);
    }

    // debug
    // fill(60);
    // noStroke();
    // textSize(10);
    // textAlign(LEFT, TOP);
    // text(`β:${nf(beta,1,0)}  γ:${nf(gamma,1,0)}`, 10, 14);
    // textSize(8);
}


function drawCandleRole() {
    // check beta to show/hide candle
    betaReady = (beta >= 70 && beta <= 100);

    socket.emit("beta-status", { ready: betaReady });

    if (!betaReady && !isBurning) {
        // show "yes" hint before range achieved, or waiting message
        fill(80);
        textSize(14);
        textAlign(CENTER, CENTER);
        text("yes", width / 2, height / 2);
        textSize(8);
        return;
    }

    // if extinguished, nothing to draw
    if (isExtinguished) return;

    // melt
    if (isBurning) {
        candleHeight -= meltRate;
        if (candleHeight <= 10) {
            isExtinguished = true;
            // if (currentSound && currentSound.isPlaying()){
            //  currentSound.stop();
            let sIdx = mySoundIdx % sounds.length
            document.querySelector("#sound"+(sIdx+1)).pause();

        // }
            socket.disconnect(); 
            return;
        }
    }

    let charW = 5;
    let charH = 8;
    let wickTopY = floor(base_y - candleHeight);
    let bodyTopY = floor(wickTopY + 4);
    let centerX  = cols / 2;
    let candleBottomScreenY = height * 0.85;
    let originX  = width / 2 - centerX * charW;
    let originY  = candleBottomScreenY - base_y * charH;
    let output   = "";

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let char = " ";

            // flame
            if (!isExtinguished && isBurning) {
                let flameHeight = 22, flameSpread = 1.6;
                if (y < bodyTopY && y > wickTopY - flameHeight) {
                    let n = noise(x * 0.1, y * 0.08 - frameCount * 0.3);
                    let dx = x - centerX;
                    let dy = y - (wickTopY - 3);
                    if (dy < 0) dy = pow(abs(dy), 0.75) * -1;
                    let d = sqrt(dx * dx + dy * dy * flameSpread);
                    let r = 10 * n + 3;
                    if (d < r) {
                        let b = floor(map(d, 0, r, asciiChars.length - 1, 0));
                        char = asciiChars[constrain(b, 0, asciiChars.length - 1)];
                    }
                }
            }

            // wick
            if (abs(x - centerX) < 0.6 && y >= wickTopY && y < bodyTopY)
                if (y == wickTopY) {
                    char = "!";
                } else {
                    char = "|";
                }

            // body
            let bodyWidth = 7;
            if (y >= bodyTopY && y < base_y) {
                if (x > centerX - bodyWidth && x < centerX + bodyWidth) {
                    if (y == bodyTopY) {
                        if (isExtinguished) {
                            char = "=";
                        } else {
                            char = "~";
                        }
                    } else {
                        let isEdge =
                            x == floor(centerX - bodyWidth + 1) ||
                            x == floor(centerX + bodyWidth - 1);

                        if (isEdge) {
                            //if is edge
                            char = "|";
                        } else {
                            //if is inside body
                            char = "H";
                        }
                    }
                }
            }

            output += char;
        }
        output += "\n";
    }

    push();
    if (isBurning) {
        fill(250, 230, 200);
    } else if (warmBrightness > 0) {
        fill(
            lerp(220, 255, warmBrightness),
            lerp(220, 180, warmBrightness),
            lerp(200, 100, warmBrightness)
        );
    } else {
        fill(120, 120, 120);
    }
    textLeading(charH);
    textAlign(LEFT, TOP);
    text(output, originX, originY);
    pop();

    // glow
    if (!isExtinguished) {
        let screenX  = originX + centerX * charW;
        let screenY  = originY + wickTopY * charH;
        let intensity;
        if (isBurning) {
          intensity = 1.4;
        } else {
          if (warmBrightness > 0) {
            intensity = 2 + warmBrightness * 0.6;
          } else {
            intensity = 0;
          }
        }
        if (intensity > 0) applyGlow(screenX, screenY, intensity);
    }

    // warm background tint — triggered by audioStarted (fire fell) or warmBrightness
    if ((warmBrightness > 0.02 || audioStarted) && !isBurning) {
        let tint = audioStarted ? 1 : warmBrightness;
        // breathing effect using sin
        let breath = map(sin(frameCount * 0.3), -1, 1, 0.5, 1.0);
        push();
        noStroke();
        fill(255, 120, 0, tint * 30 * breath);
        rect(0, 0, width, height);
        pop();
    }
}


function drawFireAscii(px, py, sizeScale) {
    sizeScale = sizeScale || 1;
    let fw = floor(20 * sizeScale), fh = floor(24 * sizeScale);
    let cx = fw / 2;
    let output = "";

    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            let char = " ";
            let n = noise(x * 0.15 / sizeScale, y * 0.1 / sizeScale - frameCount * 0.35);
            let dx = x - cx;
            let dy = y - (fh - 4);
            if (dy < 0) dy = pow(abs(dy), 0.7) * -1;
            let d = sqrt(dx * dx + dy * dy * 1.5);
            let r = (9 * n + 2) * sizeScale;
            if (d < r) {
                let b = floor(map(d, 0, r, asciiChars.length - 1, 0));
                char = asciiChars[constrain(b, 0, asciiChars.length - 1)];
            }
            output += char;
        }
        output += "\n";
    }

    push();
    let flicker = map(sin(frameCount * 0.6), -1, 1, 220, 255);
    fill(flicker, flicker * 0.75, 50);
    textSize(8 * sizeScale);
    textLeading(8 * sizeScale);
    textAlign(CENTER, BOTTOM);
    text(output, px, py);
    pop();
    applyGlow(px, py, 0.5 * sizeScale);
}

function applyGlow(screenX, screenY, intensity) {
    let glowAlpha  = map(sin(frameCount * 0.4), -1, 1, 0.75, 1.0) * intensity;
    let glowRadius = max(1, (280 + sin(frameCount * 0.4) * 20) * intensity);

    push();
    let grad = drawingContext.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowRadius);
    grad.addColorStop(0,   'rgba(0,0,0,0)');
    grad.addColorStop(0.5, "rgba(0,0,0," + (0.45 * glowAlpha) + ")");
    grad.addColorStop(1,   'rgba(0,0,0,1)');
    drawingContext.fillStyle = grad;
    rect(0, 0, width, height);
    pop();
}


function drawCandleAscii(px, py, nearness) {
    // candles no longer shown on fire side
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    fireX = width / 2;
    fireY = height / 2;
}