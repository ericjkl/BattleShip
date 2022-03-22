//require('react-native-get-random-values');
const { v4: uuid } = require('uuid');
const segments = require('segments'); // no import


/** Creating a game object. */
module.exports = class Game {
    static FIRE_RESULTS = {
        INVALID_USER_ID: 'INVALID_USER_ID',
        HIT: 'HIT',
        MISS: 'MISS',
        ALREADY_FIRED: 'ALREADY_FIRED',
        SUNK: 'SUNK',
    };

    players = {
        /*
        {playerID}: {
          ships: {
            {shipID}: {
              hitsLeft: 2
              length: 3
            }
          },
          board: {
            {shipID}: [x1, y1, x2, y2]
          }
          fires: {
            (${x},${y}): { result: 'hit'/'miss'/'already_fired', sunkShipLength: null/4 }
          }
        }

        */
    };

    /**
     * Create a JavaScript object that will store the players' names and scores
     */
    constructor() {
        this.players = {};
    }

    /**
     * Adds a player to the game. Returns the ID of the player.
     * @return {String} The new player's id.
     */
    addPlayer() {
        const id = uuid();
        this.players[id] = {
            id,
            ships: {},
            board: {},
            fires: {},
        };
        return id;
    }

    /**
     * Gets the player by an ID.
     * @param {String} id The player's uuid.
     * @return {Object} The player.
     */
    getPlayer(id) {
        return this.players[id];
    }

    /**
     * Fires a missile from {firePlayerID} to {targetPlayerID}. Returns a detailed response.
     * @param {String} firePlayerID The player who is firing.
     * @param {String} targetPlayerID The player ID whose board is being fired upon.
     * @param {number} x The fire x position.
     * @param {number} y The fire y position.
     * @return {Object} returns a fire result
     */
    fire(firePlayerID, targetPlayerID, x, y) {
        // INVALID_USER_ID
        if (!(firePlayerID in this.players) || !(targetPlayerID in this.players)) {
            return {
                result: Game.FIRE_RESULTS.INVALID_USER_ID,
            };
        }

        const targetPlayer = this.players[targetPlayerID];
        // ALREADY_FIRED
        const xy = `${x},${y}`;
        if (targetPlayer.fires[xy]) {
            return {
                result: Game.FIRE_RESULTS.ALREADY_FIRED,
            };
        }

        // Assume miss
        targetPlayer.fires[xy] = {
            result: Game.FIRE_RESULTS.MISS,
        };


        // Go through each ship and see if the fire intersects the ship
        const targetShips = Object.keys(targetPlayer.board);
        for (let i = 0; i < targetShips.length; ++i) {
            const shipID = targetShips[i];
            const s = targetPlayer.board[shipID];
            if (segments.intersect([s[0], s[2]], x) &&
                segments.intersect([s[1], s[3]], y)) {
                // valid hit
                --targetPlayer.ships[shipID].hitsLeft;
                targetPlayer.fires[xy] = {};
                if (targetPlayer.ships[shipID].hitsLeft === 0) {
                    targetPlayer.fires[xy].sunkShipLength = targetPlayer.ships[shipID].length;
                    targetPlayer.fires[xy].result = Game.FIRE_RESULTS.SUNK;
                } else {
                    targetPlayer.fires[xy].result = Game.FIRE_RESULTS.HIT;
                }

                return targetPlayer.fires[xy];
            }
        }

        return {
            result: Game.FIRE_RESULTS.MISS,
        };
    }

    /**
     * Adds a player's ship to the board.
     * @param {String} playerID The player's ID.
     * @param {number} startX The boat start x.
     * @param {number} startY The boat start y.
     * @param {number} endX The boat end x.
     * @param {number} endY The boat end y.
     * @return {(true|false|'LAST_SHIP_OF_KIND')} returns true if the ship was successfully added; else false
     */
    addShip(playerID, startX, startY, endX, endY) {
        // Loop through all ships and ensure there's no collision.
        const player = this.players[playerID];
        if (!player) {
            return false;
        }
        // Must be a horizontal or vertical line
        if (startX > endX || startY > endY) {
            return false;
        }

        // end must be after beginning
        if (startX !== endX && startY !== endY) {
            return false;
        }
        const board = player.board;

        // ships should not touch each other


        // TODO(grant) More efficiently detect collisions.
        // - Currently we go through all ships and check if they collide.
        // - 2x speedup: only check vert/vert horiz/horiz quickly
        // - speedup: Quadtree
        const shipID = uuid();
        const newShipPos = [startX, startY, endX, endY];
        const collision = Object.keys(board).map((shipKey) => {
            const otherShipPos = board[shipKey];
            const blockingAreaX1 = otherShipPos[0] - 1;
            const blockingAreaY1 = otherShipPos[1] - 1;
            const blockingAreaX2 = otherShipPos[2] + 1;
            const blockingAreaY2 = otherShipPos[3] + 1;
            const startIsInBlockingArea =
                newShipPos[1] >= blockingAreaY1 &&
                newShipPos[1] <= blockingAreaY2 &&
                newShipPos[0] >= blockingAreaX1 &&
                newShipPos[0] <= blockingAreaX2;
            const endIsInBlockingArea =
                newShipPos[3] >= blockingAreaY1 &&
                newShipPos[3] <= blockingAreaY2 &&
                newShipPos[2] >= blockingAreaX1 &&
                newShipPos[2] <= blockingAreaX2;
            if (startIsInBlockingArea || endIsInBlockingArea) {
                return true;
            }
            if (newShipPos[1] === newShipPos[3] &&
                newShipPos[3] === otherShipPos[1] &&
                otherShipPos[1] === otherShipPos[3]) { // if both horizontal
                return segments.intersect([newShipPos[0], newShipPos[2]], [otherShipPos[0], otherShipPos[2]]);
            } else if (newShipPos[0] === newShipPos[2] &&
                newShipPos[2] === otherShipPos[0] &&
                otherShipPos[0] === otherShipPos[2]) { // if both vertical
                return segments.intersect([newShipPos[1], newShipPos[3]], [otherShipPos[1], otherShipPos[3]]);
            }
        }).reduce((a, b) => a || b, false);
        if (collision) {
            return false;
        }

        // add the ship (inclusive)
        const length = segments.size([startX, endX]) + segments.size([startY, endY]) + 1;
        player.ships[shipID] = {
            hitsLeft: length,
            length,
        };
        player.board[shipID] = newShipPos;

        // check if it is the last ship of its kind available to be set by the player
        let shipCounter = 0;
        Object.keys(player.ships).map((shipKey) => {
            if (player.ships[shipKey].length === length) shipCounter++;
        });
        const availableShips = {
            2: 4,
            3: 3,
            4: 2,
            5: 1,
        };
        return availableShips[length] === shipCounter ? 'LAST_SHIP_OF_KIND' : true;
    }

    /* proveShip(playerID){
      // checking that not too many ships of one type have been set
      let player = this.players[playerID];
      let countShip5 = 0;
      let countShip4 = 0;
      let countShip3 = 0;
      let countShip2 = 0;

      for(let i = 0; i < player.ships.length; ++i){
          if (player.ships[shipID].length == 5){
              ++countShip5;
              if(countShip5 > 1){
                delete player.ships[shipID]
                return false;
              }
          }else if (player.ships[shipID].length == 4){
              ++countShip4;
              if (countShip4 > 2){
                delete player.ships[shipID]
                return false;
              }
          }else if (player.ships[shipID].length == 3){
              ++countShip3;
              if (countShip3 > 3){
                delete player.ships[shipID]
                return false;
              }
          }else{
              countShip2;
              if (countShip2 > 4){
                delete player.ships[shipID]
                return false;
              }
          }
      }
    }*/
}

