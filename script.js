"use strict";
// Bunny Planet - simple Three.js demo with spherical planets

let scene, camera, renderer;
let player;
const keys = {};
const joystick = { x: 0, y: 0, active: false, stick: null };
const planets = [];
const bunnies = [];
const itemBoxes = [];
const spinningItems = [];
let questionTexture;
let audioCtx;
const gravity = 9.8;
const clock = new THREE.Clock();

let cameraYaw = 0;
let cameraPitch = 0.3;
let drag = false;
let prevX = 0;
let prevY = 0;

let bunnyCounter;
let timerDisplay;
let tongueBtn;
let timer = 250;
let gameOver = false;

function showComplete(win) {
    gameOver = true;
    const screen = document.getElementById('completeScreen');
    const msg = document.getElementById('completeMessage');
    msg.textContent = win ? 'Planet Completed!' : 'Time\'s up!';
    screen.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const startBtn = document.getElementById('startButton');
    startBtn.addEventListener('click', () => {
        document.getElementById('startScreen').style.display = 'none';
        init();
        animate();
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        window.location.reload();
    });

    joystick.stick = document.getElementById('stick');
    const joyEl = document.getElementById('joystick');
    const handleJoy = (e) => {
        if (!e.touches[0]) return;
        const rect = joyEl.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left - rect.width / 2;
        const y = e.touches[0].clientY - rect.top - rect.height / 2;
        const max = rect.width / 2;
        const dist = Math.sqrt(x * x + y * y);
        let nx = x, ny = y;
        if (dist > max) {
            nx *= max / dist;
            ny *= max / dist;
        }
        joystick.x = nx / max;
        joystick.y = ny / max;
        joystick.stick.style.transform = `translate(${nx}px, ${ny}px)`;
    };
    joyEl.addEventListener('touchstart', (e) => { joystick.active = true; handleJoy(e); });
    joyEl.addEventListener('touchmove', handleJoy);
    joyEl.addEventListener('touchend', () => {
        joystick.active = false;
        joystick.x = joystick.y = 0;
        joystick.stick.style.transform = 'translate(0, 0)';
    });

    const jumpBtn = document.getElementById('jumpButton');
    const hopBtn = document.getElementById('hopButton');
    tongueBtn = document.getElementById('tongueButton');
    const setJump = (val) => { keys['Space'] = val; };
    ['touchstart','mousedown'].forEach(ev => jumpBtn.addEventListener(ev, (e)=>{ e.preventDefault(); setJump(true); }));
    ['touchend','mouseup','mouseleave'].forEach(ev => jumpBtn.addEventListener(ev, (e)=>{ e.preventDefault(); setJump(false); }));

    const hopHandler = (e) => { e.preventDefault(); attemptPlanetHop(); };
    ['touchstart','mousedown'].forEach(ev => hopBtn.addEventListener(ev, hopHandler));

    const tongueHandler = (e) => { e.preventDefault(); useTongue(); };
    ['touchstart','mousedown'].forEach(ev => tongueBtn.addEventListener(ev, tongueHandler));

    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('pointerdown', (e) => {
        if (e.target === joyEl || e.target === jumpBtn || e.target === hopBtn || e.target === tongueBtn) return;
        drag = true;
        prevX = e.clientX;
        prevY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        cameraYaw -= dx * 0.005;
        if (cameraYaw > Math.PI) cameraYaw -= Math.PI * 2;
        if (cameraYaw < -Math.PI) cameraYaw += Math.PI * 2;
        cameraPitch -= dy * 0.005;
        const limit = Math.PI / 3;
        cameraPitch = Math.max(-limit, Math.min(limit, cameraPitch));
    });
    window.addEventListener('pointerup', () => { drag = false; });
    window.addEventListener('pointercancel', () => { drag = false; });
});

function createPlayerModel() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3355ff });
    const fleshMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd });

    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.8, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const head = new THREE.Mesh(headGeo, fleshMat);
    head.position.y = 1.1;
    group.add(head);

    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.35, 0.9, 0);
    armL.rotation.z = Math.PI / 2;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.35;
    group.add(armR);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.15, 0.25, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    group.add(legR);

    const hatMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const brimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 1.3;
    group.add(brim);
    const hatGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.25, 16);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.45;
    group.add(hat);

    return group;
}

