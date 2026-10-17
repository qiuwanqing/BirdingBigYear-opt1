import * as THREE from 'three';

import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { environmentConfig } from './environment-config.js';
import { PullBackground } from './PullBackground.js';
import { PanoramaObservation } from './PanoramaObservation.js';

const $ = id => document.getElementById(id);
const app = $('app'), canvas = $('three'), observation = $('observation');
const state = { target: 0, progress: 0, dragging: false, yaw: 0, pitch: 0, shownYaw: 0, shownPitch: 0, velocityX: 0, velocityY: 0, entered: false, entries: [] };
const clock = new THREE.Clock();
const clamp01 = x => THREE.MathUtils.clamp(x, 0, 1);
const ease = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
let renderer, scene, camera, sphere, environmentTarget, panorama, loadVersion = 0;
let ready = false;
const portalDarkness = { value: 0 };
const portalEdgeSoftness = { value: environmentConfig.sphereEdgeSoftness ?? .35 };
let pullBackground, observationView;
let previousObservationFade = 0;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function hitsSphere(event) {
  if (!ready || state.entered) return false;
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(sphere).length > 0;
}

async function loadEnvironment(url, format, label) {
  const version = ++loadVersion;
  $('environment-status').textContent = '正在加载全景…';
  let texture;
  try {
    const loader = format === 'hdr' ? new RGBELoader() : format === 'exr' ? new EXRLoader() : new THREE.TextureLoader();
    texture = await loader.loadAsync(url);
    const image = texture.image;
    if (Math.abs(image.width / image.height - 2) > .02) throw new Error('需要完整 360° × 180°、2:1 Equirectangular 全景');
    if (version !== loadVersion) { texture.dispose(); return; }
    if (!['hdr', 'exr'].includes(format)) texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    let next;
    try { next = pmrem.fromEquirectangular(texture); } finally { pmrem.dispose(); }
    // The pull pass renders this panorama before the final glass scene.
    scene.environment = next.texture;
    updateEnvironmentOrientation();
    environmentTarget?.dispose(); panorama?.dispose();
    environmentTarget = next; panorama = texture;
    sphere.visible = true; ready = true;
    $('enter-shortcut').disabled = false;
    $('environment-status').textContent = `${label} · ${format === 'hdr' || format === 'exr' ? 'HDR 文件（亮度范围需核验）' : 'LDR 全景 / 反射，无 HDR 光照'} · 拖动球体转动整个环境 / 滚轮进入`;
  } catch (error) {
    texture?.dispose();
    if (version === loadVersion) $('environment-status').textContent = `环境未加载：${error.message}。请选择完整全景素材。`;
    console.error(error);
  }
}

// One world orientation drives both the visible panorama and PMREM lighting.
// The sphere is the drag handle; the camera keeps its central dolly path.
function updateEnvironmentOrientation() {
  scene.backgroundRotation.set(state.shownPitch, environmentConfig.rotation + state.shownYaw, 0, 'YXZ');
  scene.environmentRotation.copy(scene.backgroundRotation);
  if (sphere) sphere.rotation.copy(scene.backgroundRotation);
}

