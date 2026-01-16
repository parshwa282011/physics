const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const port = 8080;

// Constants
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 64;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 10;
const GRAVITY = -30;

// Block types
const BLOCK_TYPES = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  COBBLESTONE: 6,
  PLANKS: 7,
  SAND: 8,
  WATER: 9
};

// World storage
const worldBlocks = new Map(); // 'x,y,z' => blockType

// Generate chunk
function generateChunk(chunkX, chunkZ) {
  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = chunkX * CHUNK_SIZE + x;
      const worldZ = chunkZ * CHUNK_SIZE + z;
      const height = Math.floor(Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 10) + 20;

      for (let y = 0; y < Math.min(height + 1, WORLD_HEIGHT); y++) {
        let blockType = BLOCK_TYPES.STONE;
        if (y === height) blockType = BLOCK_TYPES.GRASS;
        else if (y >= height - 3) blockType = BLOCK_TYPES.DIRT;

        const key = `${worldX},${y},${worldZ}`;
        worldBlocks.set(key, blockType);
      }

      // Random trees
      if (Math.random() < 0.01 && height > 5) { // 1% chance
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        for (let ty = 1; ty <= treeHeight; ty++) {
          const key = `${worldX},${height + ty},${worldZ}`;
          worldBlocks.set(key, BLOCK_TYPES.WOOD);
        }
        // Leaves
        for (let lx = -2; lx <= 2; lx++) {
          for (let lz = -2; lz <= 2; lz++) {
            for (let ly = 0; ly <= 2; ly++) {
              if (Math.abs(lx) + Math.abs(lz) + ly <= 3) {
                const key = `${worldX + lx},${height + treeHeight + ly},${worldZ + lz}`;
                if (!worldBlocks.has(key)) worldBlocks.set(key, BLOCK_TYPES.LEAVES);
              }
            }
          }
        }
      }
    }
  }
}

// Get block at position
function getBlock(x, y, z) {
  const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  return worldBlocks.get(key) || BLOCK_TYPES.AIR;
}

// Check collision for player
function checkCollision(pos, size = {w: 0.8, h: 1.9, d: 0.8}) {
  const halfW = size.w / 2;
  const halfD = size.d / 2;
  const corners = [
    {x: pos.x - halfW, y: pos.y, z: pos.z - halfD},
    {x: pos.x + halfW, y: pos.y, z: pos.z - halfD},
    {x: pos.x - halfW, y: pos.y, z: pos.z + halfD},
    {x: pos.x + halfW, y: pos.y, z: pos.z + halfD},
    {x: pos.x - halfW, y: pos.y + size.h, z: pos.z - halfD},
    {x: pos.x + halfW, y: pos.y + size.h, z: pos.z - halfD},
    {x: pos.x - halfW, y: pos.y + size.h, z: pos.z + halfD},
    {x: pos.x + halfW, y: pos.y + size.h, z: pos.z + halfD}
  ];

  for (const corner of corners) {
    const block = getBlock(corner.x, corner.y, corner.z);
    if (block !== BLOCK_TYPES.AIR && block !== BLOCK_TYPES.WATER) {
      return true; // Collision
    }
  }
  return false;
}

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve shared directory
app.use('/shared', express.static(path.join(__dirname, '../shared')));

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

const players = new Map();

