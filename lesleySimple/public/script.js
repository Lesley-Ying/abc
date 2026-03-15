
let socket;
if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
  socket = io({ path: "/lesley/port-4290/socket.io" });
} else {
  socket = io();
}

let initialized = false;
let audio1 = document.querySelector("#audio1");

let alpha = 0, beta = 0, gamma = 0;//for gyroscope
let isBurning = false;
let warmBrightness = 0;
let candleHeight;
let maxCandleHeight = 50;
let meltRate = 0.01;
let isExtinguished = false;
let asciiChars = " .:-=+*#%@";
let cols = 80, rows = 100;
let base_y;
let sounds = [];
let mySound = null;
let mySoundIdx = null;
let betaReady = false;
let candleVisible = false;
let audioStarted = false;
let collectiveSound;
let collectiveVol = 1.0;
let fadeFactor = 0.7;

startSocketThings();

function startSocketThings() {
  console.log("setting up socket listeners")
  //do this before connecting to socket???
  socket.on("melt", function () {
    let p = document.createElement("p");
    p.innerHTML = "melting...";
    let randomDelay = Math.random() * 3000;
    setTimeout(function () {
      audio1.play();
    }, randomDelay)

    document.querySelector("#main").append(p);
  })

  // inform server of my role:candle
  socket.emit("my-role", { role: "candle" });

  socket.on("soundIdx", function (data) {
    mySoundIdx = data.idx;
    console.log(mySoundIdx);
  });

  socket.on("warm-up", function (data) {
    if (!isBurning) {
      warmBrightness = data.brightness;
    }
    //collectiveSound.play()
    if (!collectiveSound.isPlaying() && collectiveVol > 0.01) {
      loopCollectiveWithFade();
    }
  })

  socket.on("burn", function (data) {
    console.log("get burning command")
    if (!isBurning) {
      isBurning = true;
      meltRate = data.meltRate;
      warmBrightness = 0;
    }
    if (!audioStarted) {
      audioStarted = true;
      mySound = sounds[mySoundIdx];
      mySound.setLoop(true);
      mySound.play();
    }
    if (collectiveSound.isPlaying()) {
      collectiveSound.stop();
    }
  })



}

function handleOrientation(eventData) {

  if (!initialized) {
    console.log("device orientation works", audio1);
    audio1.play();
    if (getAudioContext().state !== 'running') {
      getAudioContext().resume();
    }
    document.querySelector("#requestOrientationButton").remove();

    // if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
    //   socket = io({ path: "/lesley/port-4290/socket.io" });  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
    // } else {
    //   socket = io();
    // }
    // startSocketThings();
    initialized = true;
  }
  alpha = eventData.alpha;
  beta = eventData.beta;
  gamma = eventData.gamma;

}

//load sound samples
function preload() {
  sounds.push(loadSound("assets/sound1.mp3"));
  sounds.push(loadSound("assets/sound2.mp3"));
  sounds.push(loadSound("assets/sound3.mp3"));
  sounds.push(loadSound("assets/sound5.mp3"));
  sounds.push(loadSound("assets/sound6.mp3"));
  sounds.push(loadSound("assets/sound7.mp3"));
  collectiveSound = loadSound("assets/collectiveSound.mp3");
}

function setup() {
  // setup as usual
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('p5-container');
  frameRate(14);
  textFont('Courier New');
  textSize(8);
  candleHeight = maxCandleHeight;
  base_y = rows - 10;
  collectiveSound.onended(loopCollectiveWithFade);
}

function draw() {
  if (!initialized) return;
  // all your draw stuff
  blendMode(BLEND);
  background(0);
  blendMode(SCREEN);
  drawCandleRole();
}

function drawCandleRole() {
  // check beta to show/hide candle
  betaReady = (beta >= 70 && beta <= 100);

  socket.emit("beta-status", { ready: betaReady });

  if (!betaReady && !isBurning) {
    // show "yes" hint before range achieved
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
      if (mySound && mySound.isPlaying()) {
        mySound.stop();
        // let sIdx = mySoundIdx % sounds.length
        // document.querySelector("#sound"+(sIdx+1)).pause();

      }
      socket.disconnect();
      return;
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
    //change line
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
    let screenX = originX + centerX * charW;
    let screenY = originY + wickTopY * charH;
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

function loopCollectiveWithFade() {
  if (isBurning || collectiveVol < 0.05) {
    collectiveSound.stop();
    return;
  }

  collectiveSound.setVolume(collectiveVol);
  collectiveSound.play();

  //console.log("Collective Sound Loop - Current Vol:", collectiveVol.toFixed(2));

  collectiveVol *= fadeFactor;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fireX = width / 2;
  fireY = height / 2;
}




