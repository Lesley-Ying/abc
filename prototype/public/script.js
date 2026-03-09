
let socket;
if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
    socket = io({ path: "/lesley/port-4290/socket.io" });
} else {
    socket = io();
}

// let readyButton = document.querySelector("#ready");
//let mainWrapper = document.querySelector(".main-wrapper")

let myRole = null;
//gyroscope
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
let sound1;
let sounds=[];
let currentSound=null;


function handleOrientation(eventData) {
    alpha = eventData.alpha;
    beta = eventData.beta;
    gamma = eventData.gamma;
}

//get role from server
socket.emit("request-role");

socket.on("role", function (data) {
    myRole = data;
    if (data == "fire") {
        console.log("I am fire");
        //request button
        document.querySelector('#requestOrientationButton').style.display = "block";
        //add new candle on fire's side
        socket.on("new-candle", function (candle) {
            addCandleToFire(candle.id);
        });
        //old fire disconnect, new fire log on
        socket.on("existing-candles", function (data) {
            for (let i = 0; i < data.length; i++) {
                let candle = data[i];
                addCandleToFire(candle.id);
            }
        });
        socket.on("remove-candle", function (data) {
            removeCandleFromFire(data.id);
        });

    } else if (data == "candle") {
        console.log("I am a candle");
        //request button
        document.querySelector('#requestOrientationButton').style.display = "block";

        //background brightness?
        socket.on("warm-up", function (data) {
            if (!isBurning) {
                warmBrightness = data.brightness;
            }
        });
        //add fire to the candle side
        socket.on("burn", function () {
            if (!isBurning) {
                isBurning = true;
                meltRate = 0.35;
                warmBrightness = 0;
            }
            //start a random sound
            currentSound = random(sounds); 
            currentSound.setLoop(true);
            currentSound.play();
            
            console.log("burn")
        });
    }
});

function addCandleToFire(candleId) {
    let x = random(300, width - 300);
    let y = random(300, height - 300);
    let wickOffset = 100;
    candlesOnFireSide[candleId] = { id: candleId, x, y, wickOffset, nearness: 0 };
}
function removeCandleFromFire(candleId) {
    delete candlesOnFireSide[candleId];
}

function preload() {
    sounds.push(loadSound("assets/sound1.mp3"));
    sounds.push(loadSound("assets/sound2.mp3"));
    sounds.push(loadSound("assets/sound3.mp3"));
    
}
function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-container');
    frameRate(14);
    textFont('Courier New');
    textSize(8);
    //big fire center
    fireX = width / 2;
    fireY = height / 2;
    candleHeight = maxCandleHeight;
    //bottom line for candle
    base_y = rows - 10;
}

function draw() {
    //blendMode(SCREEN);
    background(0);
    if (myRole == "fire") {
        drawFireRole();
    } else if (myRole == "candle") {
        drawCandleRole();
    }
    //test bug
    // } else {
    //     fill(80);
    //     textSize(14);
    //     textAlign(CENTER, CENTER);
    //     text("connecting", width / 2, height / 2);
    // }
}


function drawFireRole() {
    //use gyroscope to control
    let targetVX = map(constrain(gamma, -45, 45), -45, 45, -18, 18);
    let targetVY = map(constrain(beta, -45, 45), -45, 45, -18, 18);
    //some resistance
    velX = lerp(velX, targetVX, 0.2);
    velY = lerp(velY, targetVY, 0.2);
    fireX = constrain(fireX + velX, 40, width - 40);
    fireY = constrain(fireY + velY, 110, height - 40);

    for (let id in candlesOnFireSide) {
        let c = candlesOnFireSide[id];
        let d = dist(fireX, fireY, c.x, c.y);

        //map distance to nearness, further be used to play with warmbrightness
        let n = map(d, 0, warmDistance, 1, 0);
        //constrain in case turns negative
        c.nearness = constrain(n, 0, 1);

        // ignite: distance to wick tip (higher wickOffset = wick is lower = harder to reach)
        let wickY = c.y - c.wickOffset;
        let dWick = dist(fireX, fireY, c.x, wickY);

        if (dWick < igniteDistance) {
            socket.emit("ignite-candle", { id });
            delete candlesOnFireSide[id];
            //continue;
        }
        drawCandleAscii(c.x, c.y, c.nearness);
    }

    //if (frameCount % 7 === 0) {
    for (let id in candlesOnFireSide) {
        let c = candlesOnFireSide[id];
        let d = dist(fireX, fireY, c.x, c.y);
        let brightness;
        if (d < warmDistance) {
            brightness = c.nearness;
        } else {
            //too far--no heating effect
            brightness = 0;
        }
        socket.emit("warm-candle", { id, brightness });
    }
    //}

    //draw fire
    drawFireAscii(fireX, fireY);

}