function setup3d() {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#26302c');
    camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .005, 100);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = environmentConfig.exposure;
    scene.backgroundBlurriness = 0;
    pullBackground = new PullBackground();
    observationView = new PanoramaObservation($('observation-photo'), $('observation-peripheral'), observation,
      () => state.entered && !['archive-panel', 'about-panel'].some(id => $(id).classList.contains('open')));
    sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshPhysicalMaterial({
      metalness: 0, color: 0xffffff,
      transparent: true, depthWrite: false,
      roughness: .005, // 反射清晰度：越接近 0，货架和灯光的轮廓越清晰
      transmission: 1, // 保持玻璃透光；降低会增加不透明成分，并非单纯增强反射
      thickness: 2,
      ior: 1.9, // 反射/透射比例：提高后正面的环境反射也更明显（同时加强折射）
      attenuationColor: new THREE.Color('#f4fff9'), attenuationDistance: 10,
      dispersion: .04, // 少量色散，避免彩色重影干扰物体轮廓
      envMapIntensity: 1.8, // 反射亮度；过高会使高光发白、丢失细节
      specularIntensity: 1,
      clearcoat: .65, // 额外表面反射的强度
      clearcoatRoughness: .005 // 表面反射同样保持清晰
    }));
    // Dim the complete glass result, including transmitted light and specular highlights.
    // Tinting the base color alone would leave bright reflections floating over the dive.
    sphere.material.onBeforeCompile = shader => {
      shader.uniforms.uPortalDarkness = portalDarkness;
      shader.uniforms.uPortalEdgeSoftness = portalEdgeSoftness;
      shader.fragmentShader = 'uniform float uPortalDarkness;\nuniform float uPortalEdgeSoftness;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        `outgoingLight *= 1.0 - uPortalDarkness;
#include <opaque_fragment>
// Keep the core opaque while feathering only the darkening sphere's grazing edge.
float portalFacing = abs(dot(normalize(normal), normalize(vViewPosition)));
float portalFeather = smoothstep(0.0, max(uPortalEdgeSoftness, 0.001), portalFacing);
gl_FragColor.a = mix(1.0, portalFeather, uPortalDarkness);`);
    };
    sphere.material.customProgramCacheKey = () => 'glass-portal-darkening-soft-edge-v2';
    sphere.visible = false;
    scene.add(sphere);
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); $('error-message').hidden = false; });
    if (environmentConfig.url) loadEnvironment(environmentConfig.url, environmentConfig.format, environmentConfig.label);
    tick();
  } catch (error) { console.error(error); $('error-message').hidden = false; }
}
function resize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 650 ? 55 : 42;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  pullBackground?.setSize(size.x, size.y);
  observationView?.resize();
}
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .07);
  state.progress += ((ready ? state.target : 0) - state.progress) * (1 - Math.exp(-dt * 5.6));
  const p = state.progress;
  // Keep the lens fixed on the central object; drag rotates its surrounding world.
  const distance = THREE.MathUtils.lerp(6.35, .25, ease(0, 1, p));
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  if (!state.dragging) {
    state.yaw += state.velocityX * dt;
    state.pitch += state.velocityY * dt;
    const friction = Math.exp(-dt * 6);
    state.velocityX *= friction; state.velocityY *= friction;
  }
  const response = 1 - Math.exp(-dt * 14);
  state.shownYaw += (state.yaw - state.shownYaw) * response;
  state.shownPitch += (state.pitch - state.shownPitch) * response;
  updateEnvironmentOrientation();
  // Tie absorption to apparent size: by 100% of the shorter viewport dimension,
  // the sphere is almost black, rather than waiting until the camera crosses it.
  const projectedDiameter = 1 / (Math.sqrt(Math.max(distance * distance - 1, .0001)) *
    Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
  const absorption = ease(.60, 1.00, projectedDiameter);
  portalDarkness.value = absorption * (environmentConfig.sphereDarkness ?? .999);
  // Sphere fills the frustum before fading; the observation fully covers near-plane crossing.
  const fade = ease(.69, .77, p);
  if (fade > 0 && previousObservationFade === 0) observationView.begin(scene.environmentRotation);
  if (fade > 0 && panorama) observationView.render(panorama, environmentConfig.exposure, dt);
  if (fade === 0 && previousObservationFade > 0) observationView.release();
  previousObservationFade = fade;
  observation.style.opacity = fade;
  const entered = fade > .975;
  if (entered !== state.entered) {
    state.entered = entered;
    app.dataset.entered = String(entered);
    observation.classList.toggle('is-active', entered);
    observation.setAttribute('aria-hidden', String(!entered));
    observation.inert = !entered;
  }
  const shortcutVisible = p < .7;
  $('enter-shortcut').style.opacity = 1 - ease(.4, .7, p);
  $('enter-shortcut').inert = !shortcutVisible;
  if (panorama) {
    scene.background = pullBackground.render(renderer, camera, panorama,
      scene.environmentRotation, environmentConfig.blur, p, reducedMotion, environmentConfig);
  }
  renderer.render(scene, camera);
}
// Wheel delta is converted to scroll progress without letting the page itself scroll.
window.addEventListener('wheel',e=>{
  if($('about-panel').classList.contains('open')||$('archive-panel').classList.contains('open'))return;
  e.preventDefault();
  state.target=clamp01(state.target + e.deltaY / 1850);
},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closePanels();return;}
  if(e.key==='ArrowDown'||e.key==='PageDown'){state.target=clamp01(state.target+.10);e.preventDefault();}
  if(e.key==='ArrowUp'||e.key==='PageUp'){state.target=clamp01(state.target-.10);e.preventDefault();}
});
canvas.addEventListener('pointerdown', e => {
  if (!hitsSphere(e)) return;
  state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY;
  state.lastMoveTime = performance.now();
  state.velocityX = state.velocityY = 0;
  canvas.classList.add('is-dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  canvas.classList.toggle('over-sphere', hitsSphere(e));
  if (!state.dragging) return;
  const dx = (e.clientX - state.lastX) * .006;
  const dy = (e.clientY - state.lastY) * .006;
  const now = performance.now();
  const dt = Math.max((now - state.lastMoveTime) / 1000, .008);
  state.yaw += dx; state.pitch += dy;
  state.velocityX = reducedMotion ? 0 : THREE.MathUtils.clamp(dx / dt, -2, 2);
  state.velocityY = reducedMotion ? 0 : THREE.MathUtils.clamp(dy / dt, -2, 2);
  state.lastX = e.clientX; state.lastY = e.clientY; state.lastMoveTime = now;
});
function releaseSphere() {
  if (performance.now() - state.lastMoveTime > 100) state.velocityX = state.velocityY = 0;
  state.dragging = false;
  canvas.classList.remove('is-dragging');
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, releaseSphere);
canvas.addEventListener('pointerleave', () => canvas.classList.remove('over-sphere'));
// Touch drag rotates the sphere; buttons control the dolly on touch devices.
$('enter-shortcut').addEventListener('click',()=>state.target=1);
$('exit-observe').addEventListener('click',()=>{closePanels();state.target=0;});

// Minimal non-AI field recording; a selection is POSSIBLE until manually reviewed.
// The centered reticle frames the current camera view, not the source PNG pixels.
function extractCrop() {
  return observationView.capture(panorama, environmentConfig.exposure);
}
const storageKey='supermarket-birding-sphere-demo-001';
try {state.entries=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(state.entries))state.entries=[];}catch{state.entries=[];}
function updateCount(){$('archive-count').textContent=String(state.entries.length).padStart(2,'0');}
updateCount();
$('spot-button').addEventListener('click',()=>{
  const entry={id:Math.max(0,...state.entries.map(item=>Number(item.id)||0))+1,date:new Date().toISOString(),image:extractCrop(),status:'POSSIBLE'};
  state.entries.unshift(entry);if(state.entries.length>20)state.entries.length=20;
  try{localStorage.setItem(storageKey,JSON.stringify(state.entries));}catch(e){console.warn('Local storage quota reached',e);}
  updateCount();

});
function togglePanel(id,yes){$(id).classList.toggle('open',yes);$(id).setAttribute('aria-hidden',yes?'false':'true');}
function closePanels(){for(const id of ['archive-panel','about-panel'])togglePanel(id,false);}
$('archive-button').onclick=()=>{
  const entries=$('archive-entries');entries.textContent='';
  for(const entry of state.entries){
    const wrapper=document.createElement('div');wrapper.className='archive-entry';
    const photo=document.createElement('img');photo.src=entry.image;photo.alt='Possible sighting crop';
    const info=document.createElement('div');info.className='archive-meta';
    const title=document.createElement('strong');title.textContent=String(entry.id).padStart(4,'0');
    const desc=document.createElement('time');desc.dateTime=entry.date;desc.textContent=new Date(entry.date).toLocaleString();
    info.append(title,desc);wrapper.append(photo,info);entries.append(wrapper);
  }
  togglePanel('archive-panel',true);
};
$('archive-close').onclick=()=>togglePanel('archive-panel',false);
$('about-btn').onclick=()=>togglePanel('about-panel',true);
$('about-close').onclick=()=>togglePanel('about-panel',false);
setup3d();
