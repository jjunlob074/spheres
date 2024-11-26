import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Crear la escena de Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); // Fondo oscuro para destacar colores

// Configuración de la cámara
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

// Configuración del renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Activar sombras
document.body.appendChild(renderer.domElement);

// Añadir luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Luz ambiental tenue
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Luz direccional más fuerte
directionalLight.position.set(10, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Luz puntual adicional
const pointLight = new THREE.PointLight(0xff0000, 1, 50); // Luz roja puntual
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0x00ff00, 1, 50); // Luz verde puntual
pointLight2.position.set(-5, -5, -5);
scene.add(pointLight2);

// Luz ambiental más intensa
const ambientLight2 = new THREE.AmbientLight(0x00ffff, 0.5); // Luz ambiental cian
scene.add(ambientLight2);

// Luz de área (para generar una luz suave)
const areaLight = new THREE.RectAreaLight(0x0000ff, 5, 10, 10); // Luz azul de área
areaLight.position.set(0, 5, 0);
areaLight.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(areaLight);
const containerSize = 4;
// Crear una esfera de contenedor
const sphereGeometry = new THREE.SphereGeometry(containerSize, 24, 24);
const containerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.05 });
const containerCube = new THREE.Mesh(sphereGeometry, containerMaterial);
scene.add(containerCube);

// Crear el mundo físico de Cannon.js
const world = new CANNON.World();
world.gravity.set(0, 0, 0); // Sin gravedad para simular movimiento libre

// Crear múltiples esferas
const spheres = [];
const sphereBodies = [];
const sphereRadius = 0.25; // Radio de las esferas
const numSpheres = 100; // Número de esferas

for (let i = 0; i < numSpheres; i++) {
  // Esferas visuales
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
  const sphereMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 50%)`),
    emissive: new THREE.Color(`hsl(${Math.random() * 360}, 100%, 20%)`),
    metalness: 1,
    roughness: 1,
    transparent: false,
    opacity: 1,
    reflectivity: 1,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);

  // Cuerpos físicos
  const sphereBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(
      (Math.random() - 0.5) * containerSize,
      (Math.random() - 0.5) * containerSize,
      (Math.random() - 0.5) * containerSize
    ),
    shape: new CANNON.Sphere(sphereRadius),
  });

  sphereBody.velocity.set(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10
  );

  world.addBody(sphereBody);
  spheres.push(sphere);
  sphereBodies.push(sphereBody);
}

// Ajustar las colisiones (efecto visual al chocar)
function checkBounds(body, sphere) {
  for (let axis of ['x', 'y', 'z']) {
    if (Math.abs(body.position[axis]) > containerSize / 1.8) {
      body.velocity[axis] *= -1;
      body.position[axis] = Math.sign(body.position[axis]) * (containerSize / 1.8);
    }
  }
}

const pulses = [];
document.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(containerCube);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    const pulseGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const pulseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),  // Inicia con blanco
      metalness: 0.7,                    // Añade propiedades metálicas
      roughness: 0.5,                    // Controla el nivel de rugosidad
      transparent: true,                 // Habilita la transparencia
      opacity: 1,                        // Inicia con opacidad completa
      emissive: new THREE.Color(0xffffff), // Agrega un color emisivo verde
      emissiveIntensity: 0.3,            // Controla la intensidad del color emisivo
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.position.copy(point);
    pulse.scale.set(0.1, 0.1, 0.1);
    scene.add(pulse);

    pulses.push({ mesh: pulse, scale: 0.1 });
  }
});

function updatePulses(delta) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pulse = pulses[i];
    const { mesh } = pulse;

    // Escalado progresivo (ajustar velocidad de expansión)
    pulse.scale += delta * 1.1; // Ajustado para un crecimiento más lento
    mesh.scale.set(pulse.scale, pulse.scale, pulse.scale);

    // Desvanecimiento progresivo (ajustar velocidad de desaparición)
    mesh.material.opacity = Math.max(0, mesh.material.opacity - delta * 0.3);

    // Aplicación de fuerza a las esferas cercanas
    spheres.forEach((sphere, index) => {
      const distance = mesh.position.distanceTo(sphere.position);
      if (distance < pulse.scale) {
        const direction = sphereBodies[index].position
          .vsub(mesh.position)
          .unit();
        sphereBodies[index].velocity.vadd(
          direction.scale(3),
          sphereBodies[index].velocity
        );
      }
    });

    // Eliminar el pulso si está completamente desvanecido
    if (mesh.material.opacity <= 0) {
      scene.remove(mesh);
      pulses.splice(i, 1);
    }
  }
}

// Animación
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - lastTime) / 1000;
  lastTime = time;

  world.step(1 / 60, delta, 3);

  updatePulses(delta);

  camera.position.x = 20 * Math.sin(time * 0.00005);
  camera.position.z = 20 * Math.cos(time * 0.00005);
  camera.lookAt(0, 0, 0);

  for (let i = 0; i < spheres.length; i++) {
    checkBounds(sphereBodies[i], spheres[i]);
    spheres[i].position.copy(sphereBodies[i].position);
    spheres[i].quaternion.copy(sphereBodies[i].quaternion);
  }

  renderer.render(scene, camera);
}

animate();

// Ajustar la cámara y el lienzo al redimensionar la ventana
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
