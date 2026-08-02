import * as THREE from 'three';
import { buildGlyphAtlas } from './glyphAtlas';

const PARTICLE_COUNT_DESKTOP = 2400;
const PARTICLE_COUNT_LOW_POWER = 700;
const TUNNEL_DEPTH = 2400;
const TUNNEL_RADIUS = 480;
const RECYCLE_BUFFER = 80;
const ATLAS_SIZE = 512; // must match GRID_COLS * CELL_PX in glyphAtlas.ts

const vertexShader = /* glsl */ `
  precision highp float;
  attribute float aGlyphIndex;
  attribute float aScale;
  uniform float uCols;
  uniform float uRows;
  uniform float uPixelRatio;
  varying vec2 vAtlasOffset;
  varying float vDist;

  void main() {
    float col = mod(aGlyphIndex, uCols);
    float row = floor(aGlyphIndex / uCols);
    vAtlasOffset = vec2(col / uCols, 1.0 - (row + 1.0) / uRows);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDist = -mvPosition.z;
    gl_PointSize = aScale * uPixelRatio * (600.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform sampler2D uAtlas;
  uniform float uCols;
  uniform float uRows;
  uniform vec3 uColor;
  uniform float uAtlasSize;
  varying vec2 vAtlasOffset;
  varying float vDist;

  void main() {
    vec2 texel = vec2(1.0 / uAtlasSize);
    vec2 flippedCoord = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    vec2 cellUv = flippedCoord / vec2(uCols, uRows);
    vec2 base = vAtlasOffset + cellUv;

    // Near-field blur: particles close to the camera blur out, particles
    // further away stay sharp — inverse of a normal camera's depth of
    // field, chosen to match "things rushing past you blur, the field
    // ahead stays crisp" rather than a photographic focal plane.
    float blurFactor = 1.0 - smoothstep(0.0, 150.0, vDist);
    float blurPx = blurFactor * 4.0;

    vec4 tex = texture2D(uAtlas, base);
    tex += texture2D(uAtlas, base + vec2( texel.x,  0.0) * blurPx);
    tex += texture2D(uAtlas, base + vec2(-texel.x,  0.0) * blurPx);
    tex += texture2D(uAtlas, base + vec2( 0.0,  texel.y) * blurPx);
    tex += texture2D(uAtlas, base + vec2( 0.0, -texel.y) * blurPx);
    tex += texture2D(uAtlas, base + vec2( texel.x,  texel.y) * blurPx);
    tex += texture2D(uAtlas, base + vec2(-texel.x,  texel.y) * blurPx);
    tex += texture2D(uAtlas, base + vec2( texel.x, -texel.y) * blurPx);
    tex += texture2D(uAtlas, base + vec2(-texel.x, -texel.y) * blurPx);
    tex /= 9.0;

    if (tex.a < 0.05) discard;

    // Depth fade: far symbols dim toward black (atmospheric perspective).
    float fade = 1.0 - smoothstep(200.0, 1400.0, vDist);

    gl_FragColor = vec4(uColor * fade, tex.a * 0.85 * fade);
  }
`;

export class Galaxy {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  points!: THREE.Points;
  material!: THREE.ShaderMaterial;

  private targetZ = 0;
  private currentZ = 0;
  private mouseTargetX = 0;
  private mouseTargetY = 0;
  private mouseCurrentX = 0;
  private mouseCurrentY = 0;
  private clock = new THREE.Clock();
  private lowPower: boolean;

  constructor(canvas: HTMLCanvasElement, opts: { lowPower: boolean }) {
    this.lowPower = opts.lowPower;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPower ? 1 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.buildParticles();

    window.addEventListener('resize', () => this.onResize());
  }

  private buildParticles() {
    const atlas = buildGlyphAtlas();
    const count = this.lowPower ? PARTICLE_COUNT_LOW_POWER : PARTICLE_COUNT_DESKTOP;

    const positions = new Float32Array(count * 3);
    const glyphIndices = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * TUNNEL_RADIUS * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * TUNNEL_RADIUS * 2;
      positions[i3 + 2] = -Math.random() * TUNNEL_DEPTH;
      glyphIndices[i] = Math.floor(Math.random() * atlas.count);
      scales[i] = 18 + Math.random() * 30;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aGlyphIndex', new THREE.BufferAttribute(glyphIndices, 1));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uAtlas: { value: atlas.texture },
        uCols: { value: atlas.cols },
        uRows: { value: atlas.rows },
        uAtlasSize: { value: ATLAS_SIZE },
        // Monochrome by design — off-white, no per-section hue shifts.
        uColor: { value: new THREE.Color('#e9edf5') },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);
  }

  setScrollProgress(progress: number) {
    // Flipped: scrolling down pulls the camera backward (zoom out),
    // scrolling up pushes it forward into the field (zoom in).
    this.targetZ = progress * (TUNNEL_DEPTH - TUNNEL_RADIUS);
  }

  /** nx, ny expected in -1..1 range (normalized pointer position). */
  setMouseTarget(nx: number, ny: number) {
    this.mouseTargetX = nx;
    this.mouseTargetY = ny;
  }

  private recycleParticles() {
    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      if (z > this.camera.position.z + RECYCLE_BUFFER) {
        posAttr.setZ(i, z - TUNNEL_DEPTH);
      }
      if (z < this.camera.position.z - TUNNEL_DEPTH - RECYCLE_BUFFER) {
        posAttr.setZ(i, z + TUNNEL_DEPTH);
      }
    }
    posAttr.needsUpdate = true;
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  tick() {
    const t = this.clock.getElapsedTime();

    this.currentZ += (this.targetZ - this.currentZ) * 0.06;
    this.camera.position.z = this.currentZ;

    // Idle drift only — camera no longer reacts to mouse/gyro, so overlay
    // cards (which share this camera) stay static regardless of pointer
    // movement. Mouse-follow is expressed on the particle field instead.
    this.camera.position.x = Math.sin(t * 0.15) * 4;
    this.camera.position.y = Math.cos(t * 0.12) * 3;

    // Slower lerp (0.006 vs the previous 0.015) and gentler multipliers --
    // this drives the particle field directly now rather than a subtle
    // camera sway, so it reads much more strongly at the same settings.
    this.mouseCurrentX += (this.mouseTargetX - this.mouseCurrentX) * 0.006;
    this.mouseCurrentY += (this.mouseTargetY - this.mouseCurrentY) * 0.006;

    this.points.rotation.y = Math.sin(t * 0.05) * 0.05 + this.mouseCurrentX * 0.035;
    this.points.rotation.x = Math.cos(t * 0.04) * 0.03 - this.mouseCurrentY * 0.02;
    this.points.position.x = this.mouseCurrentX * 18;
    this.points.position.y = -this.mouseCurrentY * 14;

    this.recycleParticles();
    this.renderer.render(this.scene, this.camera);
  }
}
