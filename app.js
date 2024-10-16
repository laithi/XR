// Import Three.js and GLTFLoader using ES Modules
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.1/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/webxr/XRControllerModelFactory.js';

// Initialize variables
let camera, scene, renderer;
let controller;
let score = 0;
const ghosts = [];
let spawnInterval;

// Get DOM elements
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('startButton');
const instructions = document.getElementById('instructions');

// Add event listener to start button
startButton.addEventListener('click', () => {
  // Initialize AR and hide the start button
  initAR();
  startButton.style.display = 'none';
  instructions.style.display = 'block';
});

// Function to initialize AR
function initAR() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
  scene.add(camera);

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Controller for user interaction
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Optional: Add controller models
  const controllerModelFactory = new XRControllerModelFactory();
  const controllerGrip = renderer.xr.getControllerGrip(0);
  controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
  scene.add(controllerGrip);

  // Start the AR session
  navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  }).then((session) => {
    renderer.xr.setSession(session);
  }).catch((err) => {
    console.error("Failed to start AR session:", err);
    alert("Unable to start AR session. Please try again.");
  });

  // Spawn ghosts at intervals
  spawnInterval = setInterval(spawnGhost, 3000); // Spawn a ghost every 3 seconds

  // Handle window resize
  window.addEventListener('resize', onWindowResize, false);

  // Start the rendering loop
  renderer.setAnimationLoop(render);
}

// Function to handle window resize
function onWindowResize() {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Function to spawn a ghost
function spawnGhost() {
  // Create a ghost using a GLTF model or a simple geometry as a fallback
  const loader = new GLTFLoader();
  
  // Path to your ghost model
  const modelPath = '/models/ghost.glb'; // Ensure this path is correct

  loader.load(
    modelPath,
    function (gltf) {
      const ghost = gltf.scene;
      ghost.scale.set(0.5, 0.5, 0.5);
      
      // Random position in front of the user within a certain range
      const range = 2; // 2 meters
      ghost.position.set(
        (Math.random() - 0.5) * range, // x: left/right
        (Math.random() - 0.5) * range * 0.5, // y: up/down (limited)
        - (Math.random() * range + 1) // z: distance away
      );

      // Optional: Add some floating animation
      ghost.userData = { velocity: new THREE.Vector3(0, 0.001 * Math.random(), 0) };
      
      scene.add(ghost);
      ghosts.push(ghost);
    },
    undefined,
    function (error) {
      console.error('An error occurred while loading the ghost model:', error);
      // Fallback: Create a simple semi-transparent sphere as a ghost
      const geometry = new THREE.SphereGeometry(0.1, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
        emissive: 0x4444ff,
        emissiveIntensity: 1
      });
      const ghost = new THREE.Mesh(geometry, material);
      
      // Random position in front of the user within a certain range
      const range = 2; // 2 meters
      ghost.position.set(
        (Math.random() - 0.5) * range, // x: left/right
        (Math.random() - 0.5) * range * 0.5, // y: up/down (limited)
        - (Math.random() * range + 1) // z: distance away
      );

      // Optional: Add some floating animation
      ghost.userData = { velocity: new THREE.Vector3(0, 0.001 * Math.random(), 0) };
      
      scene.add(ghost);
      ghosts.push(ghost);
    }
  );
}

// Function to handle user selection (capture)
function onSelect() {
  // Raycast from controller to detect intersections with ghosts
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  const ray = new THREE.Raycaster();
  ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  ray.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  const intersects = ray.intersectObjects(ghosts, true); // 'true' to check all descendants

  if (intersects.length > 0) {
    const intersectedGhost = intersects[0].object;
    // Traverse up to the root ghost object
    let parent = intersectedGhost;
    while (parent.parent && !ghosts.includes(parent)) {
      parent = parent.parent;
    }

    if (ghosts.includes(parent)) {
      scene.remove(parent);
      const index = ghosts.indexOf(parent);
      if (index > -1) {
        ghosts.splice(index, 1);
      }
      score += 1;
      scoreElement.innerText = `Score: ${score}`;
      
      // Optional: Add a capture effect (e.g., flash, sound)
      flashCaptureEffect(parent.position);
    }
  }
}

// Function to render the scene
function render() {
  // Update ghost animations
  ghosts.forEach((ghost) => {
    if (ghost.userData.velocity) {
      ghost.position.add(ghost.userData.velocity);
      // Simple oscillation to make ghosts float
      ghost.position.y += Math.sin(Date.now() * 0.001) * 0.001;
    }
  });

  renderer.render(scene, camera);
}

// Function to create a simple flash effect upon capture
function flashCaptureEffect(position) {
  const flashGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1 });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);
  flash.position.copy(position);
  scene.add(flash);

  // Animate the flash
  const duration = 300; // milliseconds
  const startTime = performance.now();

  function animateFlash(time) {
    const elapsed = time - startTime;
    if (elapsed < duration) {
      flash.material.opacity = 1 - (elapsed / duration);
      flash.scale.setScalar(1 + (elapsed / duration) * 2);
      requestAnimationFrame(animateFlash);
    } else {
      scene.remove(flash);
    }
  }

  requestAnimationFrame(animateFlash);
}
