
let socket;


let initialized = false;
let audio1 = document.querySelector("#audio1");


function setup(){
  // setup as usual
}

function draw(){
  if(!initialized) return;

  // all your draw stuff
}


function startSocketThings(){
    console.log("setting up socket listeners")
    socket.on("melt", function(){
      let p = document.createElement("p");
      p.innerHTML = "melting...";
      audio1.play();
      document.querySelector("#main").append(p);
    })
}

function handleOrientation(eventData){

   if(!initialized){
    console.log("device orientation works", audio1);
    audio1.play();
    document.querySelector("#requestOrientationButton").remove();

    if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
      socket = io({path: "/leon/port-4101/socket.io"});  // e.g. '/leon/port-4100/socket.io' or '/socket.io'
    }else{
      socket = io(); 
    }
    startSocketThings();
    initialized = true;
   }
    



    // console.log(eventData.alpha);

    // document.querySelector('#alpha').innerText = "alpha: " + Math.round(eventData.alpha);
    // document.querySelector('#beta').innerText = "beta: " + Math.round(eventData.beta);
    // document.querySelector('#gamma').innerText = "gamma: " + Math.round(eventData.gamma);


    // document.querySelector('h1').style.display = "none";
    // document.querySelector('#requestOrientationButton').style.display = "none";

    // // document.querySelector('#square').style.transform = "rotate("+eventData.alpha+"deg)";

    // // element.style.property = value;

    // let square = document.querySelector('#square');
    // let angle = eventData.alpha + "deg";
    // square.style.transform = "rotate("+angle+")";
}







