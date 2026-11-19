// Audio: category volumes (master / music / sfx / ambience), music + ambience crossfades,
// lazy loading of the larger tracks, and SFX throttling/variation.

import Phaser from 'phaser';
import manifest from 'virtual:audio-manifest';
import { onSettingsChange, save } from './save';

type Cat = 'music' | 'ambience';

interface Track {
  key: string;
  sound: Phaser.Sound.BaseSound & { volume: number };
  target: number; // 0..1 relative gain inside the category
}

const AVAILABLE = new Set<string>(manifest);
// Small files loaded at boot; everything else streams in on demand.
export const BOOT_AUDIO = [...AVAILABLE].filter((k) => k.startsWith('sfx_') || k === 'music_menu' || k === 'music_gameover');

// Per-file gain trims, calibrated from measured 50ms RMS peaks (see README "Audio mix") so each
// sound lands at an intentional level relative to the slap (reference ≈ -10.5 dB RMS peak).
const TRIM: Record<string, number> = {
  sfx_slap_1: 0.95, // -11.4 dB → ref
  sfx_slap_2: 0.71, // -8.9 dB → ref
  sfx_slap_3: 0.86, // -10.6 dB → ref
  sfx_crit: 0.97, // +2 dB over slaps: crits should pop
  sfx_squish: 1.0, // getting stomped must be unmistakable
  sfx_stomp: 0.9,
  sfx_ouch: 1.0,
  sfx_whoosh: 0.7, // frequent, sits behind
  sfx_coin: 0.7, // very frequent
  sfx_combo: 1.0,
  sfx_click: 1.4, // very quiet transient source
  sfx_hover: 0.6,
  sfx_zap: 1.2,
  sfx_fire: 0.6,
  sfx_freeze: 1.4,
  sfx_explosion: 0.75,
  sfx_boing: 0.9,
  sfx_heal: 0.85,
  sfx_shield: 1.4,
  sfx_upgrade: 1.0,
  sfx_levelup: 0.85,
  sfx_warning: 0.85,
  sfx_gameover: 1.0,
  // Feetza 2.0: "measured" dB is the file's 50ms RMS peak, "→" the level after this trim.
  sfx_miniboss: 1.05, // -8.4 dB → -8.0: alert must cut through the music, like a crit
  sfx_phase: 1.07, // -8.6 dB → -8.0: boss phase change, clearly over the music
  sfx_piston: 1.08, // -12.7 dB → -12.0: hazard cue, just under the slap
  sfx_chest: 1.4, // -15.4 dB → -12.5: transient-heavy source, lifted toward the slap
  sfx_drone: 0.97, // -11.7 dB → -12.0: a bit below the slap
  sfx_whistle: 0.59, // -6.4 dB → -11.0: piercing source, held just under the slap
  sfx_pop: 0.7, // -7.9 dB → -11.0: about slap level
  sfx_seagull: 0.6, // -7.0 dB → -11.4: a bit below the slap
  sfx_possess: 1.1, // -12.8 dB → -12.0
  sfx_stale: 0.92, // -10.3 dB → -11.0
  sfx_reheat: 1.04, // -12.3 dB → -12.0
  sfx_steal: 1.3, // -15.3 dB → -13.0: sneaky, sits behind
  sfx_hold: 0.92, // -23.8 dB → -24.5: quiet tick, about click level
  // Stings are normalised to the music loudness (-16.4 LUFS, like music_gameover). audio.sting() plays
  // them at music volume and does not read TRIM; these gains apply if they're played through sfx().
  music_victory: 2.04, // -15.7 dB → -9.5: the 60-wave finish, a little over the slap
  music_act: 1.74, // -15.3 dB → -10.5: act-complete sting at slap level
};

const AMBIENCE_GAIN = 0.4;

class AudioManager {
  private game!: Phaser.Game;
  private tracks: Record<Cat, Track | null> = { music: null, ambience: null };
  private fading = new Set<{ sound: Track['sound']; from: number; to: number; t0: number; dur: number; done?: () => void }>();
  private lastPlayed = new Map<string, number>();
  private loading = new Map<string, Promise<boolean>>();
  private duckLevel = 1;
  private raf = 0;

