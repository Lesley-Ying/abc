const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express();// the server "app", the server behaviour
const portHTTPS = 4290;// port for https

// returning to the client anything that is
// inside the public folder
app.use(express.static('public'));

// Creating object of key and certificate
// for SSL
const options = {
    key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
    cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require('socket.io');// include library
const { arrayBuffer } = require('stream/consumers');
const io = new Server(HTTPSserver);// start socket io 


let candles = [];   // [{id, soundIdx, betaReady}]
let fire;           
let soundCount = 7; // total number of audio files
let soundCounter = 0; // cycles through 0->6


io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Client requests role assignment on connect
    socket.on("request-role", function () {
        if (fire == undefined) {
            fire = socket.id;
            socket.emit("role", "fire");
            console.log("fire connected");
            //maybe not used in this version
            // send existing candles to new fire
            socket.emit("existing-candles", candles);
        } else {
            //candle
            //assign sound index cyclically
            let soundIdx = soundCounter % soundCount;
            soundCounter++;
            let candleData = { id: socket.id, soundIdx: soundIdx, betaReady: false };
            candles.push(candleData);
            socket.emit("role", "candle", { soundIdx });
            if (fire) io.to(fire).emit("new-candle", candleData);
        }
    });

    // candle reports its beta-ready status
    socket.on("beta-status", function (data) {
        let candle = candles.find(c => c.id === socket.id);
        if (candle) {
            //find the candle->betaReady: false → true
            candle.betaReady = data.ready;
        }
        // check if all candles are ready(if all turn true)
        let allReady = candles.length > 0 && candles.every(c => c.betaReady);
        if (fire) io.to(fire).emit("all-candles-ready", { ready: allReady });
    });

    socket.on("warm-candle", function (data) {
        io.to(data.id).emit("warm-up", { brightness: data.brightness });
    });

    socket.on("ignite-candle", function (data) {
        //get the data(for this version, all candles at once)
        const candleId = data.id;
        //find those candles whose sound index are 2(sound3), give them a special meltRate
        let candle = candles.find(c => c.id === candleId);
        let meltRate = 0.31;
        if (candle.soundIdx == 2) {
            meltRate = 0.22;
        }
        io.to(candleId).emit("burn", { meltRate});
    });

    socket.on("disconnect", function () {
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
    });
});

HTTPSserver.listen(portHTTPS, function () {
    console.log("HTTPS Server started at port", portHTTPS);
});