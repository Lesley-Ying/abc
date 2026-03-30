let socket;
if (location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')) {
  socket = io({ path: "/lesley/port-4290/socket.io" });
} else {
  socket = io();
}
let initialized = true;


let RECT_W = 60;
let RECT_H = 40;
let SOURCE_X = 20;
let SOURCE_Y = 20;
let placedRects = [];   // all rects the user has dropped
let dragging = null;
let receivedRects = []; // rects received from another client
let receivedPos = null; // for received shape (random)

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('p5-container');
  frameRate(30);
  textFont('Courier New');
  textSize(12);
}

function draw() {
  background(15);
  // Draw received shape from others 
  if (receivedRects.length > 0) {
    push();
    fill(40, 80, 120, 180);
    
    for (let r of receivedRects) {
      rect(receivedPos.x + r.rx, receivedPos.y + r.ry, RECT_W, RECT_H, 3);
    }
    fill(80, 160, 220);
    noStroke();
    pop();
  }

  // Draw placed rects
  for (let r of placedRects) {
    push();
    fill(220, 210, 190);
    stroke(255);
    strokeWeight(1);
    rect(r.x, r.y, RECT_W, RECT_H, 3);
    pop();
  }
  let srcAlpha;
  if (dragging && dragging.isSource) {
    srcAlpha = 100;
  } else {
    srcAlpha = 255;
  }

  //draw source rect
  push();
  fill(255, 220, 80, srcAlpha);
  stroke(255);
  strokeWeight(2);
  rect(SOURCE_X, SOURCE_Y, RECT_W, RECT_H, 3);
  fill(0);
  noStroke();
  pop();

  if (dragging) {
    push();
    fill(255, 220, 80, 160);
    stroke(255, 220, 80);
    strokeWeight(1.5);
    rect(dragging.x - dragging.offsetX, dragging.y - dragging.offsetY, RECT_W, RECT_H, 3);
    pop();
  }

  // Draw send button
  drawSendButton();

  // Instruction
  push();
  fill(120);
  noStroke();
  textSize(10);
  // textAlign(LEFT, TOP);
  // text("Drag the yellow rect to build a shape. Press SEND to share it.", SOURCE_X, SOURCE_Y + RECT_H + 10);
  pop();
}

function drawSendButton() {
  let bx = width - 120;
  let by = 20;
  let bw = 100;
  let bh = 36;
  let over = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  push();
  fill(255, 80, 80);
  stroke(255, 100, 100);
  strokeWeight(1.5);
  rect(bx, by, bw, bh, 4);
  fill(255);
  noStroke();
  textSize(13);
  textAlign(CENTER, CENTER);
  text("SEND", bx + bw / 2, by + bh / 2);
  pop();
}


function mousePressed() {
  // Check send button
  let bx = width - 120, by = 20, bw = 100, bh = 36;
  if (mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh) {
    sendShape();
    return;
  }

  // Check if clicking on source rect
  if (mouseX > SOURCE_X && mouseX < SOURCE_X + RECT_W &&
    mouseY > SOURCE_Y && mouseY < SOURCE_Y + RECT_H) {
    dragging = {
      isSource: true,
      x: mouseX,
      y: mouseY,
      offsetX: mouseX - SOURCE_X,
      offsetY: mouseY - SOURCE_Y
    };
    return;
  }

  // Check if clicking on a placed rect (to move it)
  for (let i = placedRects.length - 1; i >= 0; i--) {
    let r = placedRects[i];
    if (mouseX > r.x && mouseX < r.x + RECT_W &&
      mouseY > r.y && mouseY < r.y + RECT_H) {
      dragging = {
        isSource: false,
        rectIndex: i,
        x: mouseX,
        y: mouseY,
        offsetX: mouseX - r.x,
        offsetY: mouseY - r.y
      };
      return;
    }
  }
}

function mouseDragged() {
  if (dragging) {
    dragging.x = mouseX;
    dragging.y = mouseY;
  }
}

function mouseReleased() {
  if (!dragging) return;

  let dropX = mouseX - dragging.offsetX;
  let dropY = mouseY - dragging.offsetY;

  // Don't drop on top of the source area
  let onSource = dropX < SOURCE_X + RECT_W + 5 && dropY < SOURCE_Y + RECT_H + 5
    && dropX > SOURCE_X - 5 && dropY > SOURCE_Y - 5;

  if (!onSource) {
    if (dragging.isSource) {
      // Stamp a new rect
      placedRects.push({ x: dropX, y: dropY });
    } else {
      // Move existing rect
      placedRects[dragging.rectIndex].x = dropX;
      placedRects[dragging.rectIndex].y = dropY;
    }
  }

  dragging = null;
}


function touchStarted() {
  let tx = touches[0].x;
  let ty = touches[0].y;

  // Check send button
  let bx = width - 120, by = 20, bw = 100, bh = 36;
  if (tx > bx && tx < bx + bw && ty > by && ty < by + bh) {
    sendShape();
    return false;
  }

  // Check source rect
  if (tx > SOURCE_X && tx < SOURCE_X + RECT_W &&
    ty > SOURCE_Y && ty < SOURCE_Y + RECT_H) {
    dragging = {
      isSource: true,
      x: tx, y: ty,
      offsetX: tx - SOURCE_X,
      offsetY: ty - SOURCE_Y
    };
    return false;
  }

  // Check placed rects
  for (let i = placedRects.length - 1; i >= 0; i--) {
    let r = placedRects[i];
    if (tx > r.x && tx < r.x + RECT_W &&
      ty > r.y && ty < r.y + RECT_H) {
      dragging = {
        isSource: false,
        rectIndex: i,
        x: tx, y: ty,
        offsetX: tx - r.x,
        offsetY: ty - r.y
      };
      return false;
    }
  }
  return false;
}

function touchMoved() {
  if (dragging) {
    dragging.x = touches[0].x;
    dragging.y = touches[0].y;
  }
}

function touchEnded() {
  if (!dragging) return false;

  let dropX = dragging.x - dragging.offsetX;
  let dropY = dragging.y - dragging.offsetY;

  let onSource = dropX < SOURCE_X + RECT_W + 5 && dropY < SOURCE_Y + RECT_H + 5
    && dropX > SOURCE_X - 5 && dropY > SOURCE_Y - 5;

  if (!onSource) {
    if (dragging.isSource) {
      placedRects.push({ x: dropX, y: dropY });
    } else {
      placedRects[dragging.rectIndex].x = dropX;
      placedRects[dragging.rectIndex].y = dropY;
    }
  }

  dragging = null;
}


function sendShape() {
  if (placedRects.length == 0) return;

  //get min
  let minX = placedRects[0].x;
  let minY = placedRects[0].y;
  for (let i = 0; i < placedRects.length; i++) {
    if (placedRects[i].x < minX) minX = placedRects[i].x;
    if (placedRects[i].y < minY) minY = placedRects[i].y;
  }
  //calculate relative position
  let relativeRects = [];
  for (let i = 0; i < placedRects.length; i++) {
    relativeRects.push({
      rx: placedRects[i].x - minX,
      ry: placedRects[i].y - minY
    });
  }
  socket.emit("sendShape", relativeRects);
  //console.log("Shape sent", relativeRects);
}

socket.on("receiveShape", function (data) {
  receivedRects = data;
  // Place at a random position
  receivedPos = {
    x: random(100, width - 200),
    y: random(100, height - 150)
  };
  //console.log("Shape received", data);
});

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}