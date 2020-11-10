const { time } = require("console");

var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let uniqueList = [];
let chatLog = [];

io.on("connection", (socket) => {
  let uniqueId;
  let users = {};

  //generate a unique id
  uniqueId = Math.floor(Math.random() * 235 + 1).toString();
  //keep generateing a unique id until it is unique
  while (uniqueList.includes(uniqueId)) {
    uniqueId = Math.floor(Math.random() * 235 + 1).toString();
  }
  //add the uniqueId to our array
  uniqueList.push(uniqueId);
  //object
  users[socket.id] = uniqueId;
  users["time"] = time;
  users["color"] = "#000000";
  users["pastNames"] = [uniqueId];

  socket.emit("intro message", users[socket.id]);
  socket.broadcast.emit("intro message others", users[socket.id]);

  //emit the chat log if any
  for (let i = 0; i < chatLog.length; i++) {
    socket.emit("chat log", chatLog[i]);
  }

  let smile = "&#128513";
  let sad = "&#128531";
  let ooo = "&#128562";

  //show all online users
  io.emit("online users", uniqueList);

  socket.on("disconnect", () => {
    let index = uniqueList.indexOf(users[socket.id]);
    uniqueList.splice(index, 1);
    io.emit("online users", uniqueList);

    //socket.emit("local storage", users[socket.id]);
  });

  //send current name

  socket.on("chat message", (data) => {
    var date = new Date();
    var timeStamp = date.getHours() + ":" + date.getMinutes();

    //append the message to a list
    //store only 200 messages and remove the earliest message
    if (chatLog.length > 200) {
      chatLog.shift();
    }

    const emojiOne = /:[)]/gi;
    const emojiTwo = /:[(]/gi;
    const emojiThree = /:[o]/gi;

    data.message = data.message.replace(emojiOne, smile);
    data.message = data.message.replace(emojiTwo, sad);
    data.message = data.message.replace(emojiThree, ooo);

    if (data.message.includes("/name")) {
      let newName = data.message.substring(6);

      //if same name
      if (newName === uniqueId) {
        socket.emit("same name", users[socket.id]);
      }
      //check if the new name is already taken or not
      else if (uniqueList.includes(newName)) {
        let temp = {};
        temp[socket.id] = newName;
        socket.emit("name taken", temp[socket.id]);
      }
      //else we change the user name
      //broadcast to self that the name has changed
      else {
        //get rid of current name
        uniqueList = uniqueList.filter((id) => id !== uniqueId);
        //current name = new name
        uniqueId = newName;
        //add the new name to the list
        uniqueList.push(newName);
        users["pastNames"].push(newName);
        users[socket.id] = newName;
        data.id = newName;
        socket.emit("name change", users[socket.id]);
        //socket.emit("local storage", users[socket.id]);
        io.emit("update name", users["pastNames"]);
        io.emit("online users", uniqueList);
      }
    } else if (data.message.includes("/color")) {
      let color = "#" + data.message.substring(7);

      data.id = users[socket.id];
      users["color"] = color;
      data.color = users["color"];
      data.past = users["pastNames"];
      io.emit("change color", data);
    }

    //if not one of the special cases just emit to everyone
    else {
      data.id = users[socket.id];
      data.color = users["color"];
      data.message = "User " + users[socket.id] + ": " + data.message;
      data.time = timeStamp;

      chatLog.push(data);

      //emit to everyone except self
      socket.broadcast.emit("chat message", data);
      //emit to self but bolded
      socket.emit("chat message self", data);
    }
  });
});

http.listen(3000, () => {
  console.log("listening on *:3000");
});
