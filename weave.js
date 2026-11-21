// Hero illustration of how a run flows: weavers pull a thread from each of the client's systems
// and weave them into one connected map. Where two threads cross, a knot forms; a finding leaves a
// knot along the centre thread, the verifier passes or rejects it, and verified findings land in
// the report. It is a drawing of docs/ARCHITECTURE.md, not data: nothing here is fetched, counted
// or measured.
(() => {
  const box = document.getElementById("weave-viz");
  const canvas = box && box.querySelector("canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  const INK = "#0e1116", PAPER = "246,243,236", MUTED = "201,206,214", AMBER = "255,176,32",
    AMBER_D = "224,146,12", TEAL = "47,208,192", RED = "255,122,126";
  // Positions are fractions of the box, so the HTML labels in index.html line up at any size.
  const SOURCES = [[0.30, 0.11], [0.29, 0.24], [0.28, 0.37], [0.27, 0.50], [0.28, 0.63], [0.29, 0.76], [0.30, 0.89]];
  const HUB = [0.5, 0.5];
  const GATE = 0.72;
  const REPORT = { x: 0.84, y: 0.3, w: 0.13, h: 0.4 };
  const SLOTS = 5;
  // The woven map: a diamond. Threads from the upper systems run one way, from the lower systems the
  // other way, and the middle system's thread runs straight through and on to the verifier.
  const LANES = [0.25, 0.5, 0.75];
  const THREADS = [
    { source: 0, kind: "u", at: LANES[2] }, { source: 1, kind: "u", at: LANES[1] }, { source: 2, kind: "u", at: LANES[0] },
    { source: 3, kind: "spine" },
    { source: 4, kind: "v", at: LANES[0] }, { source: 5, kind: "v", at: LANES[1] }, { source: 6, kind: "v", at: LANES[2] },
  ];

  // The solid weaver from the brand kit, in its 100 x 100 box. Its feet hold the thread at (50, 88).
  const BIRD = {
    tail: new Path2D("M40 63 C 32 62 23 62 15 64 C 11 66 11 70 14 72 C 10 75 11 79 15 80 C 13 84 16 87 20 86 C 28 82 35 77 41 72 Z"),
    body: new Path2D("M58 34 C 64 30 70 29 76 31 C 82 33 86 38 86 45 C 86 56 78 66 66 70 C 56 73 46 73 38 70 C 32 68 30 63 33 58 C 38 49 47 39 58 34 Z"),
    head: new Path2D("M60 30 C 60 19 68 12 77 12 C 86 12 92 19 91 28 C 90 35 85 40 78 41 C 69 42 60 39 60 30 Z"),
    beak: new Path2D("M85 14.5 C 90 13 95 13.5 100 16.5 C 97 22 92 27.5 87 31 C 88 25 87.5 19.5 85 14.5 Z"),
    wing: new Path2D("M64 40 C 58 26 50 14 36 4 C 31 6 30 11 32 15 C 26 16 24 22 27 26 C 21 28 21 34 25 37 C 21 41 23 46 28 47 C 34 49 46 49 54 47 C 59 46 62 43 64 40 Z"),
    legs: new Path2D("M56 71 L 47.5 88 M 61 70 L 53.5 89"),
  };

  let W = 0, H = 0, M = 0, S = 0, time = 0, nextFinding = 2.5, reportClear = 0, cycleEnd = 0, fadeOut = 0;
  let threads = [], findings = [], lines = [];
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ease = (u) => u * u * (3 - 2 * u);
  const clamp = (u) => Math.max(0, Math.min(1, u));
  const dot = (x, y, r, rgb, alpha) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.fill();
  };

  // Diamond corners and a point inside it from square coordinates (u, v), both 0..1.
  const corners = () => {
    const cx = HUB[0] * W, cy = HUB[1] * H;
    return { L: [cx - S, cy], T: [cx, cy - S], B: [cx, cy + S], R: [cx + S, cy] };
  };
  const inDiamond = (u, v) => {
    const { L, T, B } = corners();
    return [L[0] + u * (T[0] - L[0]) + v * (B[0] - L[0]), L[1] + u * (T[1] - L[1]) + v * (B[1] - L[1])];
  };
  // Each thread's route: from its system, a curve to where it enters the map, then across the map.
  function route(thread) {
    const [sx, sy] = SOURCES[thread.source];
    const start = [sx * W + M * 0.03, sy * H];
    let enter, leave;
    if (thread.kind === "u") { enter = inDiamond(thread.at, 0); leave = inDiamond(thread.at, 1); }
    else if (thread.kind === "v") { enter = inDiamond(0, thread.at); leave = inDiamond(1, thread.at); }
    else { const { L, R } = corners(); enter = L; leave = R; }
    return { start, enter, leave };
  }
  // A point along the route: the first 55% of the way is the curve in, the rest is the run across.
  const SPLIT = 0.55;
  function along(thread, p) {
    const { start, enter, leave } = route(thread);
    if (p <= SPLIT) {
      const u = p / SPLIT, v = 1 - u;
      const cx = (start[0] + enter[0]) / 2, cy = start[1] + (enter[1] - start[1]) * 0.15;
      return [v * v * start[0] + 2 * v * u * cx + u * u * enter[0], v * v * start[1] + 2 * v * u * cy + u * u * enter[1]];
    }
    const u = (p - SPLIT) / (1 - SPLIT);
    return [enter[0] + (leave[0] - enter[0]) * u, enter[1] + (leave[1] - enter[1]) * u];
  }

  function startCycle() {
    threads = THREADS.map((t, i) => ({ ...t, p: 0, delay: 0.25 + i * 0.55 + random() * 0.3, speed: 0.17 + random() * 0.05, flap: random() * 6, done: false, tied: 0 }));
    cycleEnd = 0;
    fadeOut = 0;
  }

  // Knots: every crossing of an upper thread with a lower thread, once both are woven.
  function knots() {
    const out = [];
    for (const a of threads) if (a.kind === "u" && a.done)
      for (const b of threads) if (b.kind === "v" && b.done) out.push({ at: inDiamond(a.at, b.at), born: Math.max(a.tied, b.tied) });
    return out;
  }

  function slot(index) {
    return [(REPORT.x + 0.025) * W, (REPORT.y + 0.07 + index * 0.066) * H];
  }

  function step(dt) {
    time += dt;
    for (const t of threads) {
      if (t.done) continue;
      if (t.delay > 0) { t.delay -= dt; continue; }
      t.p = Math.min(1, t.p + dt * t.speed);
      if (t.p >= 1) { t.done = true; t.tied = time; }
    }
    const woven = threads.every((t) => t.done);
    if (woven && !cycleEnd) cycleEnd = time + 9;
    if (cycleEnd && time >= cycleEnd) {
      fadeOut = Math.min(1, fadeOut + dt / 0.8);
      if (fadeOut >= 1) startCycle();
    }

    // Findings leave a knot and follow the centre thread to the verifier.
    const ks = knots().filter((k) => time - k.born > 0.6);
    const spine = threads.find((t) => t.kind === "spine");
    const waiting = findings.filter((f) => f.state !== "reject").length + lines.length;
    if (ks.length && spine.done && !fadeOut && time >= nextFinding && !reportClear && waiting < SLOTS) {
      nextFinding = time + 1.2 + random() * 0.7;
      const k = ks[Math.floor(random() * ks.length)];
      findings.push({ state: "fly", u: 0, from: k.at, gateY: 0.4 + random() * 0.2, pass: random() > 0.3, x: k.at[0], y: k.at[1], trail: [] });
    }
    const { R } = corners();
    for (const f of findings) {
      f.trail.push([f.x, f.y]);
      if (f.trail.length > 12) f.trail.shift();
      const gateX = GATE * W, gateY = f.gateY * H;
      if (f.state === "fly") {
        f.u += dt / 1.3;
        const u = ease(Math.min(f.u, 1));
        // To the right-hand corner of the map, then out along the thread to the verifier.
        if (u < 0.5) { const w = u / 0.5; f.x = f.from[0] + (R[0] - f.from[0]) * w; f.y = f.from[1] + (R[1] - f.from[1]) * w; }
        else { const w = (u - 0.5) / 0.5; f.x = R[0] + (gateX - R[0]) * w; f.y = R[1] + (gateY - R[1]) * w; }
        if (f.u >= 1) { f.state = "check"; f.u = 0; }
      } else if (f.state === "check") {
        f.u += dt / 0.7;
        if (f.u >= 1) {
          f.state = f.pass ? "pass" : "reject";
          f.u = 0;
          if (f.pass) f.slot = lines.length + findings.filter((o) => o.state === "pass" && o !== f).length;
        }
      } else if (f.state === "pass") {
        f.u += dt / 0.8;
        const u = ease(Math.min(f.u, 1)), to = slot(f.slot);
        f.x = gateX + (to[0] - gateX) * u;
        f.y = gateY + (to[1] - gateY) * u;
        if (f.u >= 1) { f.done = true; lines.push({ born: time }); }
      } else {
        f.u += dt / 1.3;
        f.y = gateY + ease(Math.min(f.u, 1)) * H * 0.1;
        if (f.u >= 1) f.done = true;
      }
    }
    findings = findings.filter((f) => !f.done);

    // A full page clears and the report starts again.
    if (lines.length >= SLOTS && !reportClear) reportClear = time + 2.2;
    if (reportClear && time >= reportClear) { lines = []; reportClear = 0; nextFinding = time + 0.5; }
  }

  // One thread, from its system to p along its route; dim where it is not yet pulled.
  function strokeRoute(thread, from, to, rgb, alpha, width) {
    ctx.beginPath();
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const [x, y] = along(thread, from + (to - from) * (i / n));
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawBird(x, y, angle, flap, alpha) {
    const size = M * 0.068 / 100;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(size, size);
    ctx.translate(-50, -88);
    ctx.fillStyle = `rgb(${AMBER})`;
    ctx.strokeStyle = `rgb(${AMBER_D})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke(BIRD.legs);
    for (const part of ["tail", "body", "head", "beak"]) ctx.fill(BIRD[part]);
    // The wing beats from the shoulder.
    ctx.save();
    ctx.translate(60, 44);
    ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(flap)));
    ctx.translate(-60, -44);
    ctx.fill(BIRD.wing);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(82, 22, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const fade = 1 - fadeOut;
    const { L, T, B, R } = corners();

    // Systems.
    SOURCES.forEach(([sx, sy]) => {
      const x = sx * W, y = sy * H;
      ctx.beginPath();
      ctx.arc(x, y, M * 0.024, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${MUTED},.55)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      dot(x, y, M * 0.008, PAPER, 0.9);
    });

    // The outline of the map, faint, so the pattern has somewhere to grow into.
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]); ctx.lineTo(T[0], T[1]); ctx.lineTo(R[0], R[1]); ctx.lineTo(B[0], B[1]); ctx.closePath();
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = `rgba(${MUTED},.22)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Every thread's full route, dim; then the part already pulled, bright.
    const width = Math.max(1.4, M * 0.0052);
    for (const t of threads) strokeRoute(t, 0, 1, MUTED, 0.1 * fade, 1);
    // Lower threads first, then upper threads, with a gap where an upper thread passes over: woven.
    const order = [...threads.filter((t) => t.kind === "v"), threads.find((t) => t.kind === "spine"), ...threads.filter((t) => t.kind === "u")];
    for (const t of order) {
      if (t.p <= 0) continue;
      if (t.kind === "u" && t.p > SPLIT) {
        // An ink outline under the upper thread cuts a gap in whatever it crosses.
        strokeRoute(t, SPLIT, t.p, "14,17,22", fade, width + 3);
      }
      strokeRoute(t, 0, t.p, PAPER, (t.done ? 0.85 : 0.75) * fade, width);
    }
      // The upper threads pass under every second lower thread: redraw those crossings on top.
    for (const b of threads) if (b.kind === "v" && b.p > SPLIT) {
      const reach = (b.p - SPLIT) / (1 - SPLIT);
      LANES.forEach((uAt, i) => {
        const a = threads.find((t) => t.kind === "u" && t.at === uAt);
        if ((LANES.indexOf(b.at) + i) % 2 || reach < uAt || !a || a.p < SPLIT + (1 - SPLIT) * b.at) return;
        // Short segment of the lower thread over the crossing, outlined in ink.
        const [x1, y1] = inDiamond(uAt - 0.07, b.at), [x2, y2] = inDiamond(uAt + 0.07, b.at);
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = INK; ctx.lineWidth = width + 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${PAPER},${0.85 * fade})`; ctx.lineWidth = width; ctx.stroke();
      });
    }

    // Knots where two woven threads cross.
    for (const k of knots()) {
      const grow = clamp((time - k.born) / 0.35);
      dot(k.at[0], k.at[1], M * 0.0095 * grow, AMBER, fade);
    }

    // The centre thread carries on to the verifier once it is woven.
    const spine = threads.find((t) => t.kind === "spine");
    if (spine && spine.done) {
      const reach = clamp((time - spine.tied) / 0.6);
      ctx.beginPath();
      ctx.moveTo(R[0], R[1]);
      ctx.lineTo(R[0] + (GATE * W - R[0]) * reach, R[1]);
      ctx.strokeStyle = `rgba(${PAPER},${0.35 * fade})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // The weavers: one on the end of every thread still being pulled.
    for (const t of threads) {
      if (t.done || t.p <= 0) continue;
      const [x, y] = along(t, t.p);
      const [px, py] = along(t, Math.max(0, t.p - 0.02));
      const heading = Math.atan2(y - py, x - px);
      // The bird leans into its heading but never past level-ish or a steep climb: it always flies right.
      const angle = Math.max(-0.7, Math.min(0.35, heading)) * 0.6;
      drawBird(x, y, angle, time * 9 + t.flap, fade * clamp(t.p * 12));
    }

    // The verifier: a line every finding has to cross.
    ctx.beginPath();
    ctx.setLineDash([4, 6]);
    ctx.moveTo(GATE * W, H * 0.19);
    ctx.lineTo(GATE * W, H * 0.81);
    ctx.strokeStyle = `rgba(${TEAL},.75)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // The report page and the verified lines in it.
    const pageFade = reportClear ? Math.max(0, Math.min(1, (reportClear - time) / 0.6)) : 1;
    ctx.beginPath();
    ctx.roundRect(REPORT.x * W, REPORT.y * H, REPORT.w * W, REPORT.h * H, 6);
    ctx.strokeStyle = `rgba(${MUTED},.7)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    lines.forEach((line, index) => {
      const [x, y] = slot(index);
      const grow = Math.min(1, (time - line.born) / 0.4);
      dot(x, y, 2.6, TEAL, pageFade);
      ctx.beginPath();
      ctx.moveTo(x + 7, y);
      ctx.lineTo(x + 7 + (REPORT.w * W - 0.05 * W - 7) * grow * (index % 2 ? 0.7 : 1), y);
      ctx.strokeStyle = `rgba(${MUTED},${0.6 * pageFade})`;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    for (const f of findings) {
      const rgb = f.state === "pass" ? TEAL : f.state === "reject" ? RED : AMBER;
      const alpha = f.state === "reject" ? 1 - f.u : 1;
      f.trail.forEach(([x, y], index) => dot(x, y, 1.6, rgb, 0.03 * index * alpha));
      if (f.state === "check") {
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4 + f.u * 9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${TEAL},${0.8 * (1 - f.u)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      dot(f.x, f.y, 3.4, rgb, alpha);
    }
  }

  function measure() {
    W = box.clientWidth;
    H = box.clientHeight;
    M = Math.min(W, H);
    S = M * 0.175;
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    measure();
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  let frame = 0, last = 0, visible = true;
  function tick(now) {
    frame = 0;
    // The first frame after a pause only sets the clock; a frame stamp can also sit before the last one.
    if (last) step(Math.max(0, Math.min((now - last) / 1000, 0.05)));
    last = now;
    draw();
    run();
  }
  function run() {
    if (frame) return;
    if (reduce.matches || document.hidden || !visible) { last = 0; return; }
    frame = requestAnimationFrame(tick);
  }

  // Start from a settled state where the map is woven and findings are moving, and paint it once,
  // so the picture is complete with reduced motion, in a background tab, or if no frame ever runs.
  measure();
  startCycle();
  for (let i = 0; i < 900 && !(cycleEnd && time > cycleEnd - 4); i++) step(0.016);
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; run(); }).observe(box);
  }
  document.addEventListener("visibilitychange", run);
  reduce.addEventListener("change", run);
  run();
})();
