
let socket;
let burnButton = document.querySelector("#burnButton");

let initialized = false;



function setup(){
  // setup as usual
  let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('p5-container');
    frameRate(14);
    textFont('Courier New');
    textSize(8);
}

function draw(){
  
  //if(!initialized) return;
  background(0);
  fill("white");
  circle(width/2,height/2,50);
  // all your draw stuff
}

function startSocketThings(){
      console.log("setting up socket listeners")

}


burnButton.addEventListener("click", function(){
  socket.emit("burnCandles")
})


setTimeout(function(){
  console.log("device orientation works");

    document.querySelector("#requestOrientationButton").remove();

    if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
      socket = io({path: "/leon/port-4101/socket.io"});  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
    }else{
      socket = io(); 
    }

    startSocketThings();
    
    initialized = true;
}, 1000)

function handleOrientation(eventData){

   if(!initialized){
    console.log("device orientation works");

    document.querySelector("#requestOrientationButton").remove();

    if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
      socket = io({path: "/leon/port-4101/socket.io"});  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
    }else{
      socket = io(); 
    }

    startSocketThings();
    
    initialized = true;
   }
    


}







