// blackhole.ts — a playful "dark hole" easter egg, triggered from the mascot.
//
// Click the mascot (bottom-right): a black dot opens in the centre of the
// screen and every visible element under <main> (paragraphs, headings, cards,
// list items, images, …) is sucked in individually — each starts a few ms
// after the previous one and spirals AROUND the hole (shrinking orbit) over
// ~10 seconds. Then everything pops back out to its exact original position.
//
// All animation is done with the Web Animations API — tuning is the CFG object.

export interface BlackHoleConfig {
  dotSize: number; // px diameter of the hole
  appearMs: number; // time for the hole to open
  suckMs: number; // how long the suck-in lasts (user: 10 s)
  swallowMs: number; // "gulp" pulse at the end of the suck-in
  pauseMs: number; // hold while everything sits inside
  popMs: number; // time for everything to fly back out
  staggerStepMs: number; // start offset between particles (few ms each)
  maxStaggerMs: number; // hard cap so the first particles don't wait forever
  spiralTurns: number; // how many full orbits each particle makes
  wobble: number; // 0..1 radial wobble strength while orbiting
  endBlurPx: number; // blur applied near the end of the suck-in
  frames: number; // keyframes per orbit (smoothness vs. cost)
}

export const CFG: BlackHoleConfig = {
  dotSize: 300,
  appearMs: 350,
  suckMs: 8000,
  swallowMs: 450,
  pauseMs: 800,
  popMs: 200,
  staggerStepMs: 30,
  maxStaggerMs: 4500,
  spiralTurns: 2.6,
  wobble: 0.5,
  endBlurPx: 3,
  frames: 64,
};

let busy = false;
const clockDir = -1; // orbital direction (feel free to flip)

/** Gather every visible element under <main>, plus the header/footer shells. */
function collectParticles(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const push = (root: Element | null) => {
    if (!root) return;
    if (root instanceof HTMLElement) {
      root.querySelectorAll("*").forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        const tag = el.tagName;
        if (["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"].includes(tag)) return;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 && rect.height < 2) return; // invisible spacers
        out.push(el);
      });
    }
  };
  push(document.querySelector("main"));
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");
  if (header instanceof HTMLElement) out.push(header);
  if (footer instanceof HTMLElement) out.push(footer);
  return out;
}

interface Particle {
  el: HTMLElement;
  /** start offset from the hole in px */
  x0: number;
  y0: number;
  angle: number;
  radius: number;
}

/** Measure particles relative to the centre of the screen. */
function measureParticles(els: HTMLElement[]): Particle[] {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const particles: Particle[] = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const px = r.left + r.width / 2 - cx;
    const py = r.top + r.height / 2 - cy;
    const radius = Math.hypot(px, py);
    if (radius < 12) continue; // already on top of the hole — leave it
    particles.push({ el, x0: px, y0: py, angle: Math.atan2(py, px), radius });
  }
  return particles;
}

/** Generate keyframes that spiral a particle into the hole (shrinking orbit). */
function spiralKeyframes(p: Particle): Keyframe[] {
  const { angle, radius } = p;
  const frames: Keyframe[] = [];
  const n = CFG.frames;
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 → 1 (time through the suck-in)
    const r = radius * (1 - t) ** 1.6;
    const ripple = 1 + CFG.wobble * 0.16 * Math.sin(t * Math.PI * 6);
    const ang = angle + clockDir * CFG.spiralTurns * 2 * Math.PI * t;
    const x = Math.cos(ang) * r * ripple;
    const y = Math.sin(ang) * r * ripple;
    const shrink = t < 0.82 ? 1 : 1 - ((t - 0.82) / 0.18) * 0.98; // squeeze near the end
    const blur = t > 0.85 ? CFG.endBlurPx * ((t - 0.85) / 0.15) : 0;
    frames.push({
      offset: t,
      transform: `translate(${x}px, ${y}px) scale(${shrink}) rotate(${t * 26 * clockDir}deg)`,
      filter: blur > 0 ? `blur(${blur}px)` : "blur(0px)",
    });
  }
  return frames;
}

