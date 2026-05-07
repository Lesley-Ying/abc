let socket;
let walkingsound;
let isPlaying = false;
let isLocked = true;
let myFingerEmoji = localStorage.getItem("myFingerEmoji") || null;
let otherFingers = {};
let depthMap = {};
let cols, rows;
let res = 1.5;
let wallTexture;
let prevTouches = {};
let mapReady = false;
let alpha = 0;
let beta = 0;
let gamma = 0;
let extraW = 1000;
if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/lesley/port-4290/socket.io" }); // yields '/leon/port-4100/socket.io' or '/socket.io'
} else {
  socket = io();
}
let mapXoffset = parseFloat(localStorage.getItem("mapXoffset")) ||0;


//if selected, don';t show options
if (myFingerEmoji) {
  document.getElementById("finger-options").style.display = "none";
  document.getElementById(
    "entry-prompt"
  ).textContent = `welcome back ${myFingerEmoji}`;
  document.getElementById("testButton").disabled = false;
  socket.emit("set-finger", { emoji: myFingerEmoji });
}
//for the first time connect
document.querySelectorAll(".finger-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".finger-btn")
      .forEach((b) => b.classList.remove("selected"));
    this.classList.add("selected");
    myFingerEmoji = this.textContent.trim();
    localStorage.setItem("myFingerEmoji", myFingerEmoji);
    document.getElementById("testButton").disabled = false;
    socket.emit("set-finger", { emoji: myFingerEmoji });
  });
});

socket.on("depth-map-init", function (data) {
  depthMap = data;
  mapReady = true;
});

socket.on("scratch-update", function (data) {
  if (!mapReady) return;
  //old version whole map array
  // for (let c of data.changes) {
  //   if (depthMap[c.i]) {
  //     depthMap[c.i][c.j] = c.v;
  //   }
  // }
  for (let c of data.changes) {
    let key = `${c.i}_${c.j}`;
    depthMap[key] = c.v;
  }
});

socket.on("finger-move", (data) => {
  if (!otherFingers[data.id]) {
    otherFingers[data.id] = {
      x: data.x,
      y: data.y,
      targetX: data.x,
      targetY: data.y,
      emoji: data.emoji,
    };
  } else {
    otherFingers[data.id].targetX = data.x;
    otherFingers[data.id].targetY = data.y;
    otherFingers[data.id].emoji = data.emoji;
  }
});

socket.on("finger-end", (data) => {
  delete otherFingers[data.id];
});

function preload() {
  walkingsound = loadSound("assets/step.mp3");
}

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("p5-canvas-container");
  let canvas = cnv.elt;

  canvas.addEventListener("touchstart", (e) => e.preventDefault(), {
    passive: false,
  });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), {
    passive: false,
  });

  //resolution grid, for depth mapping
  cols = floor(width / res);
  rows = floor(height / res);

  // for (let i = 0; i < cols; i++) {
  //   depthMap[i] = new Array(rows).fill(0);
  // }
  // for (let i = 0; i < cols; i++) {
  //   depthMap[i] = [];
  //   for (let j = 0; j < rows; j++) {
  //     depthMap[i][j] = 0;
  //   }
  // }
  //the server will only adopt the first user who connect
  // socket.emit("map-init", { cols, rows });

  //first layer white wall
  wallTexture = createGraphics(width + extraW * 2, height);
  wallTexture.noStroke();
  for (let x = 0; x < width + extraW * 2; x += res) {
    for (let y = 0; y < height; y += res) {
      let n = noise(x * 0.5, y * 0.5);
      let bright = map(n, 0, 1, 235, 255);
      wallTexture.fill(bright, bright, bright - 5);
      wallTexture.rect(x, y, res, res);
    }
  }

  noStroke();
  const lockBtn = document.querySelector("#lock-btn");
  lockBtn.addEventListener("click", function () {
    isLocked = !isLocked;
    if (isLocked) {
      lockBtn.innerHTML = "walk around";
      if (walkingsound && walkingsound.isPlaying()) {
        walkingsound.stop();
        isPlaying = false;
      }
    } else {
      lockBtn.innerHTML = "stop";
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        DeviceOrientationEvent.requestPermission();
      }
    }
  });
}
//let mapXoffset = 0;
let mapYoffset = 0;

// document.querySelector("#right").addEventListener("click", function () {
//   mapXoffset -= 100;
// });
// document.querySelector("#left").addEventListener("click", function () {
//   mapXoffset += 100;
// });

//for storing xoffset when back
let lastSaveTime = 0;
function draw() {
  // console.log(alpha, gamma)
  //background(0);
  //image(wallTexture, 0, 0);
  let now = millis();
  if (now - lastSaveTime > 1000) {
    localStorage.setItem("mapXoffset", mapXoffset);
    lastSaveTime = now;
  }
  
  if (!isLocked && abs(gamma) > 2) {
    if (!isPlaying) {
      walkingsound.loop();
      isPlaying = true;
    }
    let moveX = map(gamma, -20, 20, -2, 2, true);
    mapXoffset -= moveX;
    mapXoffset=constrain(mapXoffset,-990,990);
  } else {
    if (isPlaying) {
      walkingsound.stop();
      isPlaying = false;
    }
  }
  //for laptop
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { 
    moveX = -2; 
    mapXoffset -= moveX;
  }else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { 
    moveX = 2;
    mapXoffset -= moveX;
  }

  push();
  translate(mapXoffset, mapYoffset);
  image(wallTexture, -extraW, 0);

  for (let key in depthMap) {
    let parts = key.split("_");
    let i = parseInt(parts[0]);
    let j = parseInt(parts[1]);
    let d = depthMap[key];

    if (d > 30) {
      renderCrack(i, j, d);
    }
  }

  pop();
  
  text(": " + nfc(mapXoffset, 1), 15, 30);

  //for laptop debugging
  if (mouseIsPressed) {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    let moveDist = sqrt(dx * dx + dy * dy);
    if (moveDist > 0.5) {
      scratchAt(mouseX - mapXoffset, mouseY - mapYoffset, moveDist);
    }
  }

  //display finger emoji
  for (let id in otherFingers) {
    let f = otherFingers[id];
    f.x = lerp(f.x, f.targetX, 0.3);
    f.y = lerp(f.y, f.targetY, 0.3);
    push();
    textSize(15);
    textAlign(CENTER, CENTER);
    text(f.emoji, f.x + mapXoffset, f.y + mapYoffset);
    pop();
  }
}