function createSky() {
    const geometry = new THREE.SphereGeometry(100, 32, 32);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x87ceff) },
            bottomColor: { value: new THREE.Color(0xb0e0ff) }
        },
        vertexShader: `varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec3 vPos; uniform vec3 topColor; uniform vec3 bottomColor; void main(){float h=normalize(vPos).y; gl_FragColor=vec4(mix(bottomColor, topColor, max(h,0.0)),1.0);}`,
        side: THREE.BackSide,
        depthWrite: false
    });
    const sky = new THREE.Mesh(geometry, material);
    scene.add(sky);
}

function init() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    bunnyCounter = document.getElementById('bunnyCount');
    timerDisplay = document.getElementById('timerVal');

    scene = new THREE.Scene();
    createSky();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Create some vibrant planets
    createPlanet(7, new THREE.Vector3(0, 0, 0), 0xff9933); // home planet now orange
    createPlanet(5, new THREE.Vector3(18, 0, 0), 0xff8888);
    createPlanet(6, new THREE.Vector3(-15, 0, 10), 0x88ff88);

    // Spawn some mischievous bunnies
    createBunny(planets[0]);
    createBunny(planets[0]);
    createBunny(planets[1]);
    createBunny(planets[2]);
    createBunny(planets[2]);

    // Add a few spinning item boxes
    createItemBox(planets[0]);
    createItemBox(planets[1]);
    createItemBox(planets[2]);

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
        forward: new THREE.Vector3(0, 0, -1),
        speedBoostTime: 0,
        tongueTime: 0
    };

    orientPlayer();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
}

function createPlanet(radius, pos, color) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.6,
        metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    planets.push({ mesh, radius, position: pos });
}

function createBunnyModel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const body = new THREE.SphereGeometry(0.25, 16, 16);
    const bodyMesh = new THREE.Mesh(body, mat);
    bodyMesh.position.y = 0.25;
    group.add(bodyMesh);

    const head = new THREE.SphereGeometry(0.18, 16, 16);
    const headMesh = new THREE.Mesh(head, mat);
    headMesh.position.y = 0.55;
    group.add(headMesh);

    const earGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const ear1 = new THREE.Mesh(earGeo, mat);
    ear1.position.set(-0.07, 0.8, 0);
    group.add(ear1);
    const ear2 = ear1.clone();
    ear2.position.x = 0.07;
    group.add(ear2);
    return group;
}

function createBunny(planet) {
    const mesh = createBunnyModel();
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
    if (e.code === 'KeyF') useTongue();
}

function onKeyUp(e) {
    keys[e.code] = false;
}

function updatePlayer(delta) {
    if (player.speedBoostTime > 0) player.speedBoostTime -= delta;
    if (player.tongueTime > 0) player.tongueTime -= delta;
    const moveSpeed = player.speedBoostTime > 0 ? 6 : 3;

    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const baseForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(up, cameraYaw);
    const right = new THREE.Vector3().crossVectors(baseForward, up).normalize();
    const forward = new THREE.Vector3().crossVectors(up, right).normalize();
    player.forward.copy(forward);

    const move = new THREE.Vector3();
    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.add(forward.clone().negate());
    if (keys['KeyA']) move.add(right.clone().negate());
    if (keys['KeyD']) move.add(right);
    if (Math.abs(joystick.x) > 0.05 || Math.abs(joystick.y) > 0.05) {
        move.add(forward.clone().multiplyScalar(-joystick.y));
        move.add(right.clone().multiplyScalar(joystick.x));
    }

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
    // Ensure forward is tangent to the surface
    const forward = player.forward.clone().projectOnPlane(up).normalize();
    if (forward.lengthSq() === 0) {
        forward.set(0, 0, -1).applyAxisAngle(up, cameraYaw);
    }
    const target = player.mesh.position.clone().add(forward);
    player.mesh.up.copy(up);
    player.mesh.lookAt(target);
}

function useTongue() {
    if (player.tongueTime <= 0) return;
    const range = 3;
    const dir = player.forward.clone().normalize();
    const start = player.mesh.position.clone().add(dir.clone().multiplyScalar(0.8));
    const end = start.clone().add(dir.clone().multiplyScalar(range));
    const geo = new THREE.CylinderGeometry(0.05, 0.05, range, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8080 });
    const tongue = new THREE.Mesh(geo, mat);
    tongue.position.copy(start.clone().add(end).multiplyScalar(0.5));
    tongue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(tongue);
    setTimeout(() => scene.remove(tongue), 200);

    for (let i = bunnies.length - 1; i >= 0; i--) {
        const b = bunnies[i];
        const dist = b.mesh.position.distanceTo(start);
        const angle = dir.dot(new THREE.Vector3().subVectors(b.mesh.position, start).normalize());
        if (dist <= range && angle > 0.7) {
            scene.remove(b.mesh);
            bunnies.splice(i, 1);
            bunnyCounter.textContent = bunnies.length;
            if (bunnies.length === 0) showComplete(true);
        }
    }
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
    if (target && minDist < 15) {
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
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), up);
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
                showComplete(true);
            }
        }
    }
}

