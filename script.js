"use strict";
// Bunny Planet - simple Three.js demo with spherical planets

let scene, camera, renderer;
let pmremGenerator;
let envMap;
let player;
let skyDome;
let cloudDome;
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
let planetHud;
let planetName;
let planetList;
let controlHint;
let tongueBtn;
let timer = 250;
let gameOver = false;
let hintTimer = 4.5;
let lastTapTime = 0;
let lastTapPos = null;
const hopRange = 22;

const loadedAssets = {
    envMap: null,
    skybox: null,
    planetNormal: null,
    cloudTexture: null
};

let assetsPromise = Promise.resolve(loadedAssets);
let loadingOverlay;
let loadingText;
let loadingBarFill;
let maxAnisotropy = 1;
let startButton;

function preloadAssets(progressCallback) {
    const manager = new THREE.LoadingManager();
    manager.onStart = () => {
        if (progressCallback) progressCallback(0);
    };
    manager.onProgress = (_, loaded, total) => {
        if (!progressCallback || total === 0) return;
        progressCallback(Math.min(loaded / total, 1));
    };
    manager.onLoad = () => {
        if (progressCallback) progressCallback(1);
    };
    manager.onError = (url) => {
        console.warn(`Failed to load asset: ${url}`);
    };

    const skyboxLoader = new THREE.CubeTextureLoader(manager).setPath('https://threejs.org/examples/textures/cube/skyboxsun25/');
    const envLoader = new THREE.CubeTextureLoader(manager).setPath('https://threejs.org/examples/textures/cube/Bridge2/');
    const textureLoader = new THREE.TextureLoader(manager);

    const safeLoad = (promise) => promise.catch((err) => {
        console.warn('Falling back because an asset failed to load.', err);
        return null;
    });

    const skyboxPromise = safeLoad(skyboxLoader.loadAsync(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']).then((tex) => {
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }));

    const envPromise = safeLoad(envLoader.loadAsync(['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg']).then((tex) => {
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }));

    const normalPromise = safeLoad(textureLoader.loadAsync('https://threejs.org/examples/textures/terrain/grasslight-big-nm.jpg').then((tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }));

    const cloudPromise = safeLoad(textureLoader.loadAsync('https://threejs.org/examples/textures/lava/cloud.png').then((tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 1);
        return tex;
    }));

    return Promise.all([envPromise, skyboxPromise, normalPromise, cloudPromise]).then(([envTexture, skyboxTexture, normalTexture, cloudTexture]) => {
        return {
            envMap: envTexture,
            skybox: skyboxTexture,
            planetNormal: normalTexture,
            cloudTexture
        };
    });
}

function updateLoadingUI(progress) {
    const percent = Math.round(progress * 100);
    if (loadingText) loadingText.textContent = `Loading ${percent}%`;
    if (loadingBarFill) loadingBarFill.style.width = `${percent}%`;
    if (startButton && startButton.disabled) {
        startButton.textContent = `Loading... ${percent}%`;
    }
}