//record pos for last frame
function touchStarted() {
  for (let t of touches) {
    let absX = t.x - mapXoffset;
    let absY = t.y - mapYoffset;
    prevTouches[t.id] = { x: absX, y: absY };
  }
  //return false;//error msg
}

let lastFingerEmitTime = 0;
//doesn't need to be back&forth but just move
function touchMoved() {
  for (let t of touches) {
    let prev = prevTouches[t.id];
    if (prev) {
      let absX = t.x - mapXoffset;
      let absY = t.y - mapYoffset;

      let dx = absX - prev.x;
      let dy = absY - prev.y;
      let moveDist = sqrt(dx * dx + dy * dy);

      if (moveDist > 1) {
        scratchAt(absX, absY, moveDist);
        //update last pos
        prevTouches[t.id] = { x: absX, y: absY };
      }

      //sending finger pos others
      let now = millis();
      if (myFingerEmoji && now - lastFingerEmitTime > 50) {
        socket.emit("finger-move", { x: absX, y: absY, emoji: myFingerEmoji });
        lastFingerEmitTime = now;
      }
    }
  }
}

function touchEnded() {
  socket.emit("finger-end");
  for (let id in prevTouches) {
    if (!touches.find((t) => t.id == id)) {
      delete prevTouches[id];
    }
  }
}

function renderCrack(i, j, d) {
  let x = i * res;
  let y = j * res;
  let n = noise(i * 0.5, j * 0.5);
  let nDetail = noise(i * 2.0, j * 2.0);
  let finalCol;

  if (d <= 80) {
    let br = map(d, 0, 80, 245, 255);
    finalCol = color(br, br, br - 5 + nDetail * 10);
  } else if (d > 80 && d <= 180) {
    let gray = map(n, 0, 1, 140, 180) + nDetail * 20;
    if (depthMap[`${i}_${j - 1}`] <= 80 || depthMap[`${i - 1}_${j}`] <= 80) {
      gray -= 30;
    }
    finalCol = color(gray, gray, gray - 5);
  } else if (d > 180 && d <= 255) {
    let dark = map(n, 0, 1, 60, 90) + nDetail * 15;
    finalCol = color(dark, dark + 5, dark + 10);
  } else {
    let r = 140 + n * 40;
    let g = 50 + nDetail * 20;
    let b = 40 + nDetail * 10;

    let w = 40;
    let h = 20;

    let xOffset = floor(j / h) % 2 == 0 ? 0 : w / 2;

    if ((i + xOffset) % w == 0 || j % h == 0) {
      finalCol = color(80, 75, 70);
    } else {
      if (floor((i + xOffset) / w) % 2 == 0) r -= 30;
      finalCol = color(r, g, b);
    }
  }
  fill(finalCol);
  rect(x, y, res + 0.5, res + 0.5);
}

let lastEmitTime = 0;
let pendingChanges = [];

function scratchAt(tx, ty, moveDist) {
  let mx = floor(tx / res);
  let my = floor(ty / res);
  let baseRadius = 6;
  let distFactor = min(moveDist / 8, 2.5);
  let effectiveRadius = baseRadius;

  for (let i = -effectiveRadius; i <= effectiveRadius; i++) {
    for (let j = -effectiveRadius; j <= effectiveRadius; j++) {
      let ni = mx + i;
      let nj = my + j;

      let distance = dist(i, j, 0, 0);
      if (distance < effectiveRadius) {
        let key = `${ni}_${nj}`;
        let currentVal = depthMap[key] || 0;
        if (currentVal >= 255) continue;
        let hardness = 1.0;
        if(currentVal>=80 &&currentVal<=180){
          hardness = 0.8; 
        }else if (currentVal > 180 && currentVal <= 255) {
          hardness = 0.6; 
        } 

        let damage = map(distance, 0, effectiveRadius, 3.5, 1) * random(0.1, 2);
        let crackNoise = noise(ni * 0.2, nj * 0.2);

        let newVal = Math.floor(currentVal + damage * crackNoise * distFactor* hardness);

        if (newVal > currentVal) {
          depthMap[key] = newVal;

          pendingChanges.push({ i: ni, j: nj, v: newVal });
        }
      }
    }
  }
  let now = millis();
  if (now - lastEmitTime > 100) {
    if (pendingChanges.length > 0) {
      socket.emit("scratch-update", { changes: pendingChanges });
      pendingChanges = [];
      lastEmitTime = now;
    }
  }
}
function handleOrientation(e) {
  alpha = e.alpha;
  beta = e.beta;
  gamma = e.gamma;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
