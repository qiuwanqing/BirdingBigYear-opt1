import * as THREE from 'three';

// Independent observation camera: a full-sphere panorama allows looking around,
// while retaining a fixed viewpoint (no fabricated depth or walking parallax).
export class PanoramaObservation {
  constructor(canvas, peripheral, host, canInteract) {
    this.canvas = canvas;
    this.peripheral = peripheral;
    this.context = peripheral.getContext('2d');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, 1, .1, 10);
    this.yaw = this.pitch = this.targetYaw = this.targetPitch = 0;
    this.dragging = false;
    host.addEventListener('pointerdown', event => {
      if (event.target.closest('button') || !canInteract() || !event.isPrimary) return;
      this.dragging = true;
      this.pointerId = event.pointerId;
      this.x = event.clientX; this.y = event.clientY;
      host.setPointerCapture(event.pointerId);
      host.classList.add('is-looking');
    });
    host.addEventListener('pointermove', event => {
      if (!this.dragging || event.pointerId !== this.pointerId) return;
      this.targetYaw -= (event.clientX - this.x) * .0035;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - (event.clientY - this.y) * .0035,
        -Math.PI / 2 + .025, Math.PI / 2 - .025);
      this.x = event.clientX; this.y = event.clientY;
    });
    const release = () => { this.dragging = false; host.classList.remove('is-looking'); };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(type, release);
    this.release = release;
    this.resize();
  }
  resize() {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.peripheral.width = this.canvas.width;
    this.peripheral.height = this.canvas.height;
  }
  begin(rotation) {
    this.scene.backgroundRotation.copy(rotation);
    this.yaw = this.pitch = this.targetYaw = this.targetPitch = 0;
    this.release();
  }
  render(texture, exposure, dt = 0) {
    this.scene.background = texture;
    this.renderer.toneMappingExposure = exposure;
    const response = 1 - Math.exp(-dt * 15);
    this.yaw += (this.targetYaw - this.yaw) * response;
    this.pitch += (this.targetPitch - this.pitch) * response;
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.renderer.render(this.scene, this.camera);
    // Registered copy supports the existing blurred-periphery / clear-core masks.
    this.context.drawImage(this.canvas, 0, 0);
  }
  capture(texture, exposure) {
    // Render synchronously: WebGL's default framebuffer may be cleared between frames.
    this.render(texture, exposure);
    const output = document.createElement('canvas');
    output.width = output.height = 280;
    const viewport = this.canvas.getBoundingClientRect();
    const frame = document.getElementById('reticle').getBoundingClientRect();
    const size = Math.min(this.canvas.width, this.canvas.height,
      frame.width * this.canvas.width / viewport.width);
    output.getContext('2d').drawImage(this.canvas,
      (this.canvas.width - size) / 2, (this.canvas.height - size) / 2, size, size, 0, 0, 280, 280);
    return output.toDataURL('image/jpeg', .85);
  }
}