function showComplete(win) {
    gameOver = true;
    const screen = document.getElementById('completeScreen');
    const msg = document.getElementById('completeMessage');
    msg.textContent = win ? 'Planet Completed!' : 'Time\'s up!';
    screen.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    loadingOverlay = document.getElementById('loadingOverlay');
    loadingText = document.getElementById('loadingText');
    loadingBarFill = document.getElementById('loadingBarFill');

    startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.disabled = true;
        startButton.textContent = 'Loading... 0%';
    }

    const hideLoadingOverlay = () => {
        if (!loadingOverlay) return;
        loadingOverlay.classList.add('hidden');
        setTimeout(() => {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }, 350);
    };

    assetsPromise = preloadAssets(updateLoadingUI).then((assets) => {
        Object.assign(loadedAssets, assets);
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Start';
        }
        hideLoadingOverlay();
        return assets;
    }).catch((err) => {
        console.warn('Proceeding without preloaded assets.', err);
        if (startButton) {
            startButton.disabled = false;
            startButton.textContent = 'Start';
        }
        hideLoadingOverlay();
        return loadedAssets;
    });

    if (startButton) {
        startButton.addEventListener('click', async () => {
            startButton.disabled = true;
            document.getElementById('startScreen').style.display = 'none';
            try {
                await assetsPromise;
            } catch (err) {
                console.warn('Assets were not fully preloaded before starting.', err);
            }
            init();
            animate();
        });
    }

    const restartBtn = document.getElementById('restartButton');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

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
    const setJoystickBase = (x, y) => {
        const size = joyEl.offsetWidth || 120;
        joyEl.style.left = `${x - size / 2}px`;
        joyEl.style.top = `${y - size / 2}px`;
        joyEl.style.bottom = 'auto';
    };
    const resetJoystick = () => {
        joystick.active = false;
        joystick.x = joystick.y = 0;
        joystick.stick.style.transform = 'translate(0, 0)';
        joyEl.classList.remove('active');
        joyEl.style.left = '';
        joyEl.style.top = '';
        joyEl.style.bottom = '';
    };
    joyEl.addEventListener('touchstart', (e) => {
        joystick.active = true;
        joyEl.classList.add('active');
        if (e.touches[0] && e.touches[0].clientX < window.innerWidth * 0.55) {
            setJoystickBase(e.touches[0].clientX, e.touches[0].clientY);
        }
        handleJoy(e);
    });
    joyEl.addEventListener('touchmove', handleJoy);
    joyEl.addEventListener('touchend', resetJoystick);
    joyEl.addEventListener('touchcancel', resetJoystick);

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

    canvas.addEventListener('touchend', (e) => {
        if (!e.changedTouches[0]) return;
        const now = performance.now();
        const touch = e.changedTouches[0];
        const pos = { x: touch.clientX, y: touch.clientY };
        if (lastTapTime && now - lastTapTime < 320 && lastTapPos) {
            const dx = pos.x - lastTapPos.x;
            const dy = pos.y - lastTapPos.y;
            if (Math.hypot(dx, dy) < 40) {
                attemptPlanetHop();
            }
            lastTapTime = 0;
            lastTapPos = null;
        } else {
            lastTapTime = now;
            lastTapPos = pos;
        }
    });
});

function createPlayerModel() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3355ff, metalness: 0.35, roughness: 0.25, envMapIntensity: 1.4 });
    const fleshMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd, metalness: 0.1, roughness: 0.5, envMapIntensity: 0.8 });

    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.8, 24);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = 0.6;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const head = new THREE.Mesh(headGeo, fleshMat);
    head.castShadow = true;
    head.position.y = 1.1;
    group.add(head);

    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.5, 20);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.castShadow = true;
    armL.position.set(-0.35, 0.9, 0);
    armL.rotation.z = Math.PI / 2;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.35;
    group.add(armR);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 20);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.castShadow = true;
    legL.position.set(-0.15, 0.25, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.15;
    group.add(legR);

    const hatMat = new THREE.MeshStandardMaterial({ color: 0xff4a4a, metalness: 0.75, roughness: 0.2, envMapIntensity: 1.8, emissive: new THREE.Color(0x220000) });
    const brimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.castShadow = true;
    brim.position.y = 1.3;
    group.add(brim);
    const hatGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.25, 24);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.castShadow = true;
    hat.position.y = 1.45;
    group.add(hat);

    group.userData.parts = { armL, armR, legL, legR, body };
    group.userData.walkCycle = 0;

    return group;
}

function createSkyGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#7fd4ff');
    gradient.addColorStop(0.4, '#4fa4ff');
    gradient.addColorStop(1, '#17306b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

function createCloudDome() {
    const texture = loadedAssets.cloudTexture;
    if (!texture) return null;
    texture.anisotropy = Math.min(maxAnisotropy, 4);
    const cloudMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const cloudGeo = new THREE.SphereGeometry(420, 64, 64);
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    clouds.rotation.y = Math.random() * Math.PI * 2;
    return clouds;
}

function createSkybox() {
    if (loadedAssets.skybox) {
        scene.background = loadedAssets.skybox;
    } else {
        const loader = new THREE.CubeTextureLoader();
        loader
            .setPath('https://threejs.org/examples/textures/cube/skyboxsun25/')
            .load(
                ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
                (tex) => {
                    tex.encoding = THREE.sRGBEncoding;
                    scene.background = tex;
                },
                undefined,
                () => {
                    scene.background = new THREE.Color(0x87ceeb);
                }
            );
    }

    if (!skyDome) {
        const gradientTexture = createSkyGradientTexture();
        const skyMat = new THREE.MeshBasicMaterial({
            map: gradientTexture,
            side: THREE.BackSide,
            depthWrite: false
        });
        const skyGeo = new THREE.SphereGeometry(380, 64, 64);
        skyDome = new THREE.Mesh(skyGeo, skyMat);
        scene.add(skyDome);
    }

    if (!cloudDome) {
        cloudDome = createCloudDome();
        if (cloudDome) scene.add(cloudDome);
    }
}

function init() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    bunnyCounter = document.getElementById('bunnyCount');
    timerDisplay = document.getElementById('timerVal');
    planetHud = document.getElementById('planetHud');
    planetName = document.getElementById('planetName');
    planetList = document.getElementById('planetList');
    controlHint = document.getElementById('controlHint');

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x7ec8ff, 70, 200);
    createSkybox();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileCubemapShader();

    const applyEnvironment = (cubeTexture) => {
        if (!cubeTexture) {
            pmremGenerator.dispose();
            pmremGenerator = null;
            return;
        }
        const pmremTexture = pmremGenerator.fromCubemap(cubeTexture);
        envMap = pmremTexture.texture;
        scene.environment = envMap;
        cubeTexture.dispose();
        loadedAssets.envMap = null;
        pmremGenerator.dispose();
        pmremGenerator = null;
    };

    if (loadedAssets.envMap) {
        applyEnvironment(loadedAssets.envMap);
    } else {
        new THREE.CubeTextureLoader()
            .setPath('https://threejs.org/examples/textures/cube/Bridge2/')
            .load(
                ['posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'],
                (tex) => {
                    tex.encoding = THREE.sRGBEncoding;
                    applyEnvironment(tex);
                },
                undefined,
                () => {
                    pmremGenerator.dispose();
                    pmremGenerator = null;
                }
            );
    }

    const keyLight = new THREE.DirectionalLight(0xfff6e8, 3.5);
    keyLight.position.set(6, 10, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88caff, 1.6);
    fillLight.position.set(-8, 5, -6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff9a6b, 25, 80);
    rimLight.position.set(0, 6, 12);
    scene.add(rimLight);

    scene.add(new THREE.HemisphereLight(0xb7d9ff, 0x445566, 0.35));

    // Create some vibrant planets
    createPlanet('Carrot Cove', 7, new THREE.Vector3(0, 0, 0), 0xff9933);
    createPlanet('Petal Rock', 5, new THREE.Vector3(18, 0, -6), 0xff8888);
    createPlanet('Mint Meadow', 6, new THREE.Vector3(-15, 0, 10), 0x88ff88);
    createPlanet('Twilight Ridge', 4.5, new THREE.Vector3(5, 0, 18), 0x8fa9ff);
    createPlanet('Lunar Puff', 5.5, new THREE.Vector3(-20, 0, -12), 0xf4d6ff);

    // Spawn some mischievous bunnies
    createBunny(planets[0]);
    createBunny(planets[0]);
    createBunny(planets[1]);
    createBunny(planets[2]);
    createBunny(planets[2]);
    createBunny(planets[3]);
    createBunny(planets[4]);

    // Add a few spinning item boxes
    createItemBox(planets[0]);
    createItemBox(planets[1]);
    createItemBox(planets[2]);
    createItemBox(planets[3]);
    createItemBox(planets[4]);

    bunnyCounter.textContent = bunnies.length;

    // Player model
    const mesh = createPlayerModel();
    mesh.traverse(o => o.castShadow = true);
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

function createPlanet(name, radius, pos, color) {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.38,
        metalness: 0.15,
        clearcoat: 0.2,
        clearcoatRoughness: 0.6,
        envMapIntensity: 1.25
    });
    if (loadedAssets.planetNormal) {
        const normalMap = loadedAssets.planetNormal.clone();
        normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
        const repeat = 2 + Math.random() * 2;
        normalMap.repeat.set(repeat, repeat);
        normalMap.rotation = Math.random() * Math.PI * 2;
        normalMap.needsUpdate = true;
        normalMap.anisotropy = Math.min(maxAnisotropy, 8);
        mat.normalMap = normalMap;
        mat.normalScale = new THREE.Vector2(0.45, 0.45);
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.position.copy(pos);
    scene.add(mesh);
    planets.push({ name, mesh, radius, position: pos });
}

