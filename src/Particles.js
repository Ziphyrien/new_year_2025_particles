import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { vertexShader, fragmentShader } from './shaders.js';

export default class Particles {
    constructor(scene) {
        this.scene = scene;
        
        // Adapt particle count to window size
        // Adjusted for clearer definition on low-res screens
        const screenArea = window.innerWidth * window.innerHeight;
        this.count = Math.floor(Math.min(Math.max(screenArea * 0.015, 10000), 40000));

        this.material = null;
        this.points = null;
        
        this.init();
    }

    async init() {
        const loader = new FontLoader();
        
        // Load font from CDN
        loader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
            // 1. Create Geometries for both texts
            const geometry1 = new TextGeometry('2025', {
                font: font,
                size: 0.5,
                height: 0.2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 5
            });

            const geometry2 = new TextGeometry('2026', {
                font: font,
                size: 0.5,
                height: 0.2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 5
            });

            // Center geometries
            geometry1.center();
            geometry2.center();

            // 2. Sample points
            const positions1 = this.sampleCoordinates(geometry1);
            const positions2 = this.sampleCoordinates(geometry2);

            // 3. Create Particles Geometry
            const particlesGeometry = new THREE.BufferGeometry();
            
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
            particlesGeometry.setAttribute('aTarget', new THREE.BufferAttribute(positions2, 3));
            
            // Add random attribute for noise variation
            const randoms = new Float32Array(this.count);
            for(let i = 0; i < this.count; i++) {
                randoms[i] = Math.random();
            }
            particlesGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

            // 4. Create Material
            this.material = new THREE.ShaderMaterial({
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uProgress: { value: 0 },
                    uSize: { value: 12.0 * (window.devicePixelRatio || 1) }, // Reduced size for better detail
                    uColorCold: { value: new THREE.Color('#a8c0ff') },
                    uColorWarm: { value: new THREE.Color('#ffd700') }
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            // 5. Create Mesh
            this.points = new THREE.Points(particlesGeometry, this.material);
            this.scene.add(this.points);
        });
    }

    sampleCoordinates(geometry) {
        const material = new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        
        const sampler = new MeshSurfaceSampler(mesh).build();
        const array = new Float32Array(this.count * 3);
        const tempPosition = new THREE.Vector3();

        for (let i = 0; i < this.count; i++) {
            sampler.sample(tempPosition);
            array[i * 3] = tempPosition.x;
            array[i * 3 + 1] = tempPosition.y;
            array[i * 3 + 2] = tempPosition.z;
        }

        return array;
    }

    update(time, progress) {
        if (this.material) {
            this.material.uniforms.uTime.value = time;
            this.material.uniforms.uProgress.value = progress;
        }
    }

    resize() {
        if (this.material) {
            // Scale particle size based on screen height to maintain relative visual weight
            // Base scale: on 1080p, size ~15-20 looks good.
            // 1080 * 0.015 = 16.2
            this.material.uniforms.uSize.value = window.innerHeight * 0.015 * (window.devicePixelRatio || 1);
        }
    }
}
