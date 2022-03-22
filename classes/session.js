const Game = require("./game");
//const uuid = require("../helpers/createId");
const { v4: uuidv4 } = require('uuid');
//import uuid from 'uuid/v4.js';
//const uuid = require("uuid/v4");

module.exports = class GameSession {
    constructor() {
        this.SessionId = uuidv4();
        this.Game = new Game();
        this.activePlayerId = null;
    }

    addPlayer = () => {
        let numberOfPlayers = 0;
        Object.keys(this.Game.players).map((playerUUID)=>{
            numberOfPlayers++;
        })
        this.numberOfPlayers = numberOfPlayers
        if (numberOfPlayers >= 2) return false

        return this.Game.addPlayer()
    }


}