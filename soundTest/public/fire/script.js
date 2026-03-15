
let socket;
let burnButton = document.querySelector("#burnButton");

let initialized = false;



function setup(){
  // setup as usual
}

function draw(){
  if(!initialized) return;

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







