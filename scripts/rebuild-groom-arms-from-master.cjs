/**
 * Rebuild groom animation layers from ONE clean master.
 *
 * Rules:
 * - Clean master silhouette is the only visual source
 * - Exclusive partition: every opaque master pixel → exactly one primary layer
 * - Underlaps are morphological dilations (stay connected to the part)
 * - Legs never receive jacket pixels (avoids double-hem when torso breathes)
 * - Torso receives a small trousers tuck under the hem instead
 * - No CSS hiding — floaters removed from PNGs
 *
 * Run: node scripts/rebuild-groom-arms-from-master.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 720;
const H = 1380;
const ROOT = path.join(__dirname, "../public/assets/kiss-cam");
const DIR = path.join(ROOT, "groom");
const MASTER_PLACED = path.join(ROOT, "masters/groom-master-placed.png");
const MASTER_CLEAN = path.join(ROOT, "masters/groom-master-clean.png");
const JOINTS_PATH = path.join(ROOT, "masters/joints.json");
const QC = "/opt/cursor/artifacts/kiss-cam-redesign";

/** Jacket bottom edge (inclusive) — measured from master hem peak */
const JACKET_HEM_Y = 604;
const ARM_UNDERLAP = 12;
const HEM_TUCK = 10; // trousers pixels copied onto torso under hem

const LAYERS = [
  "shoes",
  "legs",
  "left-upper-arm",
  "right-upper-arm",
  "left-forearm",
  "right-forearm",
  "left-hand",
  "right-hand",
  "torso",
  "head",
  "hair",
];

function idx(x, y) {
  return (y * W + x) * 4;
}
function opaque(d, x, y, t = 8) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return d[idx(x, y) + 3] > t;
}
function copyPx(dst, src, x, y) {
  const k = idx(x, y);
  dst[k] = src[k];
  dst[k + 1] = src[k + 1];
  dst[k + 2] = src[k + 2];
  dst[k + 3] = src[k + 3];
}
function clearPx(d, x, y) {
  const k = idx(x, y);
  d[k] = d[k + 1] = d[k + 2] = d[k + 3] = 0;
}
function blank() {
  return Buffer.alloc(W * H * 4);
}

async function loadRaw(p) {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`bad size ${p}: ${info.width}x${info.height}`);
  return Buffer.from(data);
}
async function savePng(filePath, buf) {
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(filePath);
}

function keepLargest(layer, keepN = 1) {
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (seen[p] || !opaque(layer, x, y)) continue;
      const stack = [[x, y]];
      seen[p] = 1;
      const pixels = [];
      while (stack.length) {
        const [sx, sy] = stack.pop();
        pixels.push([sx, sy]);
        for (const [nx, ny] of [
          [sx + 1, sy],
          [sx - 1, sy],
          [sx, sy + 1],
          [sx, sy - 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (seen[q] || !opaque(layer, nx, ny)) continue;
          seen[q] = 1;
          stack.push([nx, ny]);
        }
      }
      comps.push(pixels);
    }
  }
  comps.sort((a, b) => b.length - a.length);
  const keep = new Set();
  for (let i = 0; i < Math.min(keepN, comps.length); i++) {
    for (const [x, y] of comps[i]) keep.add(y * W + x);
  }
  let removed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!opaque(layer, x, y)) continue;
      if (!keep.has(y * W + x)) {
        clearPx(layer, x, y);
        removed++;
      }
    }
  }
  return { comps: comps.length, kept: Math.min(keepN, comps.length), removed, sizes: comps.slice(0, 5).map((c) => c.length) };
}

