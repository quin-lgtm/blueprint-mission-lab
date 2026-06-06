import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { WaterStage } from '../water/WaterStage';

gsap.registerPlugin(ScrollTrigger);

export function setupScroll(stage: WaterStage) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const proxy = { progress: 0 };

  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: reduce ? false : 0.65,
    onUpdate: (self) => {
      proxy.progress = self.progress;
      stage.setScroll(proxy.progress);
    },
  });

  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      end: 'bottom 20%',
      onEnter: () => el.classList.add('visible'),
      onEnterBack: () => el.classList.add('visible'),
    });
  });

  if (!reduce) {
    gsap.to('.hero-copy', {
      yPercent: -8,
      opacity: 0.72,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // Make first screen visible immediately for screenshots and users arriving at top.
  requestAnimationFrame(() => {
    document.querySelector('.hero .reveal')?.classList.add('visible');
    stage.setScroll(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
  });
}
