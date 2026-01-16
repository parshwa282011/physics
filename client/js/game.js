import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Physics } from './physics.js';
import { Network } from './network.js';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../../shared/constants.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // Sky blue background
        document.getElementById('game').appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x606060, 0.6); // Brighter ambient
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);

        this.physics = new Physics();
        this.world = new World(this.scene, this.physics);
        this.player = new Player(this.camera, this.physics, this);
        this.network = null;
        this.otherPlayers = new Map();

        this.clock = new THREE.Clock();
        this.animate();
    }

    connect(serverUrl, username) {
        this.network = new Network(serverUrl, username, this);
        document.getElementById('login').style.display = 'none';
        document.getElementById('game').style.display = 'block';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = this.clock.getDelta();

        this.player.update(deltaTime);
        this.physics.update(deltaTime);

        // Send input to server
        if (this.network) {
            this.network.sendInput(this.player.input);
        }

        this.renderer.render(this.scene, this.camera);
    }

    onBlockUpdate(x, y, z, blockType) {
        // Not used, server handles
    }

    updateOtherPlayer(username, data) {
        if (!this.otherPlayers.has(username)) {
            const group = new THREE.Group();
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.8), new THREE.MeshLambertMaterial({color: 0xff0000}));
            group.add(box);
            this.scene.add(group);
            this.otherPlayers.set(username, group);
        }
        const group = this.otherPlayers.get(username);
        group.position.set(data.pos.x, data.pos.y, data.pos.z);
        group.rotation.y = data.rot.y;
    }
}