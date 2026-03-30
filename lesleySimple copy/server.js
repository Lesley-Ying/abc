const express = require('express');

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour
const portHTTPS = 4105; // port for https

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
const io = new Server(HTTPSserver); // start socket io 


io.on('connection', (socket) => {

    // we manage the connection inside here
    console.log('a user connected', socket.id);


   // Receive shape from one client, broadcast to all others
    // data: array of {x, y, w, h} with relative positions
    socket.on("sendShape", function(data) {
        socket.broadcast.emit("receiveShape", data);
    });

    // DISCONNECT
    // manage the roles
    socket.on("disconnect", function(){
        console.log("someone disconnected", socket.id)
       

    })

})




// Creating servers and make them listen at their ports:

HTTPSserver.listen(portHTTPS, function (req, res) {
    console.log("HTTPS Server started at port", portHTTPS);
});





