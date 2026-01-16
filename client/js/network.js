export class Network {
    constructor(serverUrl, username, game) {
        this.game = game;
        this.ws = new WebSocket(serverUrl);
        this.username = username;

        this.ws.onopen = () => {
            this.send({ type: 'join', username });
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }

    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'welcome':
                console.log('Joined server');
                break;
            case 'positions':
                // Update player positions
                for (const [username, playerData] of Object.entries(data.positions)) {
                    if (username === this.username) {
                        // Update own player
                        this.game.player.position.set(playerData.pos.x, playerData.pos.y, playerData.pos.z);
                        this.game.player.rotation = playerData.rot;
                    } else {
                        // Update other players (if implemented)
                        this.game.updateOtherPlayer(username, playerData);
                    }
                }
                break;
            case 'playerJoined':
                console.log(`${data.username} joined`);
                break;
            case 'playerLeft':
                console.log(`${data.username} left`);
                break;
            case 'world':
                // Set world blocks
                for (const [key, type] of Object.entries(data.blocks)) {
                  const [x, y, z] = key.split(',').map(Number);
                  this.game.world.setBlock(x, y, z, type);
                }
                break;
        }
    }

    sendBlockUpdate(x, y, z, blockType) {
        this.send({ type: 'blockUpdate', x, y, z, blockType });
    }

    sendInput(input) {
        this.send({ type: 'input', input });
    }

    sendBlockAction(action, pos) {
        this.send({ type: 'blockAction', action, pos: {x: pos.x, y: pos.y, z: pos.z} });
    }
}