function drawCandleRole() {
    if (isBurning && !isExtinguished) {
        candleHeight -= meltRate;
        if (candleHeight <= 10) {
            isExtinguished = true;
            //when candle burns out, sound stop playing
            if (currentSound && currentSound.isPlaying()){
                currentSound.stop();
            } 
           
        }
    }

    let charW = 5;
    let charH = 8;
    let wickTopY = floor(base_y - candleHeight);
    let bodyTopY = floor(wickTopY + 4);
    let centerX = cols / 2;
    let candleBottomScreenY = height * 0.85;
    let originX = width / 2 - centerX * charW;
    let originY = candleBottomScreenY - base_y * charH;
    let output = "";

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let char = " ";
            if (!isExtinguished && isBurning) {
                let flameHeight = 22;
                let flameSpread = 1.6;
                if (y < bodyTopY && y > wickTopY - flameHeight) {
                    let n = noise(x * 0.1, y * 0.08 - frameCount * 0.3);
                    let dx = x - centerX;
                    let dy = y - (wickTopY - 3);
                    if (dy < 0) {
                        dy = pow(abs(dy), 0.75) * -1;
                    }
                    let d = sqrt(dx * dx + dy * dy * flameSpread);
                    let r = 10 * n + 3;
                    if (d < r) {
                        let b = floor(map(d, 0, r, asciiChars.length - 1, 0));
                        char = asciiChars[constrain(b, 0, asciiChars.length - 1)];
                    }
                }
            }

            if (abs(x - centerX) < 0.6 && y >= wickTopY && y < bodyTopY) {
                if (isExtinguished) {
                    char = "i";
                } else {
                    char = "|";
                }
            }
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
                            x === floor(centerX - bodyWidth + 1) ||
                            x === floor(centerX + bodyWidth - 1);

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
        //change line
        output += "\n";
    }


    push();
    if (isExtinguished) {
        let a = map(smokeFrame, 0, 120, 255, 0);
        fill(160, 160, 160, a);
    } else if (isBurning) {
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


    if (!isExtinguished) {
        let screenX = originX + centerX * charW;
        let screenY = originY + wickTopY * charH;
        let intensity = 0;
        if (isBurning) {
            intensity = 1.4;
        } else if (warmBrightness > 0) {
            intensity = 2 + warmBrightness * 0.6;
        }
        if (intensity > 0) {
            applyGlow(screenX, screenY, intensity);
        }
    }


    if (warmBrightness > 0.02 && !isBurning) {
        push();
        noStroke();
        //if very close, "background" color changes
        fill(255, 120, 0, warmBrightness * 30);
        rect(0, 0, width, height);
        pop();
    }
}

function drawFireAscii(px, py) {
    let fw = 20, fh = 24;
    let cx = fw / 2;
    let output = "";

    for (let y = 0; y < fh; y++) {
        for (let x = 0; x < fw; x++) {
            let char = " ";
            let n = noise(x * 0.15, y * 0.1 - frameCount * 0.35);
            let dx = x - cx;
            let dy = y - (fh - 4);
            if (dy < 0) dy = pow(abs(dy), 0.7) * -1;
            let d = sqrt(dx * dx + dy * dy * 1.5);
            let r = 9 * n + 2;
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
    textLeading(8);
    textAlign(CENTER, BOTTOM);
    text(output, px, py);
    pop();
    applyGlow(px, py, 0.5);
}


function drawCandleAscii(px, py, nearness) {
    let cw = 12, ch = 20;
    let cx = cw / 2;
    let output = "";

    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            let char = " ";
            let wickTopY = 4, bodyTopY = 6, bodyBotY = ch - 2, bodyW = 3;

            if (nearness > 0.85 && y < bodyTopY && y >= wickTopY - 3) {
                let n = noise(x * 0.2, y * 0.15 - frameCount * 0.3);
                let dx = x - cx;
                let dy = y - (wickTopY - 1);
                if (dy < 0) dy = pow(abs(dy), 0.7) * -1;
                let d = sqrt(dx * dx + dy * dy * 2);
                let r = 4 * n + 1;
                if (d < r) {
                    let b = floor(map(d, 0, r, asciiChars.length - 1, 0));
                    char = asciiChars[constrain(b, 0, asciiChars.length - 1)];
                }
            }
            //for the wick
            if (abs(x - cx) < 0.6 && y >= wickTopY && y < bodyTopY) {
                if (y == wickTopY) {
                    char = "!";
                } else {
                    char = "|";
                }
            }
            //for the candle body
            if (y >= bodyTopY && y < bodyBotY && abs(x - cx) <= bodyW) {
                if (y == bodyTopY) {
                    char = "~";
                }
                else if (abs(x - cx) == bodyW) {
                    //edge
                    char = "|";
                }
                else {
                    //body
                    char = "H";
                }
            }

            output += char;
        }
        output += "\n";
    }

    push();
    fill(
        lerp(200, 255, nearness),
        lerp(200, 160, nearness),
        lerp(180, 60, nearness)
    );
    textLeading(8);
    textAlign(CENTER, BOTTOM);
    text(output, px, py);
    pop();
}

//this is a black cover
function applyGlow(screenX, screenY, intensity) {
    let glowAlpha = map(sin(frameCount * 0.4), -1, 1, 0.75, 1.0) * intensity;
    let glowRadius = max(1, (280 + sin(frameCount * 0.4) * 20) * intensity);

    push();
    let grad = drawingContext.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowRadius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, "rgba(0,0,0," + (0.45 * glowAlpha) + ")");
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    drawingContext.fillStyle = grad;
    rect(0, 0, width, height);
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    fireX = width / 2;
    fireY = height / 2;
}