function getQuestionTexture() {
    if (questionTexture) return questionTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7d64a';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#d1941d';
    ctx.fillRect(0, 0, 64, 8);
    ctx.fillRect(0, 0, 8, 64);
    ctx.fillRect(56, 0, 8, 64);
    ctx.fillRect(0, 56, 64, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 32, 34);
    questionTexture = new THREE.CanvasTexture(canvas);
    return questionTexture;
}

function createItemBox(planet) {
    const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const tex = getQuestionTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x333300 });
    const mesh = new THREE.Mesh(geo, mat);
    const box = {
        mesh,
        planet,
        lon: Math.random() * Math.PI * 2,
        lat: (Math.random() - 0.5) * 1.2,
        radialDist: planet.radius + 0.6
    };
    scene.add(mesh);
    itemBoxes.push(box);
    updateItemBoxPosition(box);
}

function updateItemBoxPosition(box) {
    const planetPos = box.planet.position;
    const r = box.radialDist;
    const x = planetPos.x + r * Math.cos(box.lat) * Math.cos(box.lon);
    const y = planetPos.y + r * Math.sin(box.lat);
    const z = planetPos.z + r * Math.cos(box.lat) * Math.sin(box.lon);
    box.mesh.position.set(x, y, z);
    const up = new THREE.Vector3().subVectors(box.mesh.position, planetPos).normalize();
    box.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
}

function playItemSound() {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    o.stop(audioCtx.currentTime + 0.3);
}

function grantRandomPowerUp() {
    const type = Math.random() < 0.5 ? 'speed' : 'tongue';
    grantPowerUp(type);
}

function grantPowerUp(type) {
    if (type === 'speed') {
        player.speedBoostTime = 8;
    } else if (type === 'tongue') {
        player.tongueTime = 8;
    }
}

function updateItemBoxes(delta) {
    for (let i = itemBoxes.length - 1; i >= 0; i--) {
        const box = itemBoxes[i];
        box.mesh.rotation.y += delta * 5;
        if (player.mesh.position.distanceTo(box.mesh.position) < 1) {
            scene.remove(box.mesh);
            itemBoxes.splice(i, 1);
            playItemSound();
            const type = Math.random() < 0.5 ? 'speed' : 'tongue';
            createPowerItem(type, box.mesh.position.clone());
        }
    }
}

function createPowerItem(type, pos) {
    const color = type === 'speed' ? 0x00ff00 : 0xff80c0;
    const geo = new THREE.IcosahedronGeometry(0.3, 0);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: 0x222222 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    spinningItems.push({ mesh, type, timer: 1 });
}

function updateSpinningItems(delta) {
    for (let i = spinningItems.length - 1; i >= 0; i--) {
        const item = spinningItems[i];
        item.mesh.rotation.y += delta * 6;
        item.mesh.position.y += delta;
        item.timer -= delta;
        if (item.timer <= 0 || player.mesh.position.distanceTo(item.mesh.position) < 1) {
            grantPowerUp(item.type);
            scene.remove(item.mesh);
            spinningItems.splice(i, 1);
        }
    }
}

function updateCamera() {
    const up = new THREE.Vector3().subVectors(player.mesh.position, player.planet.position).normalize();
    const dir = player.forward.clone().normalize();
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    dir.applyAxisAngle(right, cameraPitch);

    const offset = dir.clone().multiplyScalar(-5).add(up.clone().multiplyScalar(2));
    camera.position.copy(player.mesh.position).add(offset);
    camera.up.copy(up);
    camera.lookAt(player.mesh.position);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (!gameOver) {
        updatePlayer(delta);
        updateBunnies(delta);
        updateItemBoxes(delta);
        updateSpinningItems(delta);
        timer -= delta;
        if (timer <= 0) {
            timer = 0;
            showComplete(false);
        }
    }

    updateCamera();
    if (timerDisplay) timerDisplay.textContent = Math.ceil(timer);
    if (tongueBtn) tongueBtn.style.display = player.tongueTime > 0 ? 'block' : 'none';
    renderer.render(scene, camera);
}