/** Build the full-screen overlay + the hole with two spinning spiral arms. */
function buildHole(): { overlay: HTMLDivElement; hole: HTMLDivElement; arms: HTMLDivElement[] } {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "9998",
    pointerEvents: "none",
  } as CSSStyleDeclaration);
  overlay.id = "bh-overlay";

  const hole = document.createElement("div");
  hole.style.position = "absolute";
  hole.style.left = "50%";
  hole.style.top = "50%";
  hole.style.width = `${CFG.dotSize}px`;
  hole.style.height = `${CFG.dotSize}px`;
  hole.style.marginLeft = `${-CFG.dotSize / 2}px`;
  hole.style.marginTop = `${-CFG.dotSize / 2}px`;
  hole.style.borderRadius = "50%";
  // fallback black circle (gradient) sits UNDER the spiral.gif — if the gif
  // ever fails to load, the gradient layer is what you see.
  hole.style.backgroundImage =
    "radial-gradient(circle, rgba(0,0,0,0) 0 34%, #000 46% 60%, rgba(0,0,0,.9) 72%, transparent 100%), url('theme/spiral.gif')";
  hole.style.backgroundSize = "100% 100%, cover";
  hole.style.backgroundPosition = "center, center";
  hole.style.backgroundRepeat = "no-repeat, no-repeat";
  hole.style.boxShadow =
    "0 0 60px rgba(0,0,0,.9), 0 0 120px rgba(0,0,0,.55), inset 0 0 40px #000";

  const makeArm = (color: string): HTMLDivElement => {
    const arm = document.createElement("div");
    arm.style.position = "absolute";
    arm.style.inset = `${-CFG.dotSize * 0.55}px`;
    arm.style.borderRadius = "50%";
    arm.style.background = `conic-gradient(from 0deg, transparent 0 55%, ${color} 78%, transparent 92%)`;
    arm.style.webkitMask =
      "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))";
    arm.style.mask =
      "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))";
    return arm;
  };
  const armA = makeArm("rgba(255,46,59,0.85)");
  const armB = makeArm("rgba(120,120,130,0.75)");
  hole.append(armA, armB);
  overlay.append(hole);
  document.body.appendChild(overlay);
  return { overlay, hole, arms: [armA, armB] };
}

export function triggerBlackHole(): void {
  if (busy) return;
  busy = true;

  const els = collectParticles();
  const particles = measureParticles(els);
  const { overlay, hole, arms } = buildHole();

  // 1) open the hole and spin its arms
  hole.animate(
    [{ transform: "scale(0)" }, { transform: "scale(1)", easing: "cubic-bezier(0.2, 1.4, 0.4, 1)" }],
    { duration: CFG.appearMs, fill: "both" },
  );
  arms.forEach((arm) => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    arm.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${dir * 1440}deg)` }],
      { duration: CFG.suckMs + CFG.swallowMs, easing: "linear", fill: "forwards" },
    );
    arm.animate(
      [
        { transform: "rotate(0deg) scale(1)" },
        { transform: `rotate(${dir * 120}deg) scale(1.12)` },
        { transform: `rotate(${dir * 240}deg) scale(0.94)` },
        { transform: `rotate(${dir * 360}deg) scale(1.05)` },
      ],
      { duration: CFG.suckMs / 4, iterations: Infinity, easing: "ease-in-out" },
    );
  });

  // 2) suck every particle into the hole — each starts a few ms after the last
  //    and spirals around the hole on its way in.
  const suckPromises: Promise<void>[] = particles.map((p, idx) => {
    const delay = Math.min(idx * CFG.staggerStepMs, CFG.maxStaggerMs);
    const anim = p.el.animate(spiralKeyframes(p), {
      duration: CFG.suckMs,
      delay,
      easing: "linear",
      fill: "both",
    });
    return anim.finished.then(() => undefined).catch(() => undefined);
  });

  void Promise.all(suckPromises).then(() => {
    // 3) the hole gulps …
    hole.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.45)", easing: "ease-in" },
        { transform: "scale(0.9)" },
        { transform: "scale(0)", easing: "ease-in" },
      ],
      { duration: CFG.swallowMs + 250, fill: "forwards" },
    );

    // 4) … and everything pops back out and springs to its original spot
    let remaining = particles.length || 1;
    const doneOne = () => {
      remaining -= 1;
      if (remaining === 0) {
        window.setTimeout(() => {
          overlay.remove();
          busy = false;
        }, 350);
      }
    };
    particles.forEach((p, idx) => {
      const delay = Math.min(idx * (CFG.staggerStepMs / 2), 2000);
      const anim = p.el.animate(
        [
          { transform: "translate(0px, 0px) scale(0.02)", filter: "none" },
          { transform: `translate(${(Math.random() - 0.5) * 40}px, ${(Math.random() - 0.5) * 40}px) scale(0.9)`, filter: "blur(0px)", offset: 0.35 },
          { transform: "none", filter: "none", easing: "cubic-bezier(0.22, 1.45, 0.36, 1)" },
        ],
        { duration: CFG.popMs, delay, fill: "both" },
      );
      anim.finished.then(doneOne).catch(doneOne);
    });
  });
}
