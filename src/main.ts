import './styles/base.css';
import './styles/mission.css';
import { setupScroll } from './scroll/timeline';
import { WaterStage, type WaterTuning } from './water/WaterStage';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const host = document.querySelector<HTMLElement>('#water-stage');

const tuning: WaterTuning = {
  waterSpeed: prefersReduced ? 0.18 : 1,
  ionDensity: prefersReduced ? 0.28 : 0.78,
  mistIntensity: prefersReduced ? 0.1 : 0.68,
  glowStrength: 1,
  waterfallWidth: 1,
  turbulence: prefersReduced ? 0.05 : 0.42,
};

if (host) {
  const stage = new WaterStage(host, tuning, prefersReduced);
  stage.init().catch((error) => {
    console.error('Mission Lab water layer failed to initialize', error);
    host.classList.add('water-error');
  });
  setupScroll(stage);
  setupDebugPanel(stage, tuning);
}

function setupDebugPanel(stage: WaterStage, tuningState: WaterTuning) {
  const panel = document.querySelector<HTMLElement>('[data-debug-panel]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-debug-toggle]');
  const setOpen = (open: boolean) => panel?.classList.toggle('open', open);
  toggle?.addEventListener('click', () => setOpen(!panel?.classList.contains('open')));
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'd' && !(event.target instanceof HTMLInputElement)) {
      setOpen(!panel?.classList.contains('open'));
    }
  });
  document.querySelectorAll<HTMLInputElement>('[data-tune]').forEach((input) => {
    const key = input.dataset.tune as keyof WaterTuning;
    input.value = String(tuningState[key]);
    input.addEventListener('input', () => {
      tuningState[key] = Number(input.value);
      stage.setTuning(tuningState);
    });
  });
}
