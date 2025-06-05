"use strict";
// Bunny Planet - simple Three.js demo with spherical planets

let scene, camera, renderer;
let player;
const keys = {};
const planets = [];
const bunnies = [];
const gravity = 9.8;
const clock = new THREE.Clock();

let bunnyCounter;
let timerDisplay;
let timer = 250;

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startButton');
    startBtn.addEventListener('click', () => {
        document.getElementById('startScreen').style.display = 'none';
        init();
        animate();
    });
});

function createPlayerModel() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3355ff });
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd });
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.8;
    group.add(head);

    const hatMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const brimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 1.05;
    group.add(brim);
    const hatGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.2, 16);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.15;
    group.add(hat);

    return group;
}

function init() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    bunnyCounter = document.getElementById('bunnyCount');
    timerDisplay = document.getElementById('timerVal');

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

    // Spawn some mischievous bunnies
    createBunny(planets[0]);
    createBunny(planets[0]);
    createBunny(planets[1]);
    createBunny(planets[2]);
    createBunny(planets[2]);

    bunnyCounter.textContent = bunnies.length;

    // Player model
    const mesh = createPlayerModel();
    scene.add(mesh);

    const startPlanet = planets[0];
    const up = new THREE.Vector3(0, 1, 0);
    mesh.position.copy(startPlanet.position).add(up.clone().multiplyScalar(startPlanet.radius + 0.5));

    player = {
        mesh,
        planet: startPlanet,
        radialDist: startPlanet.radius + 0.5,
        radialVel: 0,
        canJump: true,
        forward: new THREE.Vector3(0, 0, -1)
    };

    orientPlayer();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
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

function createBunny(planet) {
    const geo = new THREE.SphereGeometry(0.3, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffc0cb });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    const bunny = {
        mesh,
        planet,
        lon: Math.random() * Math.PI * 2,
        lat: (Math.random() - 0.5) * 0.6,
        radialDist: planet.radius + 0.3,
        velLon: (Math.random() * 2 - 1) * 0.5,
        velLat: (Math.random() * 2 - 1) * 0.2,
        changeTimer: 2 + Math.random() * 3
    };
    bunnies.push(bunny);
    updateBunnyPosition(bunny);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'KeyE') attemptPlanetHop();
}

function onKeyUp(e) {
    keys[e.code] = false;
}

function updatePlayer(delta) {
    const moveSpeed = 3;

    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const right = new THREE.Vector3().crossVectors(camDir, up).normalize();
    const forward = new THREE.Vector3().crossVectors(up, right).normalize();

    const move = new THREE.Vector3();
    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.add(forward.clone().negate());
    if (keys['KeyA']) move.add(right.clone().negate());
    if (keys['KeyD']) move.add(right);

    if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(moveSpeed * delta);
        const fromCenter = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position);
        fromCenter.add(move);
        fromCenter.setLength(player.radialDist);
        player.mesh.position.copy(player.planet.position).add(fromCenter);
        player.forward.copy(forward);
    }

    if (keys['Space'] && player.canJump) {
        player.radialVel = 4;
        player.canJump = false;
    }

    player.radialVel -= gravity * delta;
    player.radialDist += player.radialVel * delta;

    // Check if closer to a different planet
    let closest = player.planet;
    let minSurfaceDist = Infinity;
    for (const p of planets) {
        const d = player.mesh.position.distanceTo(p.position) - p.radius;
        if (d < minSurfaceDist) {
            minSurfaceDist = d;
            closest = p;
        }
    }
    player.planet = closest;

    const surface = player.planet.radius + 0.5;
    if (player.radialDist < surface) {
        player.radialDist = surface;
        player.radialVel = 0;
        player.canJump = true;
    }

    // Re-project onto new planet surface with radialDist
    const dir = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    player.mesh.position.copy(player.planet.position).add(dir.multiplyScalar(player.radialDist));
    orientPlayer();
}

function orientPlayer() {
    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    player.mesh.quaternion.copy(quat);
}

function attemptPlanetHop() {
    let target = null;
    let minDist = Infinity;
    for (const p of planets) {
        if (p === player.planet) continue;
        const d = player.mesh.position.distanceTo(p.position) - p.radius;
        if (d < minDist) {
            minDist = d;
            target = p;
        }
    }
    if (target && minDist < 5) {
        player.planet = target;
        player.radialDist = target.radius + 0.5;
        const dir = new THREE.Vector3().subVectors(player.mesh.position, target.position).normalize();
        player.mesh.position.copy(target.position).add(dir.multiplyScalar(player.radialDist));
        player.radialVel = 0;
        orientPlayer();
    }
}

function updateBunnyPosition(bunny) {
    const planetPos = bunny.planet.position;
    const r = bunny.radialDist;
    const x = planetPos.x + r * Math.cos(bunny.lat) * Math.cos(bunny.lon);
    const y = planetPos.y + r * Math.sin(bunny.lat);
    const z = planetPos.z + r * Math.cos(bunny.lat) * Math.sin(bunny.lon);
    bunny.mesh.position.set(x, y, z);
    const up = new THREE.Vector3().subVectors(bunny.mesh.position, planetPos).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    bunny.mesh.quaternion.copy(quat);
}

function updateBunnies(delta) {
    for (let i = bunnies.length - 1; i >= 0; i--) {
        const b = bunnies[i];
        const playerVec = new THREE.Vector3().subVectors(player.mesh.position, b.planet.position);
        const playerLon = Math.atan2(playerVec.z, playerVec.x);
        const playerLat = Math.asin(playerVec.y / playerVec.length());

        const distToPlayer = b.mesh.position.distanceTo(player.mesh.position);
        if (distToPlayer < 2) {
            let dLon = b.lon - playerLon;
            let dLat = b.lat - playerLat;
            if (dLon > Math.PI) dLon -= Math.PI * 2;
            if (dLon < -Math.PI) dLon += Math.PI * 2;
            b.velLon += Math.sign(dLon) * 0.6 * delta;
            b.velLat += Math.sign(dLat) * 0.3 * delta;
        }

        b.lon += b.velLon * delta;
        b.lat += b.velLat * delta;
        b.changeTimer -= delta;
        if (b.changeTimer <= 0) {
            b.velLon = (Math.random() * 2 - 1) * 0.5;
            b.velLat = (Math.random() * 2 - 1) * 0.2;
            b.changeTimer = 2 + Math.random() * 3;
        }
        updateBunnyPosition(b);

        if (b.mesh.position.distanceTo(player.mesh.position) < 0.6) {
            scene.remove(b.mesh);
            bunnies.splice(i, 1);
            bunnyCounter.textContent = bunnies.length;
            if (bunnies.length === 0) {
                document.getElementById('ui').textContent = 'All bunnies caught!';
            }
        }
    }
}

function updateCamera() {
    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const offset = player.forward.clone().normalize().multiplyScalar(-5).add(up.clone().multiplyScalar(2));
    camera.position.copy(player.mesh.position).add(offset);
    camera.up.copy(up);
    camera.lookAt(player.mesh.position);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updatePlayer(delta);
    updateBunnies(delta);
    updateCamera();

    timer -= delta;
    if (timer < 0) timer = 0;
    if (timerDisplay) timerDisplay.textContent = Math.ceil(timer);

    renderer.render(scene, camera);
}
