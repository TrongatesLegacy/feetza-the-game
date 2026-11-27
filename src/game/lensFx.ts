// A screen pass for the Act 3 Legendaries' big moments (docs/pizza-plan.md, section 14), on the scene's camera:
// - the Black Olive Hole's lensing: round its event horizon the table, the feet and the backdrop are bent towards it
//   (light from further out pulled into a bright ring round the black, twisted a little by its spin);
// - a ripple: a ring of hot air rolling out from a point (the Roar Roast's roar).
// One full-screen pass, only while a moment plays (it takes itself off the camera when both are done). WebGL only,
// never with reduced motion: without it the moments' own sprites carry them.

import Phaser from 'phaser';
import { H, W } from '../config';
import { save } from '../systems/save';

const FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uHole;
uniform float uStrength;
uniform vec2 uWaveC;
uniform float uWave;
uniform float uWaveW;
uniform float uWaveAmp;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  // (the framebuffer runs bottom-up: work in screen pixels, y down)
  vec2 px = vec2(uv.x * uRes.x, (1.0 - uv.y) * uRes.y);
  vec2 sp = px;
  float ringGlow = 0.0;
  float black = 0.0;
  if (uStrength > 0.0) {
    vec2 d = px - uCenter;
    float r = length(d);
    if (r < uRadius) {
      float fall = 1.0 - smoothstep(uHole, uRadius, r);
      // light from further out is bent in towards the hole: sample further out (the ring round it magnified)
      float bend = uStrength * uHole * uHole / max(r, 1.0) * fall * 1.6;
      float ang = uStrength * 1.1 * fall * fall;
      vec2 dir = d / max(r, 1.0);
      float ca = cos(ang);
      float sa = sin(ang);
      vec2 dr = vec2(dir.x * ca - dir.y * sa, dir.x * sa + dir.y * ca);
      sp = uCenter + dr * (r + bend);
      ringGlow = exp(-pow((r - uHole * 1.22) / (uHole * 0.16), 2.0)) * uStrength;
      black = (1.0 - smoothstep(uHole * 0.9, uHole, r)) * min(1.0, uStrength * 1.6);
    }
  }
  if (uWaveAmp > 0.0) {
    vec2 d = sp - uWaveC;
    float r = length(d);
    float band = (r - uWave) / uWaveW;
    if (abs(band) < 1.0) {
      float k = cos(band * 1.5708);
      sp += (d / max(r, 1.0)) * uWaveAmp * sin(band * 3.14159) * k;
      ringGlow += 0.12 * k * min(1.0, uWaveAmp / 14.0);
    }
  }
  vec2 suv = vec2(sp.x / uRes.x, 1.0 - sp.y / uRes.y);
  vec4 col = texture2D(uMainSampler, clamp(suv, 0.0, 1.0));
  col.rgb += vec3(1.0, 0.74, 0.44) * ringGlow * 0.6;
  col.rgb = mix(col.rgb, vec3(0.0), black);
  gl_FragColor = col;
}`;

export class LensFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** The hole: centre (screen px), its horizon and how far it reaches, and its strength (0 off … 1). */
  cx = W / 2;
  cy = H / 2;
  hole = 60;
  radius = 260;
  strength = 0;
  /** The ripple: centre, its radius now, its width and how far it shoves (0 off). */
  wx = W / 2;
  wy = H / 2;
  wave = 0;
  waveW = 70;
  waveAmp = 0;
  constructor(game: Phaser.Game) {
    super({ game, name: 'FeetzaLens', fragShader: FRAG });
  }
  onPreRender(): void {
    this.set2f('uRes', W, H);
    this.set2f('uCenter', this.cx, this.cy);
    this.set1f('uRadius', this.radius);
    this.set1f('uHole', this.hole);
    this.set1f('uStrength', this.strength);
    this.set2f('uWaveC', this.wx, this.wy);
    this.set1f('uWave', this.wave);
    this.set1f('uWaveW', this.waveW);
    this.set1f('uWaveAmp', this.waveAmp);
  }
}

/** The camera's lens pass (added if need be), or null (no WebGL, or reduced motion). */
export function lensOn(sc: Phaser.Scene): LensFX | null {
  if (sc.renderer.type !== Phaser.WEBGL || save.settings.reducedMotion) return null;
  const r = sc.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (!r.pipelines.getPostPipeline('FeetzaLens')) r.pipelines.addPostPipeline('FeetzaLens', LensFX);
  const cam = sc.cameras.main;
  let p = cam.getPostPipeline('FeetzaLens') as LensFX | LensFX[] | undefined;
  if (Array.isArray(p)) p = p[0];
  if (!p) {
    cam.setPostPipeline('FeetzaLens');
    p = cam.getPostPipeline('FeetzaLens') as LensFX | LensFX[] | undefined;
    if (Array.isArray(p)) p = p[0];
  }
  return (p as LensFX) ?? null;
}

/** Take the pass off the camera once nothing's using it. */
export function lensIdle(sc: Phaser.Scene, p: LensFX): void {
  if (p.strength <= 0.001 && p.waveAmp <= 0.001 && sc.sys.isActive()) sc.cameras.main.removePostPipeline('FeetzaLens');
}

/** Take it off at once (the scene going). */
export function lensOff(sc: Phaser.Scene): void {
  sc.cameras.main?.removePostPipeline('FeetzaLens');
}