wss.on('connection', (ws) => {
    console.log('New connection');

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                if (players.has(data.username)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Username taken' }));
                    ws.close();
                    return;
                }
                players.set(data.username, ws);
                ws.username = data.username;
                // Initialize player state
                ws.position = {x: 0, y: 40, z: 0};
                ws.velocity = {x: 0, y: 0, z: 0};
                ws.rotation = {x: 0, y: 0};
                ws.input = {keys: {}, mouseMovement: {x: 0, y: 0}, jump: false};
                ws.onGround = false;
                ws.size = {width: 0.8, height: 1.9, depth: 0.8};

                // Generate initial chunks
                for (let dx = -2; dx <= 2; dx++) {
                  for (let dz = -2; dz <= 2; dz++) {
                    generateChunk(dx, dz);
                  }
                }

                // Send world blocks
                const blocks = {};
                for (const [key, type] of worldBlocks) {
                  blocks[key] = type;
                }
                ws.send(JSON.stringify({ type: 'world', blocks }));

                ws.send(JSON.stringify({ type: 'welcome' }));

                // Notify other players
                broadcast({ type: 'playerJoined', username: data.username }, ws);
                break;

            case 'input':
                ws.input = data.input;
                break;

            case 'blockAction':
                const key = `${data.pos.x},${data.pos.y},${data.pos.z}`;
                if (data.action === 'break') {
                    worldBlocks.set(key, BLOCK_TYPES.AIR);
                } else if (data.action === 'place') {
                    worldBlocks.set(key, BLOCK_TYPES.STONE);
                }
                broadcast({ type: 'blockUpdate', x: data.pos.x, y: data.pos.y, z: data.pos.z, blockType: data.action === 'break' ? BLOCK_TYPES.AIR : BLOCK_TYPES.STONE }, ws);
                break;

            case 'blockUpdate':
                const bkey = `${data.x},${data.y},${data.z}`;
                worldState.set(bkey, data.blockType);
                broadcast(data, ws);
                break;
        }
    });

    ws.on('close', () => {
        if (ws.username) {
            players.delete(ws.username);
            broadcast({ type: 'playerLeft', username: ws.username });
        }
    });
});

function broadcast(data, excludeWs = null) {
    for (const [username, client] of players) {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

// Physics simulation loop
setInterval(() => {
    const deltaTime = 1 / 60;

    for (let ws of players.values()) {
        // Update rotation
        ws.rotation.y -= ws.input.mouseMovement.x * 0.002;
        ws.rotation.x -= ws.input.mouseMovement.y * 0.002;
        ws.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ws.rotation.x));

        // Movement
        let direction = {x: 0, z: 0};
        if (ws.input.keys.KeyW) direction.z -= 1;
        if (ws.input.keys.KeyS) direction.z += 1;
        if (ws.input.keys.KeyA) direction.x -= 1;
        if (ws.input.keys.KeyD) direction.x += 1;

        // Normalize
        const len = Math.sqrt(direction.x ** 2 + direction.z ** 2);
        if (len > 0) {
            direction.x /= len;
            direction.z /= len;
        }

        direction.x *= PLAYER_SPEED * deltaTime;
        direction.z *= PLAYER_SPEED * deltaTime;

        // Apply rotation
        const cos = Math.cos(ws.rotation.y);
        const sin = Math.sin(ws.rotation.y);
        const newX = direction.x * cos - direction.z * sin;
        const newZ = direction.x * sin + direction.z * cos;

        ws.velocity.x = newX / deltaTime; // Convert back to velocity
        ws.velocity.z = newZ / deltaTime;

        // Jump
        if (ws.input.jump && ws.onGround) {
            ws.velocity.y = JUMP_FORCE;
            ws.onGround = false;
        }

        // Apply gravity
        ws.velocity.y += GRAVITY * deltaTime;

        // Update position with collision
        const newPosX = {x: ws.position.x + ws.velocity.x * deltaTime, y: ws.position.y, z: ws.position.z};
        if (!checkCollision(newPosX, ws.size)) {
            ws.position.x = newPosX.x;
        } else {
            ws.velocity.x = 0;
        }

        const newPosZ = {x: ws.position.x, y: ws.position.y, z: ws.position.z + ws.velocity.z * deltaTime};
        if (!checkCollision(newPosZ, ws.size)) {
            ws.position.z = newPosZ.z;
        } else {
            ws.velocity.z = 0;
        }

        const newPosY = {x: ws.position.x, y: ws.position.y + ws.velocity.y * deltaTime, z: ws.position.z};
        if (!checkCollision(newPosY, ws.size)) {
            ws.position.y = newPosY.y;
        } else {
            ws.velocity.y = 0;
            ws.onGround = true;
        }

        // Ground collision (simple)
        if (ws.position.y <= 0) {
            ws.position.y = 0;
            ws.velocity.y = 0;
            ws.onGround = true;
        } else {
            ws.onGround = false;
        }
    }

    // Broadcast positions
    const positions = {};
    for (let [username, ws] of players) {
        positions[username] = {
            pos: ws.position,
            rot: ws.rotation
        };
    }
    broadcast({ type: 'positions', positions });
}, 1000 / 60);