function createBunnyModel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, envMapIntensity: 1.1 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xffb6d9, roughness: 0.4, metalness: 0.1, envMapIntensity: 1.25 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 1.0, envMapIntensity: 2.0 });
    const body = new THREE.SphereGeometry(0.25, 20, 20);
    const bodyMesh = new THREE.Mesh(body, mat);
    bodyMesh.castShadow = true;
    bodyMesh.position.y = 0.25;
    group.add(bodyMesh);

    const head = new THREE.SphereGeometry(0.18, 20, 20);
    const headMesh = new THREE.Mesh(head, mat);
    headMesh.castShadow = true;
    headMesh.position.y = 0.55;
    group.add(headMesh);

    const earGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16);
    const ear1 = new THREE.Mesh(earGeo, mat);
    ear1.castShadow = true;
    ear1.position.set(-0.07, 0.8, 0);
    group.add(ear1);
    const ear2 = ear1.clone();
    ear2.castShadow = true;
    ear2.position.x = 0.07;
    group.add(ear2);

    const innerEarGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.28, 12);
    const innerEarL = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerEarL.position.set(-0.07, 0.8, 0.005);
    innerEarL.castShadow = false;
    group.add(innerEarL);
    const innerEarR = innerEarL.clone();
    innerEarR.position.x = 0.07;
    group.add(innerEarR);

    const noseGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const nose = new THREE.Mesh(noseGeo, innerEarMat);
    nose.castShadow = true;
    nose.position.set(0, 0.52, 0.16);
    group.add(nose);

    const eyeGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.castShadow = true;
    eyeL.position.set(-0.06, 0.58, 0.14);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.06;
    group.add(eyeR);
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

    const moveInput = Math.min(move.length(), 1);
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
    updatePlayerAnimation(delta, moveInput);
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
    player.forward.copy(forward); // keep forward vector valid
}

function updatePlayerAnimation(delta, moveInput) {
    if (!player || !player.mesh || !player.mesh.userData.parts) return;
    const { armL, armR, legL, legR, body } = player.mesh.userData.parts;
    const speed = moveInput > 0.05 ? 6 : 2;
    player.mesh.userData.walkCycle += delta * speed;
    const cycle = player.mesh.userData.walkCycle;
    const swing = Math.sin(cycle) * 0.6 * moveInput;
    const bob = Math.abs(Math.cos(cycle)) * 0.05 * moveInput;

    armL.rotation.x = swing;
    armR.rotation.x = -swing;
    legL.rotation.x = -swing;
    legR.rotation.x = swing;
    body.position.y = 0.6 + bob;
}

function updatePlanetHud() {
    if (!planetName || !planetList || !player) return;
    planetName.textContent = `Planet: ${player.planet.name}`;
    const items = planets
        .filter(p => p !== player.planet)
        .map(p => {
            const distance = player.mesh.position.distanceTo(p.position) - p.radius;
            return { planet: p, distance };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    planetList.innerHTML = '';
    items.forEach(({ planet, distance }) => {
        const li = document.createElement('li');
        const label = distance <= hopRange ? 'In range' : `${distance.toFixed(1)}m`;
        li.innerHTML = `${planet.name}: <span>${label}</span>`;
        planetList.appendChild(li);
    });
}

function useTongue() {
    if (player.tongueTime <= 0) return;
    const range = 3;
    const dir = player.forward.clone().normalize();
    const start = player.mesh.position.clone().add(dir.clone().multiplyScalar(0.8));
    const end = start.clone().add(dir.clone().multiplyScalar(range));
    const geo = new THREE.CylinderGeometry(0.05, 0.05, range, 8);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff8080,
        roughness: 0.4,
        metalness: 0.2,
        envMapIntensity: 1.1,
        emissive: new THREE.Color(0xff5a7a),
        emissiveIntensity: 0.35
    });
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
    if (target && minDist < hopRange) {
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
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.5,
        metalness: 0.25,
        envMapIntensity: 1.2,
        emissive: new THREE.Color(0xffd26b),
        emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
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
    const emissiveColor = new THREE.Color(color).multiplyScalar(0.5);
    const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.85,
        roughness: 0.2,
        envMapIntensity: 1.6,
        emissive: emissiveColor,
        emissiveIntensity: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
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

    if (cloudDome) {
        cloudDome.rotation.y += delta * 0.02;
    }
    updateCamera();
    if (timerDisplay) timerDisplay.textContent = Math.ceil(timer);
    if (tongueBtn) tongueBtn.style.display = player.tongueTime > 0 ? 'block' : 'none';
    if (controlHint && hintTimer > 0) {
        hintTimer -= delta;
        if (hintTimer <= 0) controlHint.style.opacity = '0';
    }
    updatePlanetHud();
    renderer.render(scene, camera);
}
