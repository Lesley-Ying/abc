let socket = io();

let formeElm = document.querySelector("#chatForm");
let msgInput = document.querySelector("#newMessage");
let waterArea = document.querySelector("#threadWrapper");

let myUserId = null;

//define special words and link pictures
const specialWords = {
    '小思莼': 'chun.jpg',
    '小鱼肠': 'yu.jpg',
    'QQ': 'qq.jpg',
    '飞鼠': 'shu.png',
    '嘿嘿': 'heihei.png'
};


socket.on("connect", () => {
    myUserId = socket.id;
    console.log("my id:", myUserId);
  });


// LISTEN FOR NEWLY TYPED MESSAGES
formeElm.addEventListener("submit", newMessageSubmitted);

function newMessageSubmitted(event){
    event.preventDefault();

    let newMsg = msgInput.value;

    //if empty then stop
    if(!newMsg.trim()) return;

    let specialWordPositions = []; 
    
    //take special words and search
    Object.keys(specialWords).forEach(word => {
        let index = newMsg.indexOf(word);
        //found
        if(index !== -1) {
            specialWordPositions.push({
                position: index,
                word: word,
                length: word.length
            });
        }
    });
    
    specialWordPositions.sort((a, b) => a.position - b.position);
    
    let units = [];
    let currentPos = 0;
    
    //separate ordinary words and unite special words
    specialWordPositions.forEach(special => {
        for(let i = currentPos; i < special.position; i++) {
            units.push({
                type: 'char',
                content: newMsg[i]
            });
        }
        
        units.push({
            type: 'special',
            content: special.word
        });
        
        currentPos = special.position + special.length;
    });
    
    for(let i = currentPos; i < newMsg.length; i++) {
        units.push({
            type: 'char',
            content: newMsg[i]
        });
    }
    
    units.forEach((unit, index) => {
        createClickableUnit(unit, index, myUserId);
    });

    // clear textbox:
    msgInput.value = "";
}

function createClickableUnit(unit, index){
    let unitElm = document.createElement("div");
    unitElm.className = "clickable-char";
    unitElm.innerText = unit.content;
    unitElm.style.left = (20 + index * 40) + "px";
    unitElm.style.bottom = "40px";
    
    
    waterArea.appendChild(unitElm);
    
    unitElm.addEventListener("click", function(){
        sendUnit(unit.content, unit.type);
        unitElm.remove();
    });
}

function sendUnit(content, type){
    socket.emit("messageFromClient", {
        content,
        type
      });
    
}

// LISTEN FOR NEW MESSAGES FROM SERVER
socket.on("messageFromServer", function(data){
    console.log("got data:", data);
    swimUnit(data);
});

function swimUnit(data){
    let fish;
    if(data.type === 'special' && specialWords[data.content]){
        fish = document.createElement("img");
        fish.src = specialWords[data.content];
        fish.className = "swimming-fish special-image";
    } else {
        fish = document.createElement("div");
        fish.className = "swimming-fish";
        fish.innerText = "🐟" + data.content;
        
        if(data.userId === myUserId){
            fish.style.color = "pink"; 
        } else {
            fish.style.color = "blue"; 
        }
    }
    
    fish.style.left = "-50px";
    let randomTop = Math.random() * 70 + 10;
    fish.style.top = randomTop + "%";
    
    waterArea.appendChild(fish);
    
    createRippleTrail(fish);
    
    setTimeout(() => {
        fish.remove();
    }, 20000);
}


function createRippleTrail(fishElement){
    let rippleCount = 0;
    let maxRipples = 25; 
    
    let rippleInterval = setInterval(() => {
        if(!fishElement.parentNode || rippleCount >= maxRipples) {
            clearInterval(rippleInterval);
            return;
        }
        
        let fishRect = fishElement.getBoundingClientRect();
        let fishLeft = fishRect.left;
        let fishTop = fishRect.top;
        
        if(fishLeft > -100 && fishLeft < window.innerWidth + 100){
            createRipple(fishLeft, fishTop);
            rippleCount++;
        } else {
            clearInterval(rippleInterval);
        }
    }, 800); 
}

function createRipple(leftPx, topPx){
    let ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.left = leftPx + "px";
    ripple.style.top = topPx + "px";
    ripple.style.position = "absolute";
    
    waterArea.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 2000);
}