  init(game: Phaser.Game): void {
    this.game = game;
    this.applyMaster();
    onSettingsChange(() => this.applyVolumes());
    // Keep music running between scenes; Phaser pauses all audio when the tab is hidden.
    game.sound.pauseOnBlur = true;
  }

  has(key: string): boolean {
    return AVAILABLE.has(key);
  }

  private vol(cat: Cat | 'sfx'): number {
    const s = save.settings;
    return cat === 'music' ? s.music : cat === 'ambience' ? s.ambience * AMBIENCE_GAIN : s.sfx;
  }

  private applyMaster(): void {
    const s = save.settings;
    this.game.sound.volume = s.master;
    this.game.sound.mute = s.muted;
  }

  applyVolumes(): void {
    this.applyMaster();
    for (const cat of ['music', 'ambience'] as Cat[]) {
      const t = this.tracks[cat];
      if (t && !this.isFading(t.sound)) t.sound.volume = t.target * this.vol(cat) * this.duckLevel;
    }
  }

  private isFading(sound: Track['sound']): boolean {
    for (const f of this.fading) if (f.sound === sound) return true;
    return false;
  }

  /** Load an audio file through the given scene's loader if it isn't cached yet. */
  ensure(scene: Phaser.Scene, key: string): Promise<boolean> {
    if (!AVAILABLE.has(key)) return Promise.resolve(false);
    if (scene.cache.audio.exists(key)) return Promise.resolve(true);
    const pending = this.loading.get(key);
    if (pending) return pending;
    const p = new Promise<boolean>((resolve) => {
      const onDone = (fileKey: string) => {
        if (fileKey !== key) return;
        cleanup();
        resolve(scene.cache.audio.exists(key));
      };
      const onErr = (file: Phaser.Loader.File) => {
        if (file.key !== key) return;
        cleanup();
        resolve(false);
      };
      // if the scene shuts down mid-download, give up so a later scene can retry
      const onShutdown = () => {
        cleanup();
        resolve(false);
      };
      const onQueueDone = () => {
        cleanup();
        resolve(scene.cache.audio.exists(key));
      };
      const cleanup = () => {
        scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onDone);
        scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
        scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
        scene.load.off(Phaser.Loader.Events.COMPLETE, onQueueDone);
        this.loading.delete(key);
      };
      scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onDone);
      scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      scene.load.on(Phaser.Loader.Events.COMPLETE, onQueueDone);
      scene.load.audio(key, `audio/${key}.mp3`);
      if (!scene.load.isLoading()) scene.load.start();
    });
    this.loading.set(key, p);
    return p;
  }

  /** Warm the cache in the background so later transitions are instant. */
  preload(scene: Phaser.Scene, keys: string[]): void {
    for (const k of keys) void this.ensure(scene, k);
  }

  sfx(key: string, opts: { volume?: number; rate?: number; detune?: number; throttle?: number; jitter?: number } = {}): void {
    if (!this.game || !this.game.cache.audio.exists(key)) return;
    const now = performance.now();
    const throttle = opts.throttle ?? 35;
    const last = this.lastPlayed.get(key) ?? -1e9;
    if (now - last < throttle) return;
    this.lastPlayed.set(key, now);
    const jitter = opts.jitter ?? 0.06;
    const rate = (opts.rate ?? 1) * (1 + (Math.random() * 2 - 1) * jitter);
    this.game.sound.play(key, {
      volume: (opts.volume ?? 1) * (TRIM[key] ?? 1) * this.vol('sfx'),
      rate,
      detune: opts.detune ?? 0,
    });
  }

  private lastSlap = 0;

  /** Round-robin through the slap variations (never the same one twice) with pitch variation. */
  slap(intensity = 1): void {
    this.lastSlap = (this.lastSlap + 1 + Math.floor(Math.random() * 2)) % 3;
    this.sfx(`sfx_slap_${this.lastSlap + 1}`, { volume: 0.8 + 0.2 * intensity, rate: 1.06 - 0.12 * intensity, throttle: 25, jitter: 0.1 });
  }

  /** Crossfade to the first available track among candidates. */
  async music(scene: Phaser.Scene, candidates: string[], fade = 1200): Promise<void> {
    await this.swap('music', scene, candidates, fade, 1);
  }

  async ambience(scene: Phaser.Scene, candidates: string[], fade = 2000): Promise<void> {
    await this.swap('ambience', scene, candidates, fade, 1);
  }

  private async swap(cat: Cat, scene: Phaser.Scene, candidates: string[], fade: number, target: number): Promise<void> {
    const key = candidates.find((k) => AVAILABLE.has(k));
    const cur = this.tracks[cat];
    this.requested[cat] = key ?? null;
    if (cur && cur.key === key) return;
    if (!key) {
      this.stop(cat, fade);
      return;
    }
    const ok = await this.ensure(scene, key);
    if (!ok || this.requested[cat] !== key) return;
    this.trimForLoop(key);
    this.stop(cat, fade);
    const sound = this.game.sound.add(key, { loop: true, volume: 0 }) as Track['sound'];
    sound.play();
    this.tracks[cat] = { key, sound, target };
    this.fade(sound, 0, target * this.vol(cat) * this.duckLevel, fade);
  }

  private requested: Record<Cat, string | null> = { music: null, ambience: null };
  private trimmed = new Set<string>();

  /**
   * MP3 encoders pad the start/end with silence, and not every browser strips it on decode,
   * which leaves an audible hiccup at the loop point. Trim near-silent edges once per track.
   */
  private trimForLoop(key: string): void {
    if (this.trimmed.has(key)) return;
    this.trimmed.add(key);
    const buf = this.game.cache.audio.get(key) as AudioBuffer | undefined;
    if (!buf || typeof buf.getChannelData !== 'function') return;
    const maxScan = Math.min(8192, Math.floor(buf.length / 4));
    const th = 1e-3;
    let lead = maxScan;
    let tail = maxScan;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      let i = 0;
      while (i < maxScan && Math.abs(d[i]) < th) i++;
      lead = Math.min(lead, i);
      let j = 0;
      while (j < maxScan && Math.abs(d[d.length - 1 - j]) < th) j++;
      tail = Math.min(tail, j);
    }
    if (lead + tail < 32) return;
    const len = buf.length - lead - tail;
    const ctx = (this.game.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!ctx) return;
    const out = ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(lead, lead + len), c);
    (this.game.cache.audio as unknown as { entries: Phaser.Structs.Map<string, unknown> }).entries.set(key, out);
  }

  /** One-shot music sting (e.g. game over) that ducks the current music. */
  sting(key: string, volume = 1): void {
    if (!this.game.cache.audio.exists(key)) return;
    this.game.sound.play(key, { volume: volume * this.vol('music') });
  }

  stop(cat: Cat, fade = 800): void {
    this.requested[cat] = null; // a track still downloading must not start after a stop
    const t = this.tracks[cat];
    if (!t) return;
    this.tracks[cat] = null;
    this.fade(t.sound, t.sound.volume, 0, fade, () => t.sound.destroy());
  }

  /** Lower music + ambience (e.g. behind menus). 1 = normal. */
  duck(level: number, ms = 400): void {
    this.duckLevel = level;
    for (const cat of ['music', 'ambience'] as Cat[]) {
      const t = this.tracks[cat];
      if (t) this.fade(t.sound, t.sound.volume, t.target * this.vol(cat) * level, ms);
    }
  }

  get currentMusic(): string | null {
    return this.tracks.music?.key ?? null;
  }

  private fade(sound: Track['sound'], from: number, to: number, dur: number, done?: () => void): void {
    for (const f of [...this.fading]) if (f.sound === sound) this.fading.delete(f);
    if (dur <= 0) {
      sound.volume = to;
      done?.();
      return;
    }
    this.fading.add({ sound, from, to, t0: performance.now(), dur, done });
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    const now = performance.now();
    for (const f of [...this.fading]) {
      const k = Math.min(1, (now - f.t0) / f.dur);
      const e = k * k * (3 - 2 * k);
      try {
        f.sound.volume = f.from + (f.to - f.from) * e;
      } catch {
        this.fading.delete(f);
        continue;
      }
      if (k >= 1) {
        this.fading.delete(f);
        f.done?.();
      }
    }
    this.raf = this.fading.size ? requestAnimationFrame(this.tick) : 0;
  };
}

export const audio = new AudioManager();
