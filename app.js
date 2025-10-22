const express = require('express');
const path = require('path');
const app = express();

const server=require('http').createServer(app);

const socketio = require('socket.io');

const io = socketio(server);



app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname ,'public')));

app.get("/", function (req, res) {
    res.send("hey");
})

server.listen(3000, function () {
    console.log("server started at port 3000");
})