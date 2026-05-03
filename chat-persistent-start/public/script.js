function getOrCreateUserId() {
    // check if we have a userID already in local storage
    // if yes, return it
    // if not, create one and return it
    let userID =localStorage.getItem("user-id");
    
    if(userID == undefined){
        //make new
        userID=crypto.randomUUID();
        //store on local storage
        localStorage.setItem("user-id",userID);
    }

    return userID;

}

let nameInput = document.querySelector("#nameInput");


const myUserId = getOrCreateUserId();
console.log('My userId:', myUserId);

function getOrCreateUsername() {
    // check if we have a userID already in local storage
    // if yes, return it
    // if not, create one and return it
    let username =localStorage.getItem("user-name");
    
    if(username == undefined){
        //make new
        username=""
        //store on local storage
        localStorage.setItem("user-name",username);
    }else{
        nameInput.value=username;
    }
    return username;

}


//check if we have a username already
let myUsername = getOrCreateUsername();


// start socket
if(location.hostname.toLowerCase().startsWith('browsercircus') || location.hostname.toLowerCase().startsWith('www')){
  socket = io({path: "/YOURPATH-and-PORT/socket.io"});  // yields '/leon/port-4100/socket.io' or '/socket.io'
}else{
  socket = io(); 
}

let myInfo = {
    userId: myUserId,
    username: myUsername
}
// "login" to server, sending out "identify"
socket.emit("identify", myInfo);
console.log(myInfo);

//handle username change 
nameInput.addEventListener("change", function(){
    console.log("changed name", nameInput.value)
    let name=nameInput.value;
    // locally
    localStorage.setItem("user-name",name);
    // tell server about it
   
})



let formeElm = document.querySelector("#chatForm");
console.log(formeElm);
let msgInput = document.querySelector("#newMessage");
console.log(msgInput)


// LISTEN FOR NEWLY TYPED MESSAGES, 
// SEND THEM TO THE SERVER
formeElm.addEventListener("submit", newMessagesSubmitted);

function newMessagesSubmitted(event){
    console.log(event);
    //stop form element from refreshing the page
    event.preventDefault();

    let newMsg = msgInput.value
    console.log(newMsg);

    // appendMessage(newMsg); // just for fun,
    // actuaally we need to
    // send the new message to 
    // the server first:
    socket.emit("message-from-client", {
        message: newMsg
    } );


    // clear out input:
    msgInput.value = "";

}


socket.on("message-from-server", function(data){
    // waht do to with the messaeg from server
    console.log("got message", data)
    appendMessage(data)
})




socket.on("chat-history", function(data){
    // deal with chat history
    
})

// APPEND MESSAGES TO BOX
function appendMessage(data){
    // console.log(data)
    // select list (ul) first
    let chatThreadList = document.querySelector("#threadWrapper ul");
    console.log(chatThreadList)

    // create new list item (li)
    let newListItem = document.createElement("li");
    if(data.sender.userId == myUserId){
        newListItem.className = "fromMe"
    }else{
        newListItem.className = "fromOthers"
    }

    //sender
    let who = document.createElement("span");
    who.className = "who";
    who.innerText = data.sender.username || "anon";

    newListItem.append(who);

    //messsage
    let words = document.createElement("span");
    words.className = "words";
    words.innerText = data.text;

    newListItem.append(words);



    // append new li to the list 
    chatThreadList.append(newListItem);

    // scroll to bottom of textbox:
    chatThreadList.scrollTop = chatThreadList.scrollHeight;
}
