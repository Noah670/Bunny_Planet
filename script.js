// Bunny Planet - simple Three.js demo with spherical planets

let scene, camera, renderer;
let player;
const keys = {};
const planets = [];
const gravity = 9.8;
const clock = new THREE.Clock();

init();
animate();

function init() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Create some vibrant planets
    createPlanet(5, new THREE.Vector3(0, 0, 0), 0x88ccff); // home planet
    createPlanet(3, new THREE.Vector3(15, 0, 0), 0xff8888);
    createPlanet(4, new THREE.Vector3(-12, 0, 8), 0x88ff88);

    // Player represented by a small cube
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    player = {
        mesh,
        planet: planets[0],
        lon: 0,  // longitude around the planet
        lat: 0,  // latitude above/below equator
        radialDist: planets[0].radius + 0.5,
        vel: 0,
        canJump: true
    };

    updatePlayerPosition();

    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);
    window.addEventListener('resize', onResize);
}

function createPlanet(radius, pos, color) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    planets.push({ mesh, radius, position: pos });
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updatePlayer(delta) {
    const moveSpeed = 1.5;
    if (keys['KeyA']) player.lon += moveSpeed * delta;
    if (keys['KeyD']) player.lon -= moveSpeed * delta;
    if (keys['KeyW']) player.lat = Math.min(player.lat + moveSpeed * delta, Math.PI / 2 - 0.01);
    if (keys['KeyS']) player.lat = Math.max(player.lat - moveSpeed * delta, -Math.PI / 2 + 0.01);

    if (keys['Space'] && player.canJump) {
        player.vel = 4; // jump velocity
        player.canJump = false;
    }

    player.vel -= gravity * delta;
    player.radialDist += player.vel * delta;

    const surface = player.planet.radius + 0.5;
    if (player.radialDist < surface) {
        player.radialDist = surface;
        player.vel = 0;
        player.canJump = true;
    }

    updatePlayerPosition();
}

function updatePlayerPosition() {
    const planetPos = player.planet.position;
    const r = player.radialDist;
    const x = planetPos.x + r * Math.cos(player.lat) * Math.cos(player.lon);
    const y = planetPos.y + r * Math.sin(player.lat);
    const z = planetPos.z + r * Math.cos(player.lat) * Math.sin(player.lon);

    player.mesh.position.set(x, y, z);

    // Orient the player so "up" points away from planet center
    const up = new THREE.Vector3().subVectors(player.mesh.position, planetPos).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    player.mesh.quaternion.copy(quat);
}

function updateCamera() {
    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const forward = new THREE.Vector3(
        -Math.cos(player.lat) * Math.sin(player.lon),
        0,
        -Math.cos(player.lat) * Math.cos(player.lon)
    ).normalize();
    const offset = forward.clone().multiplyScalar(-5).add(up.clone().multiplyScalar(2));
    camera.position.copy(player.mesh.position).add(offset);
    camera.up.copy(up);
    camera.lookAt(player.mesh.position);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updatePlayer(delta);
    updateCamera();
    renderer.render(scene, camera);
}
