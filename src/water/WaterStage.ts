import {
  Application,
  BlurFilter,
  Container,
  Graphics,
  Text,
  TextStyle,
  type Ticker,
} from 'pixi.js';

export interface WaterTuning {
  waterSpeed: number;
  ionDensity: number;
  mistIntensity: number;
  glowStrength: number;
  waterfallWidth: number;
  turbulence: number;
}

interface FlowParticle {
  phase: number;
  speed: number;
  size: number;
  alpha: number;
  color: number;
  node: Graphics;
}

interface IonParticle {
  phase: number;
  speed: number;
  sway: number;
  label: Text;
}

interface MistParticle {
  phase: number;
  speed: number;
  drift: number;
  node: Graphics;
}

type FlowPoint = { x: number; y: number; angle: number; intensity: number };

const CYAN = 0x6de9ff;
const DEEP_CYAN = 0x1b8dad;
const GOLD = 0xd8ac55;
const WHITE = 0xeefbff;
const ION_LABELS = ['Ca²⁺', 'Mg²⁺', 'SiO₂', 'NO₃⁻', 'Cl⁻', 'HCO₃⁻'];

export class WaterStage {
  private app: Application | null = null;
  private readonly host: HTMLElement;
  private tuning: WaterTuning;
  private readonly reducedMotion: boolean;
  private time = 0;
  private scroll = 0;
  private width = window.innerWidth;
  private height = window.innerHeight;

  private readonly root = new Container({ isRenderGroup: true });
  private readonly lineLayer = new Container();
  private readonly deviceLayer = new Container();
  private readonly particleLayer = new Container();
  private readonly ionLayer = new Container();
  private readonly mistLayer = new Container();

  private readonly waterLines = new Graphics();
  private readonly glowLines = new Graphics();
  private readonly goldLines = new Graphics();
  private readonly waterfallVeil = new Graphics();
  private readonly devices = new Graphics();
  private readonly waterWheel = new Graphics();
  private readonly flowParticles: FlowParticle[] = [];
  private readonly ions: IonParticle[] = [];
  private readonly mist: MistParticle[] = [];

  private readonly onResize = () => this.resize();

  constructor(host: HTMLElement, tuning: WaterTuning, reducedMotion: boolean) {
    this.host = host;
    this.tuning = { ...tuning };
    this.reducedMotion = reducedMotion;
  }