function countComps(layer) {
  const seen = new Uint8Array(W * H);
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (seen[p] || !opaque(layer, x, y)) continue;
      n++;
      const stack = [[x, y]];
      seen[p] = 1;
      while (stack.length) {
        const [sx, sy] = stack.pop();
        for (const [nx, ny] of [
          [sx + 1, sy],
          [sx - 1, sy],
          [sx, sy + 1],
          [sx, sy - 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (seen[q] || !opaque(layer, nx, ny)) continue;
          seen[q] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return n;
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * Exclusive classification from the approved master silhouette.
 * Priority order matters for overlapping corridors.
 */
function classify(x, y, master) {
  const k = idx(x, y);
  const r = master[k];
  const g = master[k + 1];
  const b = master[k + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const isSkin = r > 155 && g > 105 && b > 85 && lum > 125 && r > b + 15;

  // Shoes first (complete toes)
  if (y >= 995 && y <= 1088) {
    if (x >= 198 && x <= 300) return "shoes";
    if (x >= 410 && x <= 514) return "shoes";
  }

  // Hands (complete fingers) — before forearms
  if (y >= 500 && y <= 610) {
    if (x >= 40 && x <= 155 && (isSkin || inEllipse(x, y, 98, 547, 58, 52))) return "left-hand";
    if (x >= 565 && x <= 680 && (isSkin || inEllipse(x, y, 623, 547, 58, 52))) return "right-hand";
  }

  // Forearms
  if (y >= 400 && y <= 545) {
    if (x >= 95 && x <= 255 && x < 280) {
      if (!(x < 150 && y >= 515 && isSkin)) return "left-forearm";
    }
    if (x >= 465 && x <= 630 && x > 440) {
      if (!(x > 570 && y >= 515 && isSkin)) return "right-forearm";
    }
  }

  // Upper arms / sleeves — outer corridors (full shoulder cap owned by arm)
  if (y >= 245 && y <= 450) {
    if (x >= 175 && x <= 292) return "left-upper-arm";
    if (x >= 428 && x <= 545) return "right-upper-arm";
  }

  // Hair / head
  if (y >= 70 && y <= 270 && x >= 300 && x <= 420) {
    if (y <= 200 && (lum < 100 || y < 130)) return "hair";
    if (isSkin || lum > 95 || inEllipse(x, y, 360, 165, 58, 100)) return "head";
    if (y < 210) return lum < 110 ? "hair" : "head";
  }

  // Legs: strictly below jacket hem — never jacket
  if (y > JACKET_HEM_Y && y < 1045 && x >= 230 && x <= 490) return "legs";

  // Torso / jacket: includes hem row
  if (y >= 210 && y <= JACKET_HEM_Y && x >= 240 && x <= 480) return "torso";

  // Fallbacks (still exclusive)
  if (y > JACKET_HEM_Y) {
    if (y >= 990) return "shoes";
    return "legs";
  }
  if (y < 220 && x >= 290 && x <= 430) return lum < 100 ? "hair" : "head";
  if (x < 360) {
    if (y > 500) return isSkin ? "left-hand" : "left-forearm";
    if (y > 300) return "left-upper-arm";
  } else {
    if (y > 500) return isSkin ? "right-hand" : "right-forearm";
    if (y > 300) return "right-upper-arm";
  }
  return "torso";
}

/**
 * Morphological underlap: dilate `dst` into pixels owned by `srcMask` within radius.
 * Copies master pixels so seams stay covered and underlap stays connected to dst.
 */
function dilateUnderlap(dst, master, srcMask, radius) {
  const add = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!opaque(srcMask, x, y)) continue;
      if (opaque(dst, x, y)) continue;
      if (!opaque(master, x, y)) continue;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          if (opaque(dst, x + dx, y + dy)) {
            near = true;
            break;
          }
        }
      }
      if (near) add.push([x, y]);
    }
  }
  for (const [x, y] of add) copyPx(dst, master, x, y);
  return add.length;
}

/**
 * Hem tuck: copy trousers pixels (legs exclusive) onto torso near the hem,
 * so breathing/lean never exposes a jacket strip sitting on the legs layer.
 */
function tuckTrousersUnderHem(torso, legs, master, pixelsUp) {
  let n = 0;
  for (let y = JACKET_HEM_Y + 1; y <= JACKET_HEM_Y + pixelsUp; y++) {
    for (let x = 230; x <= 490; x++) {
      if (!opaque(legs, x, y)) continue;
      if (!opaque(master, x, y)) continue;
      // Only tuck if directly under an opaque torso hem pixel above
      let under = false;
      for (let yy = JACKET_HEM_Y; yy >= JACKET_HEM_Y - 6; yy--) {
        if (opaque(torso, x, yy)) {
          under = true;
          break;
        }
      }
      if (under) {
        copyPx(torso, master, x, y);
        n++;
      }
    }
  }
  return n;
}

function centroid(pred) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pred(x, y)) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  return n ? { x: Math.round(sx / n), y: Math.round(sy / n), n } : { x: 0, y: 0, n: 0 };
}

