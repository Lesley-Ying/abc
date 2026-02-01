let alpha = 0, beta = 0, gamma = 0;

let step = 0;
let ingredients = [];
let selected = [];
let saltParticles = [];
let fireTexts = [];
let potRadius = 120;
let potInnerRadius = 75;
let saltCount = 0;
let tossCount = 0;
let lastAlpha = 0;
let lastalphaDir = 0;      
let alphaSwing = 0; 
let lastBeta=0;
let lastbetaDir=0;
let betaSwing=0;
let requiredToss=5;
let ingredientNames = [
  "cigarette",
  "cabbage",
  "butterfly",
  "pig",
  "bone",
  "chicken",
  "curtain",
  "scissor",
];
let INGREDIENT_SPACING = 60;



function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  textSize(14);
  
  for (let name of ingredientNames) {
    let pos = spawnIngredientAvoidingOthers(ingredients);
    ingredients.push({
      name,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      inPot: false,
      cook: 0
    });
  }
  
}

function draw() {
  background(0);

  drawPot();
  drawInstruction();

  if (step == 0) {
    updateIngredients();
  }
  if (step == 1){ 
    updateSalt();
  }
  if (step == 2) {
    updateToss();
  }
  drawIngredients();
  drawSeasoningBlock();
  drawSaltParticles();
  drawFire();
  

}


function spawnIngredientAvoidingOthers(existing) {
  let x, y;
  let safe = false;
  while (!safe) {
    x = random(width);
    y = random(height);
    
    let d = dist(x, y, width / 2, height / 2);
    if (d < potRadius + 40) {
      safe = false;//too clode to the pot
      continue; // new x&y
    }
    safe = true;
    for (let i = 0; i < existing.length; i++) {
      let other = existing[i];
      let dd = dist(x, y, other.x, other.y);
      if (dd < INGREDIENT_SPACING) {
        safe = false; // too close to one another
        break;//go out of this for loop and gain a new x&y again
      }
    }
  }
  return { x, y };
}

//left/right/up/down
function updateIngredients() {
  for (let ing of ingredients) {
    if (ing.inPot) continue;
    ing.vx = gamma * 0.03;
    ing.vy = beta * 0.03;
    ing.x += ing.vx;
    ing.y += ing.vy;
    let d = dist(ing.x, ing.y, width / 2, height / 2);
    if (d < potInnerRadius) {
      ing.inPot = true;
      ing.cook = 0; //blue->green
      selected.push(ing);
    }
  }
//get rid of unselected ingredients
  if (selected.length >= 3) {
    ingredients = ingredients.filter(i => i.inPot);
    step = 1;
  }
}



function updateSalt() {
  let delta = alpha - lastAlpha;
  let dir = 0;

  if (delta > 0) {
    dir = 1;     
  } else if (delta < 0) {
    dir = -1;    
  } else {
    dir = 0;      
  }
//trying to detect a backandforth movement instead of just changes in one dir
//not working precisely

  if (dir !== 0 && lastalphaDir !== 0 && dir !== lastalphaDir) {//moving&different dir from last move
    if (abs(alphaSwing) > 80) {//+certain distance verifying it's intended
      saltCount++;
      //console.log(saltCount)
      //spread salt
      for (let i = 0; i < 20; i++) {
        saltParticles.push({
          x: width / 2 + random(-20, 20),
          y: height / 2 - potRadius,
          vx: random(-0.6, 0.6),
          vy: random(1, 2),
          life: 60
        });
      }
    }
    alphaSwing = 0;
  }

  alphaSwing += delta;

  if (dir !== 0) {
    lastalphaDir = dir;
  }

  lastAlpha = alpha;

  if (saltCount >= 5) {
    step = 2;
  }
}


function updateToss() {
  let delta = beta - lastBeta;
  betaSwing+=delta;
  let dir=0;
  //same logic within salt
  if(delta>0){
    dir=1
  }else if(delta<0){
    dir=-1
  }else{
    dir=0
  }
  if(dir!==0&&lastbetaDir!==dir&&lastbetaDir!==0){
    if(betaSwing>50){
      tossCount++
     //"food" turning green to red
    for (let ing of selected) {
      ing.cook += 255 / requiredToss;
     // ing.cook = min(ing.cook, 255);
    }
    //fire
    for (let i = 0; i < 10; i++) {
      fireTexts.push({
        x: width / 2 + random(-120, 120),
        y: height / 2 + random(-120, 120),
        life: 30
      });
    }
    }
    
    betaSwing=0;
  }

  lastBeta=beta;

  if (dir!==0){
    lastbetaDir=dir
  }

  if (tossCount >= requiredToss) {
    step = 3;
  }
}

function drawIngredients() {
  for (let ing of ingredients) {
    if (ing.inPot) {
      fill(ing.cook, 255 - ing.cook, 0); 
    } else {
      fill("skyblue");
    }
    textSize(15)
    text(ing.name, ing.x, ing.y);
    
  }
}

function drawPot() {
  push();
  push();
  translate(width/2,height/2)
  for(let i=0; i<360; i+=10){
    fill("gold")
    textSize(13)
    text("pot",potRadius*cos(i),potRadius*sin(i))
  }
  for(let i=0;i<140;i+=20){
     textSize(13)
    text("pot",0,potRadius+i)
  }
  pop();
  
  pop();
}

function drawSeasoningBlock() {
  let saltColor=color("grey")
  push();
  
  translate(width / 2 - 60, height / 2 - 90);
  if (step == 1){
    rotate(50);
    saltColor=color("skyblue")
  }
  fill(saltColor);
  textAlign(LEFT)
  textSize(10)
  text("house", -100, -100);
  text("house", -100, -90);
  text("seasoning", -110, -80);
  text("seasoning", -110, -70);
  text("seasoning", -110, -60);
  text("seasoning", -110, -50);
  text("seasoning", -110, -40);
  text("seasoning", -110, -30);
  pop();
}

function drawSaltParticles() {
  fill(255);
  noStroke();
  for (let p of saltParticles) {
    circle(p.x, p.y, 2);
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }
  for (let i = saltParticles.length - 1; i >= 0; i--) {
  if (saltParticles[i].life <= 0) {
    saltParticles.splice(i, 1); 
  }
}

}

function drawFire() {
  fill("red");
  for (let f of fireTexts) {
    text("fire", f.x, f.y);
    f.life--;
  }
  fireTexts = fireTexts.filter(f => f.life > 0);//*I have no idea why the splice doesn't work here, ChatGPT gave me this line saying this is a safer way because it gives me a new array instead of changing the orginal array
  // for(let i =fireTexts.length-1; i>=0; i++){
  //   if(fireTexts[i].life<=0){
  //     fireTexts.splice(i,1);
  //   }
  // }
}

function drawInstruction() {
  fill(0);
  textAlign(CENTER);
  fill("white")
  if (step == 0) {
    text("Step 1: tilt phone to roll ingredients", width / 2, 80);
  }else if (step == 1){
    text("Step 2: shake seasoning", width / 2, 80);
  } else if (step == 2){ 
    text("Step 3: toss the pan", width / 2, 80);
  }else{
    text("Cooking complete ", width / 2, 80);
    textSize(100);
    text("☠️",width/2,height/2+20);
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
