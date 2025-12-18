import * as THREE from 'three';
import Particles from './Particles.js';
import GestureController from './GestureController.js';

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Particles
const particles = new Particles(scene);

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    
    // Update camera position to fit text
    updateCameraPosition();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Update particles size
    if(particles) particles.resize();
});

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
scene.add(camera);

// Function to adjust camera distance so text always fits screen
const updateCameraPosition = () => {
    // Text width approx 2.5 (2025 + margins)
    // We want to fit width 2.5 into view.
    // visible_width = 2 * tan(fov/2) * dist * aspect
    // dist = visible_width / (2 * tan(fov/2) * aspect)
    
    const targetWidth = 2.5;
    const fovRad = 75 * Math.PI / 180;
    const dist = targetWidth / (2 * Math.tan(fovRad / 2) * camera.aspect);
    
    // Minimum distance to avoid being too close
    camera.position.z = Math.max(2.5, dist);
};

// Initial call
updateCameraPosition();

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#050505');

// Scroll Logic
let scroll = {
    target: 0,
    current: 0
};

// Initialize Gesture Controller
const gestureController = new GestureController((progress) => {
    // Update scroll target based on hand position
    // Smoothly blend gesture input
    scroll.target = progress;
});

window.addEventListener('wheel', (e) => {
    // Normalize scroll speed
    const speed = e.deltaY * 0.001;
    scroll.target += speed;
    
    // Clamp target between 0 and 1
    scroll.target = Math.max(0, Math.min(1, scroll.target));
});

// Touch support for mobile/whiteboard
let touchStart = 0;
window.addEventListener('touchstart', (e) => {
    touchStart = e.touches[0].clientY;
});

window.addEventListener('touchmove', (e) => {
    const touchEnd = e.touches[0].clientY;
    const delta = touchStart - touchEnd;
    
    const speed = delta * 0.002;
    scroll.target += speed;
    scroll.target = Math.max(0, Math.min(1, scroll.target));
    
    touchStart = touchEnd;
});


// Animate
const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    // Smooth Scroll Damping
    // Linear interpolation: current = current + (target - current) * factor
    scroll.current = THREE.MathUtils.lerp(scroll.current, scroll.target, 0.05);

    // Update particles
    if (particles) {
        particles.update(elapsedTime, scroll.current);
    }

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();
