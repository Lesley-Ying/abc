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

let candles = []; // array of socket.id strings
let fire;         // socket.id or undefined


io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    // Client requests role assignment on connect
    socket.on("request-role", function () {
        //whoever connects first will be the first fire
        if (fire == undefined) {
            fire = socket.id;
            socket.emit("role", "fire");
            console.log("fire connected");
            
            //need to tell new fire exsiting candles if the old disconnected
            socket.emit("existing-candles", candles);
        } else {
            candles.push(socket.id);
            socket.emit("role", "candle");
            //notify fire to add new candle
            io.to(fire).emit("new-candle", { id: socket.id });
        }
    });

    // if fire is close to a candle — relay warm glow signal
    socket.on("warm-candle", function (data) {
        // data: { id: candleSocketId, brightness: 0..1 }
        io.to(data.id).emit("warm-up", { brightness: data.brightness });
    });

    // fire overlapped a candle — ignite it
    socket.on("ignite-candle", function (data) {
        const candleId = data.id;
        io.to(candleId).emit("burn");
        if (fire){
         io.to(fire).emit("remove-candle", { id: candleId });
        }
        candles = candles.filter(id => id !== candleId);
    });

    socket.on("disconnect", function () {
        console.log("someone disconnected", socket.id);
        if (socket.id == fire) {
            fire = undefined;
            console.log("fire disconnected")
        } else {
            candles = candles.filter(id => id !== socket.id);
            if (fire) io.to(fire).emit("remove-candle", { id: socket.id });
        }
    });
});

HTTPSserver.listen(portHTTPS, function () {
    console.log("HTTPS Server started at port", portHTTPS);
});