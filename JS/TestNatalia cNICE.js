import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('#ar-container');
const startButton = document.querySelector('#start-ar');
const stopButton = document.querySelector('#stop-ar');
const changeButton = document.querySelector('#btn-change');
const statusText = document.querySelector('#status-text');

const uiLoading = document.querySelector("#ui-loading");
const uiCamera = document.querySelector("#ui-camera");
const uiScanning = document.querySelector("#ui-scanning");
const uiDetected = document.querySelector("#ui-detected");

const eatSound = new Audio('../Assets/eat.mp3');

uiLoading.style.display = "block";
uiCamera.style.display = "none";
uiScanning.style.display = "none";
uiDetected.style.display = "none";
changeButton.style.display = "none";

let started = false;
let mindarThree;
let renderer;
let scene;
let camera;
let sceneReady = false;
let currentModel = null;
let anchor;

const gltfLoader = new GLTFLoader();

const updateStatus = (message) => {
  statusText.textContent = message;
};

// SOLO UNA ZANAHORIA
const models = [
  '../Assets/vini.glb'
];

const setupScene = () => {

  if (sceneReady) return;

  const hemisphereLight = new THREE.HemisphereLight(
    0xffffff,
    0x7a8ca5,
    1.4
  );

  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    1.2
  );

  directionalLight.position.set(1, 2, 1.5);
  scene.add(directionalLight);

  anchor = mindarThree.addAnchor(0);

  anchor.onTargetFound = () => {

    uiScanning.style.display = "none";
    uiDetected.style.display = "block";

    changeButton.style.display = "block";
  };

  anchor.onTargetLost = () => {

    uiDetected.style.display = "none";
    uiScanning.style.display = "block";

    changeButton.style.display = "none";
  };

  // CARGAR SOLO LA PRIMERA ZANAHORIA
  loadModel(models[0]);

  sceneReady = true;
};


/// CORAZONES ///
const createParticles = (position) => {

  const particles = [];

  // cargar textura
  const textureLoader = new THREE.TextureLoader();
  const heartTexture = textureLoader.load('../Assets/heart.png');

  for (let i = 0; i < 10; i++) {

    const material = new THREE.SpriteMaterial({
      map: heartTexture,
      transparent: true
    });

    const heart = new THREE.Sprite(material);

    // tamaño
    heart.scale.set(0.2, 0.2, 0.2);

    // posición inicial
    heart.position.copy(position);

    // movimiento aleatorio
    heart.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.03,
      Math.random() * 0.05,
      (Math.random() - 0.5) * 0.03
    );

    anchor.group.add(heart);
    particles.push(heart);
  }

  const animateParticles = () => {

    particles.forEach((p, index) => {

      p.position.add(p.userData.velocity);

      // gravedad suave
      p.userData.velocity.y -= 0.001;

      // reducir tamaño
      p.scale.multiplyScalar(0.97);

      // fade
      p.material.opacity *= 0.96;

      if (p.scale.x < 0.02) {

        anchor.group.remove(p);
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
};


/// CARGAR MODELO ///
const loadModel = (path) => {

  // eliminar modelo anterior
  if (currentModel) {

    anchor.group.remove(currentModel);
    currentModel = null;
  }

  gltfLoader.load(path, (gltf) => {

    currentModel = gltf.scene;

    currentModel.scale.set(1.6, 1.6, 1.6);
    currentModel.position.set(0, -0.6, 0);
    currentModel.rotation.set(0, 0, 0);

    anchor.group.add(currentModel);

  }, undefined, (error) => {

    console.error('Error al cargar el modelo:', error);
  });
};


/// DETENER AR ///
const stopAR = () => {

  if (!started || !mindarThree) return;

  renderer.setAnimationLoop(null);

  mindarThree.stop();

  started = false;

  startButton.disabled = false;
  stopButton.disabled = true;

  uiScanning.style.display = "none";
  uiDetected.style.display = "none";
  uiCamera.style.display = "none";
  uiLoading.style.display = "block";

  updateStatus('Camara detenida.');
};


/// INICIAR AR ///
const startAR = async () => {

  if (started) return;

  startButton.disabled = true;
  stopButton.disabled = true;

  updateStatus('Solicitando acceso a la camara...');

  uiLoading.style.display = "none";
  uiCamera.style.display = "block";

  try {

    if (!mindarThree) {

      mindarThree = new MindARThree({
        container,
        imageTargetSrc: '../Assets/Targets/targets.mind',
        uiScanning: false,
        uiLoading: false,
        maxTrack: 1,
        filterMinCF: 0.0001,
        filterBeta: 0.01,
      });

      ({ renderer, scene, camera } = mindarThree);

      setupScene();
    }

    await mindarThree.start();

    uiCamera.style.display = "none";
    uiScanning.style.display = "block";

    updateStatus('Buscando imagen objetivo...');

    started = true;

    stopButton.disabled = false;

    renderer.setAnimationLoop(() => {

      if (!started) return;

      renderer.render(scene, camera);
    });

  } catch (error) {

    console.error(error);

    updateStatus(
      'No se pudo iniciar. Usa localhost y acepta permisos de camara.'
    );

    startButton.disabled = false;
    stopButton.disabled = true;
  }
};


/// BOTONES ///
startButton.addEventListener('click', () => {
  startAR();
});

stopButton.addEventListener('click', () => {
  stopAR();
});

stopButton.disabled = true;


// BOTÓN = SOLO PARTÍCULAS
changeButton.addEventListener('click', () => {

  if (!currentModel) return;

  // sonido
  eatSound.currentTime = 0;
  eatSound.play();

  // partículas
  createParticles(
    currentModel.position.clone()
  );
});