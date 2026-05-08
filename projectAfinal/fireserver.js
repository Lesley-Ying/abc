const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4291; // port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));


// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem"),
};

let HTTPSserver = https.createServer(options, app)


const { Server } = require('socket.io'); // include library
const { arrayBuffer } = require('stream/consumers');
const io = new Server(HTTPSserver); // start socket io 

let candles=[];
let fire;
let soundCount = 5; // total number of audio files
let soundCounter = 0; // cycles through 0->6



io.on('connection', (socket) => {

    // we manage the connection inside here
    console.log('a user connected', socket.id);

    //listen to clients self-reporting role:
    socket.on("my-role", function(data){
        if(data.role=="fire"){
            console.log("fire connected")
            fire=socket.id;
        }
        if(data.role=="candle"){
            let soundIdx=soundCounter % soundCount;
            soundCounter++;

            let candleData={
                id:socket.id,
                soundIdx:soundIdx,
                //server set initial to false; then listen for update
                betaReady:false,
            }
            candles.push(candleData);
            socket.emit("soundIdx",{idx:soundIdx});
        }
    })


    // socket.on("startSound", function(){
    //     console.log("fire telling to burn candles")
    //     // could decide here which order to tell
    //     // which candle to burn and put in delays
    //     //broadcast: sending this message to everyone except the one who trigger this event
    //     socket.broadcast.emit("melt")
    // })

    //server check if all cand;e-beta are ready, if yes, fire fall
    socket.on("beta-status", function(data){
        //go and find the candle which is emitting ready message in the candle array
       let candle=candles.find(function(c){
        return c.id==socket.id;
       })
       //update the beta status from false to true
       if(candle){
        candle.betaReady=data.ready;
       }
       //check if all ready
       let allReady=candles.length>0 && candles.every(c=>c.betaReady);
      if(fire){
        io.to(fire).emit("all-candles-ready", {ready: allReady});
      }
      //just sending this to everyone although fire doesn't need to listen for this
      if(fire==undefined) return;
      if(allReady){
        io.emit("warm-up", {brightness:1})
      }
      
    })

    socket.on("ignite-candles", function(){
        console.log("burn candle");
        
        candles.forEach(function(c){
            let meltRate=0.154;
            if(c.soundIdx==2){
                meltRate=0.135;
            }
            io.to(c.id).emit("burn", {meltRate:meltRate});
           
        })

    })
    // DISCONNECT
    // manage the roles
    socket.on("disconnect", function(){
        console.log("someone disconnected", socket.id);
        if (socket.id == fire) {
            fire = undefined;
            console.log("fire disconnected");
            // notify candles fire is gone
            io.emit("fire-gone");
        } else {
            candles = candles.filter(c => c.id !== socket.id);
            //not used
            if (fire) io.to(fire).emit("remove-candle", { id: socket.id });

            // recheck all-ready after a candle leaves
            let allReady = candles.length > 0 && candles.every(c => c.betaReady);
            if (fire) io.to(fire).emit("all-candles-ready", { ready: allReady });
        }

    })

})




// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});