let socket;
let walkingsound;
let isPlaying = false;
let isLocked = true;
let myFingerEmoji = null;
let otherFingers = {};

if (
  location.hostname.toLowerCase().startsWith("browsercircus") ||
  location.hostname.toLowerCase().startsWith("www")
) {
  socket = io({ path: "/canvas-photo/socket.io" }); // yields '/leon/port-4100/socket.io' or '/socket.io'
} else {
  socket = io();
}

let depthMap = {};
let cols, rows;
let res = 1.5;
let wallTexture;
let prevTouches = {};
let mapReady = false;
let alpha = 0,
  beta = 0,
  gamma = 0;
let extraW = 1000; 
let mapXoffset = parseFloat(localStorage.getItem("mapXoffset")) || 0;

document.querySelectorAll(".finger-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".finger-btn").forEach(b => b.classList.remove("selected"));
    this.classList.add("selected");
    myFingerEmoji = this.textContent.trim();
    document.getElementById("testButton").disabled = false;
    // 告诉服务器我选了什么
    socket.emit("set-finger", { emoji: myFingerEmoji });
  });
});

socket.on("depth-map-init", function (data) {
  depthMap = data;
  mapReady = true;
});
socket.on("scratch-update", function (data) {
  
  if (!mapReady) return;
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
  otherFingers[data.id] = { x: data.x, y: data.y, emoji: data.emoji };
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
  for (let i = 0; i < cols; i++) {
    depthMap[i] = [];
    for (let j = 0; j < rows; j++) {
      depthMap[i][j] = 0;
    }
  }
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

  if (!isLocked) {
    if (abs(gamma) > 2) {
      moveX = map(gamma, -20, 20, -2, 2, true);
      mapXoffset -= moveX;
    }
  }
  if (!isLocked && abs(gamma) > 2) {
    if (!isPlaying) {
      walkingsound.loop();
      isPlaying = true;
    }
    let moveX = map(gamma, -20, 20, -2, 2, true);
    mapXoffset -= moveX;
  } else {
    if (isPlaying) {
      walkingsound.stop();
      isPlaying = false;
    }
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
  text("offset: " + nfc(mapXoffset, 1), 20, 50);
  
  //for laptop debugging
  if (mouseIsPressed) {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    let moveDist = sqrt(dx * dx + dy * dy);
    if (moveDist > 0.5) {
      scratchAt(mouseX - mapXoffset, mouseY - mapYoffset, moveDist);
    }
  }
  // text("Alpha: " + nfc(alpha, 1), 50, 50);
  // text("Beta: " + nfc(beta, 1), 50, 80);
  // text("Gamma: " + nfc(gamma, 1), 50, 110);
  // 在 draw() 末尾加，在pop()之后
for (let id in otherFingers) {
  let f = otherFingers[id];
  textSize(28);
  textAlign(CENTER, CENTER);
  // 转换回屏幕坐标
  text(f.emoji, f.x + mapXoffset, f.y + mapYoffset);
}

}

//record pos for last frame
function touchStarted() {
  for (let t of touches) {
    
    let absX = t.x - mapXoffset; 
    let absY = t.y - mapYoffset; 
    prevTouches[t.id] = { x: absX, y: absY };

  }
  //return false;
}


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
      if (myFingerEmoji) {
        socket.emit("finger-move", { x: absX, y: absY, emoji: myFingerEmoji });
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

// function scratchAt(tx, ty, moveDist) {
//   let mx = floor(tx / res);
//   let my = floor(ty / res);
//   let baseRadius = 6;
//   let distFactor = min(moveDist / 8, 2.5);
//   let changes = [];
//   //if pixel is near the crack, it should be easier to scratch, so detect, and change radius
//   let isNearCrack = false;
//   let checkRange = 2;

//   for (let ox = -checkRange; ox <= checkRange; ox++) {
//     for (let oy = -checkRange; oy <= checkRange; oy++) {
//       let ci = mx + ox;
//       let cj = my + oy;
//       // if (ci >= 0 && ci < cols && cj >= 0 && cj < rows) {
//       //   if (depthMap[ci][cj] > 30) {
//       //     isNearCrack = true;
//       //     break;
//       //   }
//       // }
//       if (ci >= 0 && ci < cols && cj >= 0 && cj < rows) {
//         let key = `${ci}_${cj}`;
//         let val = depthMap[key] || 0;
//         if (val > 30) {
//           isNearCrack = true;
//           break;
//         }
//       }
//     }
//   }

//   let effectiveRadius;
//   if (isNearCrack) {
//     effectiveRadius = baseRadius * 2.5;
//   } else {
//     effectiveRadius = baseRadius;
//   }

//   for (let i = -effectiveRadius; i <= effectiveRadius; i++) {
//     for (let j = -effectiveRadius; j <= effectiveRadius; j++) {
//       let ni = mx + i;
//       let nj = my + j;
//       if (ni >= 0 && ni < cols && nj >= 0 && nj < rows) {
//         let distance = dist(i, j, 0, 0);
//         if (distance < effectiveRadius) {
//           let key = `${ni}_${nj}`;
//           let currentVal = depthMap[key] || 0;
//           let damage =
//             map(distance, 0, effectiveRadius, 3.5, 1) * random(0.1, 2);
//           let crackNoise = noise(ni * 0.2, nj * 0.2);
//           let newVal = currentVal + damage * crackNoise * distFactor;
//           // depthMap[ni][nj] += damage * crackNoise * distFactor;

//           // //record and changes and push them to array
//           // changes.push({ i: ni, j: nj, v: depthMap[ni][nj] });
//           depthMap[key] = newVal;
//           changes.push({ i: ni, j: nj, v: newVal });
//         }
//       }
//     }
//   }

//   //if changes made, tell the server

//   if (changes.length > 0) {
//     socket.emit("scratch-update", { changes });
//   }
// }
// let lastEmitTime = 0;
// let pendingChanges = [];
// function scratchAt(tx, ty, moveDist) {
//   let mx = floor(tx / res);
//   let my = floor(ty / res);
//   let baseRadius = 6;
//   let distFactor = min(moveDist / 8, 2.5);
//   let changes = [];

//   let effectiveRadius = baseRadius;

//   for (let i = -effectiveRadius; i <= effectiveRadius; i++) {
//     for (let j = -effectiveRadius; j <= effectiveRadius; j++) {
//       let ni = mx + i;
//       let nj = my + j;

//       let distance = dist(i, j, 0, 0);
//       if (distance < effectiveRadius) {
//         let key = `${ni}_${nj}`;
//         let currentVal = depthMap[key] || 0;

//         let damage = map(distance, 0, effectiveRadius, 3.5, 1) * random(0.1, 2);
//         let crackNoise = noise(ni * 0.2, nj * 0.2);
//         let newVal = currentVal + damage * crackNoise * distFactor;

//         // // depthMap[key] = newVal;
//         // // changes.push({ i: ni, j: nj, v: newVal });
//         // // 关键优化：使用 floor 或 round 变成整数
//         // let roundedVal = Math.floor(newVal);

//         // if (roundedVal !== currentVal) {
//         //   // 只有数值变化了才存
//         //   depthMap[key] = roundedVal;
//         //   changes.push({ i: ni, j: nj, v: roundedVal });
//         // }
//         let lastEmitTime = 0;
// let pendingChanges = []; // 用来存放还没发给服务器的划痕
//       }
//     }
//   }

//   if (changes.length > 0) {
//     socket.emit("scratch-update", { changes });
//   }
// }

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

        let damage = map(distance, 0, effectiveRadius, 3.5, 1) * random(0.1, 2);
        let crackNoise = noise(ni * 0.2, nj * 0.2);

        
        let newVal = Math.floor(currentVal + damage * crackNoise * distFactor);

       
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
