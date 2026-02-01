let knock;
let door;
let door2;
let knockEffect;
let knockCount=0;
let yes=false;
let doorOpened=false;
let touchX;
let touchY;
let touched=false;

function preload(){
knock=loadSound("assets/knock.mp3");
knockEffect=loadImage("assets/effect.png");
doorOpen=loadSound("assets/open.wav");
door=loadImage("assets/doorC.jpg");
//door2=loadImage("assets/doorOpen.png");


}
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("p5-canvas-container");
  
  
}

function draw() {
  
  background(0);
  fill(0);
  imageMode(CENTER);
  
  if(knockCount>80){
    yes=true;
  }
  if(!yes){
    image(door,width/2,height/2,windowWidth,windowHeight)
  }
  // }else{
  //   image(door2,width/2,height/2,windowWidth,windowHeight)
  // }
  if(yes&&!doorOpened){
    doorOpen.play();
    
    doorOpened=true;
  }
  if(touched&&!yes){
  for(let i=0; i<touches.length; i++){
    image(knockEffect,touches[i].x, touches[i].y-20,150,150)
  }
  touched=false;
}
  
 
}

// P5 touch events: https://p5js.org/reference/#Touch

function touchStarted() {
  touched=true;
 let volume=map(touches.length,1,5,0.01,1);
  //console.log(touches);
  knock.setVolume(volume);
  if(!yes){
  knock.play();
  }
  
  knockCount++;
  
  
  
}

function touchMoved() {
}

function touchEnded() {
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

