# Minecraft Clone

A web-based Minecraft clone built with Three.js and Ammo.js.

## Features

- 3D voxel world with procedural generation
- Realistic physics with gravity and collisions
- Block placement and breaking
- Smooth player movement and jumping
- First-person camera
- Multiplayer support with real-time updates
- Chunk-based world loading for performance

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and go to `http://localhost:8080`

4. Enter a username and connect to start playing!

## Hosting a Server

Anyone can host their own server by running the server script. No central server required.

## Controls

- WASD: Move
- Space: Jump
- Mouse: Look around
- Click: Lock mouse for camera control

## Architecture

- `client/`: Client-side code (HTML, CSS, JS)
- `server/`: Node.js WebSocket server
- `shared/`: Shared constants and utilities

## Technologies

- Three.js for 3D rendering
- Ammo.js for physics
- WebSockets for multiplayer
- ES6 modules