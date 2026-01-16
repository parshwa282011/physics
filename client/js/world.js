import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import { CHUNK_SIZE, WORLD_HEIGHT, BLOCK_TYPES, BLOCK_COLORS } from '../../shared/constants.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new Map();
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.materials = {};
        Object.keys(BLOCK_COLORS).forEach(type => {
            this.materials[type] = new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[type] });
        });
    }

    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (this.chunks.has(chunkKey)) return;

        const chunk = new THREE.Group();
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;
                const height = Math.floor(Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 10) + 20;

                for (let y = 0; y < Math.min(height, WORLD_HEIGHT); y++) {
                    let blockType = BLOCK_TYPES.STONE;
                    if (y === height - 1) blockType = BLOCK_TYPES.GRASS;
                    else if (y >= height - 3) blockType = BLOCK_TYPES.DIRT;

                    this.setBlock(worldX, y, worldZ, blockType, chunk);
                }
            }
        }

        // Generate trees
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                if (Math.random() < 0.02) { // 2% chance
                    const worldX = chunkX * CHUNK_SIZE + x;
                    const worldZ = chunkZ * CHUNK_SIZE + z;
                    const height = Math.floor(Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1) * 10) + 20;
                    const treeHeight = Math.floor(Math.random() * 3) + 4; // 4-6 blocks tall

                    // Trunk
                    for (let y = height; y < height + treeHeight; y++) {
                        this.setBlock(worldX, y, worldZ, BLOCK_TYPES.WOOD, chunk);
                    }

                    // Leaves
                    for (let dx = -2; dx <= 2; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dz = -2; dz <= 2; dz++) {
                                if (Math.abs(dx) + Math.abs(dz) <= 3 && Math.random() < 0.7) {
                                    this.setBlock(worldX + dx, height + treeHeight + dy, worldZ + dz, BLOCK_TYPES.LEAVES, chunk);
                                }
                            }
                        }
                    }
                }
            }
        }
        this.chunks.set(chunkKey, chunk);
        this.scene.add(chunk);
    }

    setBlock(x, y, z, blockType, chunk = null) {
        const blockKey = `${x},${y},${z}`;
        if (this.blocks.has(blockKey)) {
            const existingMesh = this.blocks.get(blockKey);
            this.scene.remove(existingMesh);
        }

        if (blockType === BLOCK_TYPES.AIR) {
            this.blocks.delete(blockKey);
            return;
        }

        const mesh = new THREE.Mesh(this.geometry, this.materials[blockType]);
        mesh.position.set(x, y, z);
        this.blocks.set(blockKey, mesh);

        if (chunk) {
            chunk.add(mesh);
        } else {
            this.scene.add(mesh);
        }
    }

    getBlock(x, y, z) {
        const blockKey = `${x},${y},${z}`;
        return this.blocks.has(blockKey) ? this.blocks.get(blockKey).material.color.getHex() : BLOCK_TYPES.AIR;
    }

    update(playerPosition) {
        const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const chunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        // Generate nearby chunks
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                this.generateChunk(chunkX + dx, chunkZ + dz);
            }
        }

        // Unload distant chunks
        for (const [key, chunk] of this.chunks) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - chunkX) > 3 || Math.abs(cz - chunkZ) > 3) {
                this.scene.remove(chunk);
                this.chunks.delete(key);
            }
        }
    }

    getBlockMeshes() {
        return Array.from(this.blocks.values());
    }
}