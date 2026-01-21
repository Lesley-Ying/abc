function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  //background("pink");
}

function draw() {
  
  background("pink");
  fill(0);
  circle(width/2-130*sin(frameCount*0.1), height/2+130*cos(frameCount*0.1), 100);

}

// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  console.log(touches);
  
  
  for(let i=0; i<touches.length; i++){
    let x=touches[i].x;
    let y=touches[i].y;
    circle(x,y,100);
  }
}

function touchMoved() {
}

function touchEnded() {
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

