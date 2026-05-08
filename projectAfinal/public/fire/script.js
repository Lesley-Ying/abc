let socket;
if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
  socket = io({ path: "/lesley/port-4290/socket.io" });
} else {
  socket = io();
}
let burnButton = document.querySelector("#burnButton");
let asciiChars = " .:-=+*#%@";
let cols = 80, rows = 100;
let initialized = false;
let alpha = 0, beta = 0, gamma = 0;
let fireX, fireY;
let velX = 0, velY = 0;
let candlesOnFireSide = {};
let fireVisible = false;      // fire is being displayed
let fireFellOffScreen = false;// fire has fallen off
let audioStarted = false;     // candle audio playing

let allCandlesReady = false;  // server told us all candles are ready
let fireDisplayTimer = 0;     // frameCount when fire became visible
let fireDropping = false;     // fire is in drop phase (after 3s)
let fireDropY = 0;            // extra Y offset during drop
let trans = 0;

// burnButton.addEventListener("click", function () {
//   socket.emit("startSound")
// })

function startSocketThings() {
  console.log("setting up socket listeners")
  // inform server of my role
  socket.emit("my-role", { role: "fire" });
  //listen for if all candles are ready
  socket.on("all-candles-ready", function (data) {
    allCandlesReady = data.ready;
    console.log(allCandlesReady);

  })

}

// for debugging if computer wants to be the fire:
// setTimeout(function () {
//   console.log("device orientation works");

//   document.querySelector("#requestOrientationButton").remove();

//   if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
//     socket = io({ path: "/leon/port-4101/socket.io" });  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
//   } else {
//     socket = io();
//   }

//   startSocketThings();

//   initialized = true;
// }, 1000)

function handleOrientation(eventData) {

  if (!initialized) {
    console.log("device orientation works");

    document.querySelector("#requestOrientationButton").remove();

    // if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
    //   socket = io({ path: "/lesley/port-4290/socket.io" });  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
    // } else {
    //   socket = io();
    // }

    startSocketThings();
    initialized = true;
  }
  alpha = eventData.alpha;
  beta = eventData.beta;
  gamma = eventData.gamma;
}


function setup() {
  // setup as usual
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('p5-container');
  frameRate(14);
  textFont('Courier New');
  textSize(8);
  fireX = width / 2;
  fireY = height / 2;
  fireDropY = fireY;
}

function draw() {
  if (!initialized) return;

  // all your draw stuff
  blendMode(BLEND);
  background(0);
  blendMode(SCREEN);
  drawFireRole();
}
function drawFireRole() {
  //if fire fell off screen, nothing to draw
  if (fireFellOffScreen) return;

  //fire shows when allCandlesReady
  if (!allCandlesReady) {
    fill(80);
    textSize(14);
    textAlign(CENTER, CENTER);
    text("awaiting you", width / 2, height / 2);
    textSize(8);
    return;
  }


  // fire becomes visible, this bool for the record the frameCount only once not directly control whether display
  if (!fireVisible) {
    fireVisible = true;
    fireDisplayTimer = frameCount;
    // trigger warmth effect on all candles immediately
    //something weird here

  }

  // 3 seconds after visible, start dropping
  let elapsed = (frameCount - fireDisplayTimer) / frameRate();
  if (elapsed >= 15 && !fireDropping) {
    fireDropping = true;
    fireDropY = fireY;
  }

  if (fireDropping) {
    velY = lerp(velY, 30, 0.05);
    fireDropY += velY;

    if (fireDropY > height - 50) {
      socket.emit("ignite-candles");
      console.log("ignite-candles");
      fireFellOffScreen = true;
      setTimeout(() => {
        socket.disconnect();
      }, 500);

      velY = 0;
      return;
    }
    drawFireAscii(fireX, fireDropY, 1.5);

  } else {
    //else fire stays still
    fireX = width / 2;
    fireY = height / 2;
    if (trans < 355) {
      trans += 2;
    }
    drawFireAscii(fireX, fireY, 1.5);

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
  fill(flicker, flicker * 0.75, 50, trans);
  textSize(8 * sizeScale);
  textLeading(8 * sizeScale);
  textAlign(CENTER, BOTTOM);
  text(output, px, py);
  pop();
  applyGlow(px, py, 0.5 * sizeScale);
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


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fireX = width / 2;
  fireY = height / 2;
}