  async init() {
    this.app = new Application();
    await this.app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });

    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.root);
    this.root.addChild(this.lineLayer, this.deviceLayer, this.particleLayer, this.ionLayer, this.mistLayer);
    this.lineLayer.addChild(this.glowLines, this.waterfallVeil, this.waterLines, this.goldLines);
    this.deviceLayer.addChild(this.devices, this.waterWheel);

    this.glowLines.filters = [new BlurFilter({ strength: 12, quality: 2 })];
    this.waterfallVeil.filters = [new BlurFilter({ strength: 8, quality: 2 })];
    this.mistLayer.filters = [new BlurFilter({ strength: 3, quality: 1 })];

    this.createParticles();
    this.createIons();
    this.createMist();
    this.resize();
    this.app.ticker.add(this.tick, this);
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.app?.ticker.remove(this.tick, this);
    this.app?.destroy(true, { children: true, texture: true, textureSource: true });
    this.app = null;
  }

  setScroll(progress: number) {
    this.scroll = Math.max(0, Math.min(1, progress));
  }

  setTuning(tuning: WaterTuning) {
    this.tuning = { ...tuning };
  }

  private resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.drawStaticLayers();
  }

  private createParticles() {
    const count = this.reducedMotion ? 52 : 135;
    for (let i = 0; i < count; i++) {
      const node = new Graphics().circle(0, 0, 1).fill(i % 6 === 0 ? GOLD : CYAN);
      node.alpha = 0.5;
      this.particleLayer.addChild(node);
      this.flowParticles.push({
        phase: Math.random(),
        speed: 0.012 + Math.random() * 0.032,
        size: 0.45 + Math.random() * 2.2,
        alpha: 0.18 + Math.random() * 0.55,
        color: i % 8 === 0 ? GOLD : i % 5 === 0 ? WHITE : CYAN,
        node,
      });
    }
  }

  private createIons() {
    const style = new TextStyle({
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      fontSize: 16,
      fill: 0xcff9ff,
      align: 'center',
      letterSpacing: 0.8,
    });
    const count = this.reducedMotion ? 14 : 34;
    for (let i = 0; i < count; i++) {
      const label = new Text({ text: ION_LABELS[i % ION_LABELS.length], style });
      label.anchor.set(0.5);
      label.alpha = 0.72;
      this.ionLayer.addChild(label);
      this.ions.push({
        phase: Math.random(),
        speed: 0.007 + Math.random() * 0.018,
        sway: 6 + Math.random() * 18,
        label,
      });
    }
  }

  private createMist() {
    const count = this.reducedMotion ? 32 : 92;
    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.random() * 5;
      const node = new Graphics().circle(0, 0, radius).fill(WHITE);
      this.mistLayer.addChild(node);
      this.mist.push({ phase: Math.random(), speed: 0.006 + Math.random() * 0.015, drift: -20 + Math.random() * 42, node });
    }
  }

  private tick(ticker: Ticker) {
    const dt = ticker.deltaTime;
    const speed = this.tuning.waterSpeed * (this.reducedMotion ? 0.35 : 1);
    this.time += dt * 0.016 * speed;
    this.drawStaticLayers();
    this.updateParticles(dt, speed);
    this.updateIons(dt, speed);
    this.updateMist(dt, speed);
    this.updateDevices();
  }

  private alphaFor(start: number, end: number) {
    const margin = 0.055;
    const fadeIn = smoothstep(start - margin, start + margin, this.scroll);
    const fadeOut = 1 - smoothstep(end - margin, end + margin, this.scroll);
    return Math.max(0, Math.min(1, fadeIn * fadeOut));
  }

  private drawStaticLayers() {
    const w = this.width;
    const h = this.height;
    const s = this.scroll;
    const glow = this.tuning.glowStrength;
    const waterfallAlpha = this.alphaFor(0.02, 0.72);
    const riverAlpha = this.alphaFor(0.28, 0.98);
    const heroAlpha = Math.max(0, 1 - smoothstep(0.17, 0.34, s));

    this.glowLines.clear();
    this.waterLines.clear();
    this.goldLines.clear();
    this.waterfallVeil.clear();

    const heroY = h * 0.355;
    const heroLeft = Math.max(88, w * 0.145);
    const heroRight = Math.min(w - 64, w * 0.73);
    const fallX = heroLeft + Math.sin(this.time * 0.3) * 2;
    const fallTop = heroY + 10;
    const fallBottom = h * 0.92;
    const fallWidth = (22 + 26 * this.tuning.waterfallWidth) * (w < 700 ? 0.7 : 1);

    // Main stream under Mission.
    this.glowLines
      .moveTo(heroRight, heroY)
      .bezierCurveTo(w * 0.55, heroY + 10, w * 0.35, heroY - 12, heroLeft, heroY + 4)
      .stroke({ width: 24 * glow, color: CYAN, alpha: 0.18 * heroAlpha });
    this.waterLines
      .moveTo(heroRight, heroY)
      .bezierCurveTo(w * 0.55, heroY + 8, w * 0.34, heroY - 10, heroLeft, heroY + 4)
      .stroke({ width: 5, color: CYAN, alpha: 0.78 * heroAlpha });
    this.waterLines
      .moveTo(heroRight, heroY + 9)
      .bezierCurveTo(w * 0.54, heroY + 22, w * 0.33, heroY, heroLeft, heroY + 12)
      .stroke({ width: 2, color: WHITE, alpha: 0.4 * heroAlpha });
    this.goldLines
      .moveTo(heroRight - 18, heroY - 10)
      .bezierCurveTo(w * 0.54, heroY - 1, w * 0.38, heroY - 22, heroLeft + 18, heroY - 4)
      .stroke({ width: 1.2, color: GOLD, alpha: 0.72 * heroAlpha });

    // Vertical waterfall spine.
    for (let i = 0; i < 5; i++) {
      const offset = (i - 2) * fallWidth * 0.22 + Math.sin(this.time * 0.7 + i) * 2;
      const alpha = waterfallAlpha * (0.22 + i * 0.05);
      this.waterfallVeil
        .moveTo(fallX + offset, fallTop)
        .bezierCurveTo(fallX + offset - 18, h * 0.5, fallX + offset + 18, h * 0.68, fallX + offset - 4, fallBottom)
        .stroke({ width: fallWidth * (0.22 + i * 0.08), color: i % 2 ? DEEP_CYAN : CYAN, alpha });
    }
    this.glowLines
      .moveTo(fallX, fallTop)
      .bezierCurveTo(fallX - 24, h * 0.52, fallX + 10, h * 0.72, fallX - 10, fallBottom)
      .stroke({ width: fallWidth * 1.65 * glow, color: CYAN, alpha: 0.1 * waterfallAlpha });

    // Pool and river.
    const poolY = h * (0.78 - 0.08 * smoothstep(0.72, 1, s));
    const startX = Math.max(74, w * 0.14);
    const midX = w * 0.42;
    const endX = w * 0.88;
    this.glowLines
      .moveTo(startX, poolY)
      .bezierCurveTo(w * 0.24, poolY + 50, w * 0.34, poolY - 26, midX, poolY + 12)
      .bezierCurveTo(w * 0.57, poolY + 72, w * 0.68, poolY - 46, endX, poolY + 14)
      .stroke({ width: 44 * glow, color: CYAN, alpha: 0.11 * riverAlpha });
    this.waterLines
      .moveTo(startX, poolY)
      .bezierCurveTo(w * 0.24, poolY + 48, w * 0.34, poolY - 25, midX, poolY + 12)
      .bezierCurveTo(w * 0.57, poolY + 70, w * 0.68, poolY - 45, endX, poolY + 14)
      .stroke({ width: 8, color: CYAN, alpha: 0.68 * riverAlpha });
    this.waterLines
      .moveTo(startX + 16, poolY + 16)
      .bezierCurveTo(w * 0.26, poolY + 66, w * 0.37, poolY - 8, midX + 30, poolY + 30)
      .bezierCurveTo(w * 0.61, poolY + 82, w * 0.72, poolY - 32, endX - 6, poolY + 32)
      .stroke({ width: 2, color: WHITE, alpha: 0.36 * riverAlpha });
    this.goldLines
      .moveTo(startX + 8, poolY - 10)
      .bezierCurveTo(w * 0.28, poolY + 28, w * 0.34, poolY - 46, midX + 10, poolY - 4)
      .bezierCurveTo(w * 0.58, poolY + 48, w * 0.7, poolY - 70, endX - 30, poolY)
      .stroke({ width: 1.4, color: GOLD, alpha: 0.7 * riverAlpha });
  }

  private updateParticles(dt: number, speed: number) {
    const active = Math.ceil(this.flowParticles.length * this.tuning.ionDensity);
    this.flowParticles.forEach((p, index) => {
      p.node.visible = index < active;
      if (!p.node.visible) return;
      p.phase = (p.phase + p.speed * dt * speed) % 1;
      const point = this.getFlowPoint((p.phase + this.scroll * 0.18) % 1, 0);
      const pulse = 0.45 + 0.55 * Math.sin(this.time * 3 + index);
      p.node.clear().circle(0, 0, p.size * (0.7 + pulse * 0.5)).fill(p.color);
      p.node.position.set(point.x, point.y);
      p.node.alpha = p.alpha * point.intensity * (0.6 + pulse * 0.3);
      p.node.blendMode = 'add';
    });
  }

  private updateIons(dt: number, speed: number) {
    const active = Math.ceil(this.ions.length * this.tuning.ionDensity);
    this.ions.forEach((ion, index) => {
      ion.label.visible = index < active;
      if (!ion.label.visible) return;
      ion.phase = (ion.phase + ion.speed * dt * speed) % 1;
      const offset = Math.sin(this.time * 2 + index * 0.7) * ion.sway * this.tuning.turbulence;
      const point = this.getFlowPoint((ion.phase + this.scroll * 0.16) % 1, offset);
      ion.label.position.set(point.x, point.y);
      ion.label.rotation = point.angle * 0.18 + Math.sin(this.time + index) * 0.08;
      ion.label.alpha = point.intensity * (0.28 + this.tuning.ionDensity * 0.62);
      ion.label.scale.set(0.86 + 0.22 * point.intensity);
    });
  }

  private updateMist(dt: number, speed: number) {
    const w = this.width;
    const h = this.height;
    const waterfallAlpha = this.alphaFor(0.02, 0.75) * this.tuning.mistIntensity;
    const fallX = Math.max(88, w * 0.145);
    const baseY = h * 0.86;
    this.mist.forEach((m, index) => {
      m.phase = (m.phase + m.speed * dt * speed) % 1;
      const rise = m.phase;
      const x = fallX + m.drift * rise + Math.sin(this.time * 0.8 + index) * 8;
      const y = baseY - rise * h * 0.25 + Math.sin(index + this.time) * 6;
      const scale = 0.5 + rise * 1.8;
      m.node.position.set(x, y);
      m.node.scale.set(scale);
      m.node.alpha = waterfallAlpha * (1 - rise) * (0.15 + Math.random() * 0.03);
      m.node.blendMode = 'add';
    });
  }

  private updateDevices() {
    const w = this.width;
    const h = this.height;
    const s = this.scroll;
    const energyAlpha = this.alphaFor(0.38, 0.67);
    const treatmentAlpha = this.alphaFor(0.56, 0.91);
    const riverY = h * 0.75;

    this.devices.clear();
    this.waterWheel.clear();
    this.deviceLayer.alpha = 1;

    // Waterwheel / energy moment.
    const wheelX = w * 0.33;
    const wheelY = riverY + 22;
    const r = Math.min(54, Math.max(32, w * 0.045));
    this.waterWheel.alpha = energyAlpha;
    this.waterWheel.position.set(wheelX, wheelY);
    this.waterWheel.rotation = this.time * 0.45 * this.tuning.waterSpeed + s * 5;
    this.waterWheel.circle(0, 0, r).stroke({ width: 1.3, color: GOLD, alpha: 0.72 });
    this.waterWheel.circle(0, 0, r * 0.23).stroke({ width: 1, color: CYAN, alpha: 0.56 });
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      const x1 = Math.cos(a) * r * 0.28;
      const y1 = Math.sin(a) * r * 0.28;
      const x2 = Math.cos(a) * r;
      const y2 = Math.sin(a) * r;
      this.waterWheel.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1, color: i % 2 ? CYAN : GOLD, alpha: 0.58 });
      this.waterWheel.roundRect(x2 - 8, y2 - 4, 16, 8, 2).fill({ color: GOLD, alpha: 0.22 });
    }

    // Abstract treatment station: vessel, gauge, valve, cooling/boiler echoes.
    const baseX = w * 0.66;
    const baseY = h * 0.67;
    this.devices.alpha = Math.max(energyAlpha * 0.5, treatmentAlpha);
    this.devices.roundRect(baseX - 50, baseY - 110, 100, 186, 42).stroke({ width: 1.4, color: CYAN, alpha: 0.62 * treatmentAlpha });
    this.devices.roundRect(baseX - 36, baseY - 82, 72, 130, 30).fill({ color: CYAN, alpha: 0.035 * treatmentAlpha });
    this.devices.moveTo(baseX - 130, baseY - 16).lineTo(baseX - 50, baseY - 16).stroke({ width: 2, color: CYAN, alpha: 0.5 * treatmentAlpha });
    this.devices.moveTo(baseX + 50, baseY - 16).lineTo(baseX + 150, baseY - 16).stroke({ width: 2, color: CYAN, alpha: 0.5 * treatmentAlpha });
    this.devices.circle(baseX + 118, baseY - 68, 27).stroke({ width: 1.2, color: GOLD, alpha: 0.62 * treatmentAlpha });
    this.devices.moveTo(baseX + 118, baseY - 68).lineTo(baseX + 131, baseY - 82).stroke({ width: 1.2, color: GOLD, alpha: 0.74 * treatmentAlpha });
    this.devices.circle(baseX - 110, baseY - 16, 18).stroke({ width: 1.2, color: CYAN, alpha: 0.52 * treatmentAlpha });
    this.devices.moveTo(baseX - 122, baseY - 28).lineTo(baseX - 98, baseY - 4).stroke({ width: 1, color: GOLD, alpha: 0.5 * treatmentAlpha });
    this.devices.moveTo(baseX - 98, baseY - 28).lineTo(baseX - 122, baseY - 4).stroke({ width: 1, color: GOLD, alpha: 0.5 * treatmentAlpha });
    for (let i = 0; i < 5; i++) {
      const y = baseY + 116 + i * 9;
      const x = baseX - 80 + i * 18;
      this.devices.moveTo(x, y).lineTo(x + 122, y).stroke({ width: 1, color: i % 2 ? CYAN : GOLD, alpha: 0.16 * treatmentAlpha });
    }
  }

  private getFlowPoint(t: number, offset = 0): FlowPoint {
    const w = this.width;
    const h = this.height;
    const s = this.scroll;
    const heroY = h * 0.355;
    const heroLeft = Math.max(88, w * 0.145);
    const heroRight = Math.min(w - 64, w * 0.73);
    const fallX = heroLeft;
    const poolY = h * (0.78 - 0.08 * smoothstep(0.72, 1, s));
    const activeHero = Math.max(0.18, 1 - smoothstep(0.16, 0.34, s));
    const waterfallIntensity = this.alphaFor(0.02, 0.76);
    const riverIntensity = this.alphaFor(0.28, 0.98);

    if (t < 0.24) {
      const k = t / 0.24;
      const x = lerp(heroRight, heroLeft, k);
      const y = heroY + Math.sin(k * Math.PI * 2 + this.time * 2) * (2 + this.tuning.turbulence * 5) + offset;
      return { x, y, angle: Math.PI, intensity: activeHero };
    }
    if (t < 0.52) {
      const k = (t - 0.24) / 0.28;
      const x = fallX + Math.sin(k * 10 + this.time * 2) * (6 + this.tuning.turbulence * 18) + offset * 0.16;
      const y = lerp(heroY + 16, h * 0.89, k);
      return { x, y, angle: Math.PI / 2, intensity: waterfallIntensity };
    }
    const k = (t - 0.52) / 0.48;
    const x = cubicBezier(heroLeft, w * 0.28, w * 0.58, w * 0.89, k);
    const y = cubicBezier(poolY, poolY + 68, poolY - 46, poolY + 18, k) + offset;
    const dx = cubicBezierDerivative(heroLeft, w * 0.28, w * 0.58, w * 0.89, k);
    const dy = cubicBezierDerivative(poolY, poolY + 68, poolY - 46, poolY + 18, k);
    return { x, y, angle: Math.atan2(dy, dx), intensity: riverIntensity };
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function cubicBezier(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return mt * mt * mt * a + 3 * mt * mt * t * b + 3 * mt * t * t * c + t * t * t * d;
}

function cubicBezierDerivative(a: number, b: number, c: number, d: number, t: number) {
  const mt = 1 - t;
  return 3 * mt * mt * (b - a) + 6 * mt * t * (c - b) + 3 * t * t * (d - c);
}
