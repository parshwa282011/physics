import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { PLAYER_SPEED, JUMP_FORCE, BLOCK_TYPES } from '../../shared/constants.js';

export class Player {
    constructor(camera, physics, game) {
        this.camera = camera;
        this.physics = physics;
        this.game = game;
        this.position = new THREE.Vector3(0, 40, 0);
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.rotation = {x: 0, y: 0};

        this.input = {keys: {}, mouseMovement: {x: 0, y: 0}, jump: false};

        // Player model
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.9, 0.8),
            new THREE.MeshLambertMaterial({ color: 0x00ff00 })
        );
        this.game.scene.add(this.mesh);

        // Name tag
        this.createNameTag();

        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        this.camera.position.copy(this.position);
        this.camera.lookAt(0, 0, -1);

        // Mouse controls
        this.mouseMovement = new THREE.Vector2();
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouseMovement.x -= e.movementX * 0.002;
                this.mouseMovement.y -= e.movementY * 0.002;
                this.mouseMovement.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseMovement.y));
            }
        });

        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        // Block interaction
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement) {
                this.handleBlockInteraction(e.button);
            }
        });
    }

    handleBlockInteraction(button) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const intersects = raycaster.intersectObjects(this.game.world.getBlockMeshes());

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const point = intersect.point;
            const normal = intersect.face.normal;

            let blockPos;
            if (button === 0) { // Left click - break
                blockPos = new THREE.Vector3(
                    Math.floor(point.x - normal.x * 0.5),
                    Math.floor(point.y - normal.y * 0.5),
                    Math.floor(point.z - normal.z * 0.5)
                );
            } else if (button === 2) { // Right click - place
                blockPos = new THREE.Vector3(
                    Math.floor(point.x + normal.x * 0.5),
                    Math.floor(point.y + normal.y * 0.5),
                    Math.floor(point.z + normal.z * 0.5)
                );
                // Don't place if too close to player
                if (blockPos.distanceTo(this.position) < 2) return;
            }

            this.game.network.sendBlockAction(button === 0 ? 'break' : 'place', blockPos);
        }
    }

    update(deltaTime) {
        // Update input
        this.input.keys = {...this.keys};
        this.input.mouseMovement = {x: this.mouseMovement.x, y: this.mouseMovement.y};
        this.input.jump = this.keys['Space'];

        // Update local rotation for camera (client-side prediction)
        this.rotation.y -= this.input.mouseMovement.x * 0.002;
        this.rotation.x -= this.input.mouseMovement.y * 0.002;
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

        // Update camera position and rotation
        this.camera.position.copy(this.position).add(new THREE.Vector3(0, 0.8, 0));
        this.camera.rotation.set(this.rotation.x, this.rotation.y, 0, 'YXZ');

        // Update player model and name tag
        this.mesh.position.copy(this.position);
        this.nameTag.position.copy(this.position).add(new THREE.Vector3(0, 1.2, 0));
        this.nameTag.lookAt(this.camera.position);
    }

    createNameTag() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        context.font = 'Bold 20px Arial';
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, 256, 64);
        context.fillStyle = 'white';
        context.textAlign = 'center';
        if (this.game.network) {
            context.fillText(this.game.network.username, 128, 40);
        }else{
            context.fillText('Player', 128, 40);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        this.nameTag = new THREE.Sprite(material);
        this.nameTag.scale.set(2, 0.5, 1);
        this.game.scene.add(this.nameTag);
    }

    checkGround() {
        // Simple ground check - cast ray down
        const raycaster = new THREE.Raycaster();
        raycaster.set(this.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(this.game.world.getBlockMeshes());
        if (intersects.length > 0 && intersects[0].distance < 1.9) {
            this.onGround = true;
        } else {
            this.onGround = false;
        }
    }
}