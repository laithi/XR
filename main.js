// main.js

import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/webxr/ARButton.js';

// Initialize Three.js Scene
let scene, camera, renderer;
let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
const collectedTreats = [];

init();
animate();

function init() {
    // Scene and Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add AR Button
    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Reticle for Hit Testing
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x0fff0f });
    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Handle User Taps
    window.addEventListener('click', onUserClick, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
            session.requestReferenceSpace('viewer').then((refSpace) => {
                session.requestHitTestSource({ space: refSpace }).then((source) => {
                    hitTestSource = source;
                });
            });

            session.addEventListener('end', () => {
                hitTestSourceRequested = false;
                hitTestSource = null;
            });

            hitTestSourceRequested = true;
        }

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}

function onUserClick() {
    if (reticle.visible) {
        const treat = createTreat();
        treat.position.setFromMatrixPosition(reticle.matrix);
        scene.add(treat);
    }
}

function createTreat() {
    const treatGroup = new THREE.Group();

    // Candy Base
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshPhongMaterial({ color: 0xff69b4 });
    const candy = new THREE.Mesh(geometry, material);
    treatGroup.add(candy);

    // Candy Wrapper
    const wrapperGeometry = new THREE.TorusGeometry(0.05, 0.01, 16, 100);
    const wrapperMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const wrapper = new THREE.Mesh(wrapperGeometry, wrapperMaterial);
    wrapper.rotation.x = Math.PI / 2;
    treatGroup.add(wrapper);

    // Tag
    const tagGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const tagMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const tag = new THREE.Mesh(tagGeometry, tagMaterial);
    tag.position.set(0, 0.06, 0);
    treatGroup.add(tag);

    return treatGroup;
}

// Inventory Management
const inventoryContainer = document.getElementById('inventory-items');

function addToInventory(treat) {
    collectedTreats.push(treat);
    updateInventoryUI();
}

function updateInventoryUI() {
    inventoryContainer.innerHTML = '';
    collectedTreats.forEach((treat) => {
        const item = document.createElement('div');
        item.classList.add('inventory-item');
        item.style.backgroundImage = `url(${generateCandyImage(treat)})`;
        inventoryContainer.appendChild(item);
    });
}

function generateCandyImage(treat) {
    // Placeholder: In a real app, use actual images or render canvases
    return 'https://i.imgur.com/8Km9tLL.png'; // Example candy image
}

// Handle Treat Collection
renderer.xr.addEventListener('sessionstart', () => {
    window.addEventListener('select', onSelect, false);
});

function onSelect() {
    // Raycaster to detect intersected objects
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersected = intersects[0].object;

        // Check if the intersected object is a treat
        if (intersected.parent && intersected.parent instanceof THREE.Group) {
            collectTreat(intersected.parent);
        }
    }
}

function collectTreat(treat) {
    // Remove from scene
    scene.remove(treat);

    // Add to inventory
    addToInventory(treat);

    // Check for special treat to trigger mini-game
    if (Math.random() < 0.1) { // 10% chance
        triggerMiniGame();
    }
}

function triggerMiniGame() {
    alert('🎃 You found a special treat! Play a mini-game to earn extra rewards!');
    // Implement your mini-game logic here
    // For example, open a simple puzzle or a quick tap game
}
