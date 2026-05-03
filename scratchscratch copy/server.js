const express = require("express");

const https = require("https");
// to read certificates from the filesystem (fs)
const fs = require("fs");

const app = express(); // the server "app", the server behaviour!
const portHTTPS = 4290; // port for https

// Creating object of key and certificate
// for SSL
const options = {
  key: fs.readFileSync("keys-for-local-https/localhost-key.pem"),
  cert: fs.readFileSync("keys-for-local-https/localhost.pem"),
};

let HTTPSserver = https.createServer(options, app);

const { Server } = require("socket.io"); // include library
const io = new Server(HTTPSserver); // start socket io
app.use(express.static("public"));

let serverDepthMap = {};
let needsSave=false;
// let dataText=fs.readFileSync("scratch.json","utf8");
// serverDepthMap=JSON.parse(dataText);

if (fs.existsSync("scratch.json")) {
  let dataText = fs.readFileSync("scratch.json", "utf8");
  serverDepthMap = JSON.parse(dataText);
}

io.on("connection", (socket) => {
  console.log('a user connected', socket.id);
  //if the map has already been created, just同步
  
  socket.emit("depth-map-init", serverDepthMap);

  //     socket.on("map-init", (data) => {
  //       //for the first user, since there's no wall yet, create one based on that user's phone size
  //       if (!serverDepthMap) {
  //           console.log(`Initial Map Setup: ${data.cols} x ${data.rows}`);
  //           serverDepthMap = [];
  //           for (let i = 0; i < data.cols; i++) {
  //               serverDepthMap[i] = new Array(data.rows).fill(0);
  //           }
  //       }
  //       // need to tell the user about this map
  //       socket.emit("depth-map-init", serverDepthMap);

  //   });
  //listen for scratch
  socket.on("scratch-update", (data) => {
    if (!serverDepthMap) return;
    

    ////old version
    // for (let c of data.changes) {
    //     if (serverDepthMap[c.i] && serverDepthMap[c.i][c.j] !== undefined) {
    //         serverDepthMap[c.i][c.j] = c.v;
    //     }
    // }
    // let dataAsText=JSON.stringify(serverDepthMap);
    // fs.writeFileSync("scratch.json", dataAsText, 'utf8');
    
    for (let c of data.changes) {
      let key = `${c.i}_${c.j}`;
      serverDepthMap[key] = c.v;
    }
    needsSave=true;

    // let dataAsText = JSON.stringify(serverDepthMap);
    // fs.writeFileSync("scratch.json", dataAsText, "utf8");

    socket.broadcast.emit("scratch-update", data);
    socket.on("set-finger", (data) => {
      socket.fingerEmoji = data.emoji; // 存在socket对象上
    });
    
    socket.on("finger-move", (data) => {
      socket.broadcast.emit("finger-move", {
        id: socket.id,
        x: data.x,
        y: data.y,
        emoji: data.emoji
      });
    });
    
    socket.on("finger-end", () => {
      socket.broadcast.emit("finger-end", { id: socket.id });
    });
    
    
  });
  

  socket.on("disconnect", function () {
    console.log("disconnected", socket.id);
  });
});
setInterval(() => {
  if (needsSave) {
    fs.writeFile("scratch.json", JSON.stringify(serverDepthMap), "utf8", (err) => {
      if (!err) {
        needsSave = false; 
      }
    });
  }
}, 2000);

HTTPSserver.listen(portHTTPS, function () {
  console.log("HTTPS Server started at port", portHTTPS);
});
