const express = require('express');
const { Socket } = require('socket.io');
const app = express();
const server = require('http').createServer(app);
const socketio = require('socket.io');
const io = socketio(server);
const PORT = process.env.PORT || 3000;
const GameSession =require("./classes/session");


let confirmed = []
let sessions = {};

io.on('connection', socket => {
    //console.log('backend is connected');

    socket.on("confirmSetShips", (args) =>{
        console.log(args)
        const playerID = args.playerID
        const sessionID = args.sessionID
        //console.log(playerID)
        //console.log(sessionID)
        console.log("hallo socket angekommen")
        if(!confirmed.includes(playerID)){
            confirmed.push(playerID)
            console.log(playerID)
        }
        console.log(confirmed)
        if (confirmed.length === 2){
            socket.emit("shipSet")
            sessions[sessionID].activePlayerID = playerID //player who confirms ships last is active first
            socket.emit("activePlayerChanged", (playerID))
        }
    })

    socket.on("fire", (sessionID, firePlayerID, x, y) =>{
        if (sessions[sessionID].activePlayerID !== firePlayerID) return false
        const session = sessions[sessionID]
        const playerIDs = Object.keys(session.Game.players)
        const targetPlayerID = playerIDs[0] === firePlayerID ? playerIDs[1] : playerIDs [0]
        const fireResult = session.Game.fire(firePlayerID, targetPlayerID, x, y)
        const firePlayer = session.Game.getPlayer(firePlayerID)
        const targetPlayer = session.Game.getPlayer(targetPlayerID)
        if (fireResult.result === 'MISS' || fireResult.result === 'ALREADY_FIRED') {
            sessions[sessionID].activePlayerID = targetPlayerID
            socket.emit("activePlayerChanged", (targetPlayerID))
        }
        socket.emit("resultFired", (firePlayer, targetPlayer, fireResult))
    })
})



server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

app.post("/createSession", (req, res)=>{
    const newSession = new GameSession();
    sessions[newSession.SessionId] = newSession
    const playerUUID = newSession.Game.addPlayer()
    console.log(playerUUID);
    console.log(newSession.SessionId);
    res.json({
        sessionId: newSession.SessionId,
        playerUUID: playerUUID,
    })
});
app.use(express.json())
app.post("/joinSession", (req, res) =>{
    console.log(sessions);
    const sessionId = req.body.sessionID;
    console.log(sessionId);
    console.log(req.body);
    const playerUUID =  sessions[sessionId].addPlayer();
    console.log(playerUUID)
    res.json({
        sessionId: sessionId,
        playerUUID: playerUUID
    })
});

app.use(express.json())
app.post("/addShip", (req,res)=>{
    console.log(req.body)
    const {sessionId, playerID, startX, startY, endX, endY} = req.body
    const addShipResult = sessions[sessionId].Game.addShip(playerID, startX, startY, endX, endY)
    res.json({
        addShipResult: addShipResult,
        player: sessions[sessionId].Game.getPlayer(playerID)
    })
});

