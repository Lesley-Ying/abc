document.querySelector("#testButton").addEventListener("click", function(){
  console.log("hahahah")
  alert("ha")
})

let socket;
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
let alpha = 0, beta = 0, gamma = 0;

socket.on("depth-map-init", function (data) {
  depthMap = data;
  mapReady = true;
});
socket.on("scratch-update", function (data) {
  console.log("scratch update")
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

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent("p5-canvas-container")
  let canvas = cnv.elt;

  // canvas.addEventListener("touchstart", (e) => e.preventDefault(), {
  //   passive: false,
  // });
  // canvas.addEventListener("touchmove", (e) => e.preventDefault(), {
  //   passive: false,
  // });

  //resolution grid, for depth mapping
  cols = floor(width / res);
  rows = floor(height / res);

  //   for (let i = 0; i < cols; i++) {
  //     depthMap[i] = new Array(rows).fill(0);
  //   }
  for (let i = 0; i < cols; i++) {
    depthMap[i] = [];
    for (let j = 0; j < rows; j++) {
      depthMap[i][j] = 0;
    }
  }
  //the server will only adopt the first user who connect
  // socket.emit("map-init", { cols, rows });

  //first layer white wall
  wallTexture = createGraphics(width, height);
  wallTexture.noStroke();
  for (let x = 0; x < width; x += res) {
    for (let y = 0; y < height; y += res) {
      let n = noise(x * 0.5, y * 0.5);
      let bright = map(n, 0, 1, 240, 255);
      wallTexture.fill(bright, bright, bright - 5);
      wallTexture.rect(x, y, res, res);
    }
  }

  noStroke();
}

function draw() {
  image(wallTexture, 0, 0);
  for (let key in depthMap) {
    let parts = key.split("_");
    let i = parseInt(parts[0]);
    let j = parseInt(parts[1]);
    let d = depthMap[key];

    if (d > 30) {
      renderCrack(i, j, d);
    }
  }
  // for (let i = 1; i < cols - 1; i++) {
  //   for (let j = 1; j < rows - 1; j++) {
  //     let d = depthMap[i][j];
  //     if (d > 30) {
  //       renderCrack(i, j, d);
  //     }
  //   }
  // }

  //for laptop debugging
  if (mouseIsPressed) {
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    let moveDist = sqrt(dx * dx + dy * dy);
    if (moveDist > 0.5) {
      scratchAt(mouseX, mouseY, moveDist);
    }
  }
  // text("Alpha: " + nfc(alpha, 1), 50, 50);
  // text("Beta: " + nfc(beta, 1), 50, 80);
  // text("Gamma: " + nfc(gamma, 1), 50, 110);
}

//record pos for last frame
function touchStarted() {
  for (let t of touches) {
    prevTouches[t.id] = { x: t.x, y: t.y };
  }
  //return false;
}

//doesn't need to be back&forth but just move
function touchMoved() {
  for (let t of touches) {
    let prev = prevTouches[t.id];
    if (prev) {
      let dx = t.x - prev.x;
      let dy = t.y - prev.y;
      let moveDist = sqrt(dx * dx + dy * dy);
      if (moveDist > 1) {
        scratchAt(t.x, t.y, moveDist);
        //update last pos
        prevTouches[t.id] = { x: t.x, y: t.y };
      }
    }
  }
  return false;
}

function touchEnded() {
  for (let id in prevTouches) {
    if (!touches.find((t) => t.id == id)) {
      delete prevTouches[id];
    }
  }
  return false;
}

// //basically now for the wall, different color for 3 dep level
// function renderCrack(i, j, d) {
//   let x = i * res;
//   let y = j * res;
//   let n = noise(i * 0.8, j * 0.8);
//   let baseCol = color(180 - n * 40, 175 - n * 40, 170 - n * 40);
//   if (depthMap[i][j - 1] <= 30 || depthMap[i - 1][j] <= 30) {
//     baseCol = color(100, 95, 90);
//   }
//   if (d > 80) {
//     baseCol = lerpColor(baseCol, color(60, 55, 50), 0.6);
//   }
//   if(d>180){
//     baseCol = lerpColor(baseCol, color(143,20,20), 0.6);
//   }
//   fill(baseCol);
//   rect(x, y, res+0.5, res+0.5);
// }
function renderCrack(i, j, d) {
  let x = i * res;
  let y = j * res;
  let n = noise(i * 0.5, j * 0.5);
  let nDetail = noise(i * 2.0, j * 2.0);
  let finalCol;


  if (d <= 80) {
    let br = map(d, 0, 80, 245, 255);
    finalCol = color(br, br, br - 5 + nDetail * 10);
  } 
  else if (d > 80 && d <= 180) {
    let gray = map(n, 0, 1, 140, 180) + nDetail * 20; 
    if (depthMap[`${i}_${j-1}`] <= 80 || depthMap[`${i-1}_${j}`] <= 80) {
      gray -= 30; 
    }
    finalCol = color(gray, gray, gray - 5);
  } 
  else if (d > 180 && d <= 255) {
    let dark = map(n, 0, 1, 60, 90) + nDetail * 15;
    finalCol = color(dark, dark + 5, dark + 10); 
  } 
  else {
    let r = 140 + n * 40; 
    let g = 50 + nDetail * 20;
    let b = 40 + nDetail * 10;
    
    let w = 40; 
    let h = 20; 

    let xOffset = (floor(j / h) % 2 == 0) ? 0 : w / 2;

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

function scratchAt(tx, ty, moveDist) {
  let mx = floor(tx / res);
  let my = floor(ty / res);
  let baseRadius = 6;
  let distFactor = min(moveDist / 8, 2.5);
  let changes = [];
  //if pixel is near the crack, it should be easier to scratch, so detect, and change radius
  let isNearCrack = false;
  let checkRange = 2;

  for (let ox = -checkRange; ox <= checkRange; ox++) {
    for (let oy = -checkRange; oy <= checkRange; oy++) {
      let ci = mx + ox;
      let cj = my + oy;
      // if (ci >= 0 && ci < cols && cj >= 0 && cj < rows) {
      //   if (depthMap[ci][cj] > 30) {
      //     isNearCrack = true;
      //     break;
      //   }
      // }
      if (ci >= 0 && ci < cols && cj >= 0 && cj < rows) {
        let key = `${ci}_${cj}`;
        let val = depthMap[key] || 0;
        if (val > 30) {
          isNearCrack = true;
          break;
        }
      }
    }
  }

  let effectiveRadius;
  if (isNearCrack) {
    effectiveRadius = baseRadius * 2.5;
  } else {
    effectiveRadius = baseRadius;
  }

  for (let i = -effectiveRadius; i <= effectiveRadius; i++) {
    for (let j = -effectiveRadius; j <= effectiveRadius; j++) {
      let ni = mx + i;
      let nj = my + j;
      if (ni >= 0 && ni < cols && nj >= 0 && nj < rows) {
        let distance = dist(i, j, 0, 0);
        if (distance < effectiveRadius) {
          let key = `${ni}_${nj}`;
          let currentVal = depthMap[key] || 0;
          let damage =
            map(distance, 0, effectiveRadius, 3.5, 1) * random(0.1, 2);
          let crackNoise = noise(ni * 0.2, nj * 0.2);
          let newVal = currentVal + damage * crackNoise * distFactor;
          // depthMap[ni][nj] += damage * crackNoise * distFactor;

          // //record and changes and push them to array
          // changes.push({ i: ni, j: nj, v: depthMap[ni][nj] });
          depthMap[key] = newVal;
          changes.push({ i: ni, j: nj, v: newVal });
        }
      }
    }
  }

  //if changes made, tell the server

  if (changes.length > 0) {
    socket.emit("scratch-update", { changes });
  }
}
// function handleOrientation(e) {
//   alpha = e.alpha;
//   beta = e.beta;
//   gamma = e.gamma;
//   console.log(e)
// }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
