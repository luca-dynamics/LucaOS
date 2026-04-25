import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const container = document.getElementById('hologram-container');

if (container) {
    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 2.5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Geometry - Icosahedron for the "Core" look
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    
    // Material - Wireframe with specific brand color (Purple: #a855f7)
    // Using LineSegments for cleaner wireframe
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe);
    line.material.depthTest = false;
    line.material.opacity = 0.8;
    line.material.transparent = true;
    line.material.color = new THREE.Color(0xa855f7);
    
    // Add inner glow (simple mesh inside)
    const innerGeometry = new THREE.IcosahedronGeometry(0.9, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);

    scene.add(line);
    scene.add(innerMesh);

    // Animation
    function animate() {
        requestAnimationFrame(animate);

        line.rotation.x += 0.002;
        line.rotation.y += 0.003;
        
        innerMesh.rotation.x += 0.002;
        innerMesh.rotation.y += 0.003;

        // Gentle floating effect
        const time = Date.now() * 0.001;
        line.position.y = Math.sin(time) * 0.1;
        innerMesh.position.y = Math.sin(time) * 0.1;

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    });
}
