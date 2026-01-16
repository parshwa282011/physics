import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

// Simple physics implementation without Ammo.js for now
// TODO: Integrate proper Ammo.js physics

export class Physics {
    constructor() {
        this.gravity = -30;
        this.rigidBodies = [];
    }

    addRigidBody(mesh, mass = 0, shape = null) {
        this.rigidBodies.push({ mesh, mass, velocity: new THREE.Vector3(), onGround: false });
    }

    update(deltaTime) {
        for (const body of this.rigidBodies) {
            if (body.mass > 0) {
                // Apply gravity
                body.velocity.y += this.gravity * deltaTime;

                // Simple ground collision
                if (body.mesh.position.y <= 0) {
                    body.mesh.position.y = 0;
                    body.velocity.y = 0;
                    body.onGround = true;
                } else {
                    body.onGround = false;
                }

                // Update position
                body.mesh.position.add(body.velocity.clone().multiplyScalar(deltaTime));
            }
        }
    }

    removeRigidBody(body) {
        const index = this.rigidBodies.indexOf(body);
        if (index > -1) {
            this.rigidBodies.splice(index, 1);
        }
    }
}