function overlapCentroid(a, b, yMax) {
  return centroid((x, y) => {
    if (yMax != null && y > yMax) return false;
    return opaque(a, x, y, 40) && opaque(b, x, y, 40);
  });
}

async function checkerExport(name, buf) {
  const vis = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const c = ((x >> 4) ^ (y >> 4)) & 1 ? 210 : 170;
      if (buf[k + 3] > 8) {
        vis[k] = buf[k];
        vis[k + 1] = buf[k + 1];
        vis[k + 2] = buf[k + 2];
        vis[k + 3] = 255;
      } else {
        vis[k] = vis[k + 1] = vis[k + 2] = c;
        vis[k + 3] = 255;
      }
    }
  }
  await savePng(path.join(QC, `CHECKER-${name}.png`), vis);
}

function fillHolesFromNearest(layers, master) {
  const owner = new Int8Array(W * H);
  owner.fill(-1);
  const covered = new Uint8Array(W * H);
  for (let li = 0; li < LAYERS.length; li++) {
    const d = layers[LAYERS[li]];
    for (let i = 0; i < W * H; i++) {
      if (d[i * 4 + 3] > 8) {
        covered[i] = 1;
        owner[i] = li;
      }
    }
  }
  const dist = new Int32Array(W * H);
  dist.fill(1e9);
  const q = [];
  for (let i = 0; i < W * H; i++) {
    if (covered[i]) {
      dist[i] = 0;
      q.push(i);
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % W;
    const y = (i / W) | 0;
    const d0 = dist[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (master[ni * 4 + 3] <= 8) continue;
      if (dist[ni] <= d0 + 1) continue;
      dist[ni] = d0 + 1;
      owner[ni] = owner[i];
      q.push(ni);
    }
  }
  let filled = 0;
  for (let i = 0; i < W * H; i++) {
    if (master[i * 4 + 3] > 8 && !covered[i] && owner[i] >= 0) {
      const n = LAYERS[owner[i]];
      const k = i * 4;
      layers[n][k] = master[k];
      layers[n][k + 1] = master[k + 1];
      layers[n][k + 2] = master[k + 2];
      layers[n][k + 3] = master[k + 3];
      filled++;
    }
  }
  // strip extras outside master
  let removed = 0;
  for (const n of LAYERS) {
    const d = layers[n];
    for (let i = 0; i < W * H; i++) {
      if (d[i * 4 + 3] > 0 && master[i * 4 + 3] <= 8) {
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = d[i * 4 + 3] = 0;
        removed++;
      }
    }
  }
  return { filled, removed };
}

async function main() {
  fs.mkdirSync(QC, { recursive: true });
  fs.mkdirSync(DIR, { recursive: true });

  // 1) Clean master
  const master = await loadRaw(MASTER_PLACED);
  const clean = Buffer.from(master);
  console.log("master scrub", keepLargest(clean, 1));
  await savePng(MASTER_CLEAN, clean);

  // 2) Exclusive partition
  const buckets = Object.fromEntries(LAYERS.map((n) => [n, blank()]));
  let assigned = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!opaque(clean, x, y)) continue;
      copyPx(buckets[classify(x, y, clean)], clean, x, y);
      assigned++;
    }
  }
  console.log("assigned", assigned);

  // 3) Connected underlaps (arms) — dilate child into parent
  console.log("UL LU←LF", dilateUnderlap(buckets["left-upper-arm"], clean, buckets["left-forearm"], ARM_UNDERLAP));
  console.log("UL RU←RF", dilateUnderlap(buckets["right-upper-arm"], clean, buckets["right-forearm"], ARM_UNDERLAP));
  console.log("UL LF←LH", dilateUnderlap(buckets["left-forearm"], clean, buckets["left-hand"], ARM_UNDERLAP));
  console.log("UL RF←RH", dilateUnderlap(buckets["right-forearm"], clean, buckets["right-hand"], ARM_UNDERLAP));
  // Sleeve roots tuck under jacket (arm dilates into torso pixels near seam)
  console.log("UL LU←torso", dilateUnderlap(buckets["left-upper-arm"], clean, buckets.torso, 10));
  console.log("UL RU←torso", dilateUnderlap(buckets["right-upper-arm"], clean, buckets.torso, 10));
  // CRITICAL: trousers tuck onto torso — NEVER copy jacket onto legs
  console.log("hem tuck torso←legs", tuckTrousersUnderHem(buckets.torso, buckets.legs, clean, HEM_TUCK));

  // 4) Fill any exclusive holes, strip extras — do NOT keepLargest after this
  console.log("hole fill", fillHolesFromNearest(buckets, clean));

  // 5) Scrub floaters on each layer (keepLargest) then refill holes once
  for (const n of LAYERS) {
    const keepN = n === "shoes" ? 2 : 1;
    console.log("scrub", n, keepLargest(buckets[n], keepN));
  }
  console.log("refill after scrub", fillHolesFromNearest(buckets, clean));
  // Second scrub only removes true floaters created outside master (already stripped)
  for (const n of LAYERS) {
    const keepN = n === "shoes" ? 2 : 1;
    const r = keepLargest(buckets[n], keepN);
    if (r.removed) console.log("rescub", n, r);
  }
  console.log("final refill", fillHolesFromNearest(buckets, clean));

  // 6) Save
  for (const n of LAYERS) {
    await savePng(path.join(DIR, `${n}.png`), buckets[n]);
    await checkerExport(n, buckets[n]);
  }

  // 7) Validate
  let holes = 0;
  let extras = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = opaque(clean, x, y);
      let any = false;
      for (const n of LAYERS) {
        if (opaque(buckets[n], x, y)) {
          any = true;
          break;
        }
      }
      if (m && !any) holes++;
      if (!m && any) extras++;
    }
  }
  const ccs = Object.fromEntries(LAYERS.map((n) => [n, countComps(buckets[n])]));
  console.log("FINAL holes/extras", holes, extras);
  console.log("CC", ccs);

  // Assert: legs must not own jacket-row pixels (y <= hem)
  let legsJacketBleed = 0;
  for (let y = 0; y <= JACKET_HEM_Y; y++) {
    for (let x = 0; x < W; x++) {
      if (opaque(buckets.legs, x, y)) legsJacketBleed++;
    }
  }
  console.log("legsJacketBleed", legsJacketBleed);

  // 8) Static composite on checker
  const order = [
    "shoes",
    "legs",
    "left-upper-arm",
    "right-upper-arm",
    "left-forearm",
    "right-forearm",
    "left-hand",
    "right-hand",
    "torso",
    "head",
    "hair",
  ];
  const comp = blank();
  for (const n of order) {
    const d = buckets[n];
    for (let i = 0; i < comp.length; i += 4) {
      const aa = d[i + 3] / 255;
      if (aa <= 0) continue;
      const ca = comp[i + 3] / 255;
      const outA = aa + ca * (1 - aa);
      for (let c = 0; c < 3; c++) {
        comp[i + c] = outA > 0 ? Math.round((d[i + c] * aa + comp[i + c] * ca * (1 - aa)) / outA) : 0;
      }
      comp[i + 3] = Math.round(outA * 255);
    }
  }
  const checker = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = idx(x, y);
      const bg = ((x >> 4) ^ (y >> 4)) & 1 ? 210 : 160;
      const al = comp[k + 3] / 255;
      checker[k] = Math.round(comp[k] * al + bg * (1 - al));
      checker[k + 1] = Math.round(comp[k + 1] * al + bg * (1 - al));
      checker[k + 2] = Math.round(comp[k + 2] * al + bg * (1 - al));
      checker[k + 3] = 255;
    }
  }
  await savePng(path.join(QC, "STATIC-FINAL-full.png"), comp);
  await savePng(path.join(QC, "STATIC-FINAL-checker.png"), checker);
  const crops = {
    shoulders: { left: 200, top: 220, width: 320, height: 120 },
    hem: { left: 240, top: 560, width: 240, height: 100 },
    hands: { left: 40, top: 480, width: 640, height: 120 },
    shoes: { left: 180, top: 960, width: 360, height: 150 },
    full: { left: 40, top: 60, width: 640, height: 1060 },
  };
  for (const [name, r] of Object.entries(crops)) {
    await sharp(checker, { raw: { width: W, height: H, channels: 4 } })
      .extract(r)
      .png()
      .toFile(path.join(QC, `STATIC-CROP-${name}.png`));
  }
  // Per-layer hem/shoulder for audit
  for (const n of ["torso", "legs", "left-upper-arm", "right-upper-arm"]) {
    await checkerExport(`audit-${n}`, buckets[n]);
  }

  // 9) Joints
  const lu = buckets["left-upper-arm"];
  const ru = buckets["right-upper-arm"];
  const lf = buckets["left-forearm"];
  const rf = buckets["right-forearm"];
  const lh = buckets["left-hand"];
  const rh = buckets["right-hand"];
  const torso = buckets.torso;
  let lSh = overlapCentroid(lu, torso, 300);
  let rSh = overlapCentroid(ru, torso, 300);
  if (lSh.n < 30) lSh = centroid((x, y) => opaque(lu, x, y, 40) && y < 280);
  if (rSh.n < 30) rSh = centroid((x, y) => opaque(ru, x, y, 40) && y < 280);
  const lEl = overlapCentroid(lu, lf);
  const rEl = overlapCentroid(ru, rf);
  const lWr = overlapCentroid(lf, lh);
  const rWr = overlapCentroid(rf, rh);
  const hl = centroid((x, y) => opaque(lh, x, y, 40));
  const hr = centroid((x, y) => opaque(rh, x, y, 40));
  const joints = {
    leftShoulder: { x: lSh.x, y: lSh.y },
    leftElbow: { x: lEl.x, y: lEl.y },
    leftWrist: { x: lWr.x, y: lWr.y },
    rightShoulder: { x: rSh.x, y: rSh.y },
    rightElbow: { x: rEl.x, y: rEl.y },
    rightWrist: { x: rWr.x, y: rWr.y },
    handRest: { left: { x: hl.x, y: hl.y }, right: { x: hr.x, y: hr.y } },
    innerHold: { x: hr.x + 35, y: hr.y },
  };
  console.log("joints", JSON.stringify(joints, null, 2));
  if (fs.existsSync(JOINTS_PATH)) {
    const all = JSON.parse(fs.readFileSync(JOINTS_PATH, "utf8"));
    Object.assign(all.groom, {
      leftShoulder: joints.leftShoulder,
      leftElbow: joints.leftElbow,
      leftWrist: joints.leftWrist,
      rightShoulder: joints.rightShoulder,
      rightElbow: joints.rightElbow,
      rightWrist: joints.rightWrist,
      handRest: joints.handRest,
      innerHandHold: joints.innerHold,
      holdHandTarget: joints.innerHold,
    });
    fs.writeFileSync(JOINTS_PATH, JSON.stringify(all, null, 2) + "\n");
  } else {
    fs.writeFileSync(
      JOINTS_PATH,
      JSON.stringify({ canvas: { w: W, h: H }, groom: joints }, null, 2) + "\n"
    );
  }

  if (holes > 0 || extras > 0 || legsJacketBleed > 0) {
    const err = new Error(`validation failed holes=${holes} extras=${extras} legsJacketBleed=${legsJacketBleed}`);
    err.result = { holes, extras, legsJacketBleed, ccs, joints };
    throw err;
  }
  return { holes, extras, legsJacketBleed, ccs, joints };
}

main()
  .then((r) => {
    console.log("DONE", r);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
