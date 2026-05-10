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

const eatSound = new Audio('../Assets/bubbles.mp3');

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
  '../Assets/cabritaS.glb'
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

/// PARTICULAS VERDE NEON ///
const createParticles = (position) => {

  const particles = [];

  for (let i = 0; i < 12; i++) {

    // esfera
    const geometry = new THREE.SphereGeometry(0.08, 12, 12);

    const material = new THREE.MeshStandardMaterial({
      color: 0x66ff99,
      emissive: 0x00ff66,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.85
    });

    const bubble = new THREE.Mesh(geometry, material);

    // posición inicial
    bubble.position.copy(position);
    bubble.position.y += 1.15;
    bubble.position.x += 0.59;
    bubble.position.z -= 0.25;

    // tamaño aleatorio más grande
    const randomSize = Math.random() * 0.12 + 0.08;
    bubble.scale.set(randomSize, randomSize, randomSize);

    // movimiento lento tipo burbuja
    bubble.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.0004,
      Math.random() * 0.008 + 0.003,
      (Math.random() - 0.5) * 0.0004
    );

    // movimiento flotante
    bubble.userData.offset = Math.random() * Math.PI * 2;

    anchor.group.add(bubble);
    particles.push(bubble);
  }

  const animateParticles = () => {

    particles.forEach((p, index) => {

      // subir lento
      p.position.add(p.userData.velocity);

      // movimiento suave flotando
      p.position.x += Math.sin(Date.now() * 0.001 + p.userData.offset) * 0.0015;
      p.position.z += Math.cos(Date.now() * 0.001 + p.userData.offset) * 0.0015;

      // crecer/desinflarse leve
      const pulse = 1 + Math.sin(Date.now() * 0.003 + index) * 0.01;
      p.scale.multiplyScalar(pulse);

      // fade lento
      p.material.opacity *= 0.993;

      // eliminar
      if (p.material.opacity < 0.03) {

        anchor.group.remove(p);

        p.geometry.dispose();
        p.material.dispose();

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