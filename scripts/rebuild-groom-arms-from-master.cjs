/**
 * Clean rebuild of ALL groom puppet layers from groom-master-placed.png.
 *
 * Rules:
 * - Every opaque pixel comes from the master (one art style)
 * - Each layer keeps only its intended body-part connected component(s)
 * - No floating fragments, no cross-layer garbage
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
const MASTER = path.join(ROOT, "masters/groom-master-placed.png");
const JOINTS_PATH = path.join(ROOT, "masters/joints.json");

function idx(x, y) {
  return (y * W + x) * 4;
}
function alpha(d, x, y, t = 40) {
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

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let j = 0, k = poly.length - 1; j < poly.length; k = j++) {
    const xi = poly[j][0];
    const yi = poly[j][1];
    const xk = poly[k][0];
    const yk = poly[k][1];
    const intersect = yi > y !== yk > y && x < ((xk - xi) * (y - yi)) / (yk - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

async function loadRaw(p) {
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`bad size ${p}`);
  return Buffer.from(data);
}
async function savePng(name, buf) {
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, name));
}

/** Keep the N largest 4-connected opaque components; wipe the rest. */
function keepLargestComponents(layer, keepN = 1, minSize = 30) {
  const opaque = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(layer, x, y)) opaque[y * W + x] = 1;
    }
  }
  const seen = new Uint8Array(W * H);
  const comps = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!opaque[p] || seen[p]) continue;
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
          if (!opaque[q] || seen[q]) continue;
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
    if (comps[i].length >= minSize) {
      for (const [x, y] of comps[i]) keep.add(y * W + x);
    }
  }
  let removed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(layer, x, y)) continue;
      if (!keep.has(y * W + x)) {
        clearPx(layer, x, y);
        removed++;
      }
    }
  }
  return { comps: comps.length, kept: Math.min(keepN, comps.length), removed, sizes: comps.slice(0, 6).map((c) => c.length) };
}

function cutMask(master, pred) {
  const out = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(master, x, y) && pred(x, y)) copyPx(out, master, x, y);
    }
  }
  return out;
}

function dilateIntoMaster(layer, master, radius, allow) {
  const src = Buffer.from(layer);
  const out = Buffer.from(layer);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(src, x, y)) continue;
      if (!alpha(master, x, y)) continue;
      if (allow && !allow(x, y)) continue;
      let near = false;
      for (let dy = -radius; dy <= radius && !near; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > radius * radius) continue;
          if (alpha(src, x + dx, y + dy)) {
            near = true;
            break;
          }
        }
      }
      if (near) copyPx(out, master, x, y);
    }
  }
  return out;
}

/** Remove pixels from `base` that also appear in `other`, except a keep-px underlap frontier. */
function subtractKeepingUnderlap(base, other, keep) {
  const out = Buffer.from(base);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(out, x, y) || !alpha(other, x, y)) continue;
      let minD = 999;
      for (let dy = -40; dy <= 40; dy++) {
        for (let dx = -40; dx <= 40; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (!alpha(base, xx, yy)) continue;
          if (alpha(other, xx, yy)) continue;
          minD = Math.min(minD, Math.hypot(dx, dy));
        }
      }
      if (minD > keep) clearPx(out, x, y);
    }
  }
  return out;
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

function measureShoulder(upper, torso, side) {
  let firstVis = null;
  for (let y = 250; y < 420; y++) {
    let c = 0;
    const x0 = side === "L" ? 180 : 360;
    const x1 = side === "L" ? 360 : 540;
    for (let x = x0; x < x1; x++) if (alpha(upper, x, y) && !alpha(torso, x, y)) c++;
    if (c >= 8) {
      firstVis = y;
      break;
    }
  }
  let edgeX = null;
  if (firstVis != null) {
    if (side === "L") {
      for (let x = 180; x < 360; x++) if (alpha(torso, x, firstVis)) {
        edgeX = x;
        break;
      }
    } else {
      for (let x = 540; x > 360; x--) if (alpha(torso, x, firstVis)) {
        edgeX = x;
        break;
      }
    }
  }
  const ov = centroid((x, y) => {
    const inSide = side === "L" ? x < 360 : x > 360;
    return (
      inSide &&
      alpha(torso, x, y) &&
      alpha(upper, x, y) &&
      y >= (firstVis || 300) - 15 &&
      y <= (firstVis || 300) + 35
    );
  });
  const cx = ov.n ? ov.x : edgeX || 0;
  const cy = ov.n ? ov.y : firstVis || 0;
  return {
    x: edgeX != null ? Math.round((edgeX + cx) / 2) : cx,
    y: Math.round(((firstVis || cy) + cy) / 2),
    firstVis,
    n: ov.n,
  };
}

function countComps(layer) {
  const opaque = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha(layer, x, y)) opaque[y * W + x] = 1;
  const seen = new Uint8Array(W * H);
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!opaque[p] || seen[p]) continue;
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
          if (!opaque[q] || seen[q]) continue;
          seen[q] = 1;
          stack.push([nx, ny]);
        }
      }
    }
  }
  return n;
}

async function main() {
  const master = await loadRaw(MASTER);
  /** Master jacket hem (peak horizontal edge) */
  const JACKET_HEM_Y = 604;

  // --- Hands (skin ellipses) ---
  let lh = cutMask(master, (x, y) => inEllipse(x, y, 90, 553, 50, 44));
  let rh = cutMask(master, (x, y) => inEllipse(x, y, 630, 553, 50, 44));
  lh = dilateIntoMaster(lh, master, 5, (x, y) => x < 165 && y >= 500 && y <= 615);
  rh = dilateIntoMaster(rh, master, 5, (x, y) => x > 555 && y >= 500 && y <= 615);
  console.log("hand CC", keepLargestComponents(lh, 1), keepLargestComponents(rh, 1));

  // --- Forearms ---
  const L_FORE = [
    [200, 415],
    [245, 410],
    [240, 475],
    [200, 535],
    [135, 550],
    [85, 535],
    [80, 500],
    [125, 455],
    [175, 430],
  ];
  const R_FORE = [
    [520, 415],
    [475, 410],
    [480, 475],
    [520, 535],
    [585, 550],
    [635, 535],
    [640, 500],
    [595, 455],
    [545, 430],
  ];
  let lf = cutMask(master, (x, y) => pointInPoly(x, y, L_FORE));
  let rf = cutMask(master, (x, y) => pointInPoly(x, y, R_FORE));
  lf = dilateIntoMaster(lf, master, 8, (x, y) => x < 275 && y >= 400 && y <= 560);
  rf = dilateIntoMaster(rf, master, 8, (x, y) => x > 445 && y >= 400 && y <= 560);
  // Remove hand pixels from forearm (keep wrist underlap)
  lf = subtractKeepingUnderlap(lf, lh, 18);
  rf = subtractKeepingUnderlap(rf, rh, 18);
  console.log("fore CC", keepLargestComponents(lf, 1), keepLargestComponents(rf, 1));

  // --- Upper arms / sleeves ONLY (no lapel / chest) ---
  const L_UPPER = [
    [200, 270],
    [255, 255],
    [275, 290],
    [270, 360],
    [250, 430],
    [215, 445],
    [185, 400],
    [180, 320],
  ];
  const R_UPPER = [
    [520, 270],
    [465, 255],
    [445, 290],
    [450, 360],
    [470, 430],
    [505, 445],
    [535, 400],
    [540, 320],
  ];
  let lu = cutMask(master, (x, y) => pointInPoly(x, y, L_UPPER));
  let ru = cutMask(master, (x, y) => pointInPoly(x, y, R_UPPER));
  // Dilate only within sleeve corridors — stay away from chest center
  lu = dilateIntoMaster(lu, master, 8, (x, y) => x < 280 && y >= 248 && y <= 455);
  ru = dilateIntoMaster(ru, master, 8, (x, y) => x > 440 && y >= 248 && y <= 455);
  // Strip any chest/lapel bleed (too close to centerline)
  for (let y = 240; y < 420; y++) {
    for (let x = 280; x < 360; x++) if (alpha(lu, x, y)) clearPx(lu, x, y);
    for (let x = 360; x < 440; x++) if (alpha(ru, x, y)) clearPx(ru, x, y);
  }
  lu = subtractKeepingUnderlap(lu, lf, 18);
  ru = subtractKeepingUnderlap(ru, rf, 18);
  console.log("upper CC", keepLargestComponents(lu, 1), keepLargestComponents(ru, 1));

  // --- Legs (trousers only — BELOW jacket hem) ---
  // Legs must not include the jacket hem band.
  const LEGS_POLY = [
    [250, JACKET_HEM_Y + 2],
    [470, JACKET_HEM_Y + 2],
    [485, 700],
    [490, 900],
    [480, 1035],
    [400, 1040],
    [360, 720],
    [320, 1040],
    [240, 1035],
    [230, 900],
    [235, 700],
  ];
  let legs = cutMask(master, (x, y) => y > JACKET_HEM_Y && y <= 1045 && pointInPoly(x, y, LEGS_POLY));
  legs = dilateIntoMaster(legs, master, 5, (x, y) => y > JACKET_HEM_Y && y <= 1045 && x >= 230 && x <= 490);
  // Explicitly strip any jacket-hem row
  for (let y = 0; y <= JACKET_HEM_Y; y++) {
    for (let x = 0; x < W; x++) if (alpha(legs, x, y)) clearPx(legs, x, y);
  }
  console.log("legs CC", keepLargestComponents(legs, 1));

  // --- Shoes (feet only — no floating ankle strips) ---
  let shoes = cutMask(
    master,
    (x, y) => y >= 1000 && y <= 1085 && ((x >= 210 && x <= 305) || (x >= 405 && x <= 510))
  );
  shoes = dilateIntoMaster(shoes, master, 3, (x, y) => y >= 998 && y <= 1088 && x >= 200 && x <= 520);
  // Exclusive: shoes win over legs at foot
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(shoes, x, y) && alpha(legs, x, y)) clearPx(legs, x, y);
    }
  }
  console.log("shoes CC", keepLargestComponents(shoes, 2, 200));
  // Drop any shoe pixels that are thin horizontal fragments above the main shoe mass
  {
    // Find top of each shoe component after keep
    for (let y = 980; y < 1010; y++) {
      for (let x = 200; x < 520; x++) {
        if (!alpha(shoes, x, y)) continue;
        // if this row is sparse (<8 opaque across the shoe) and above 1005, clear
      }
    }
    // Clear shoes above y=1005 if they're isolated from dense shoe body
    for (let y = 980; y < 1005; y++) {
      let row = 0;
      for (let x = 200; x < 520; x++) if (alpha(shoes, x, y)) row++;
      if (row > 0 && row < 12) {
        for (let x = 200; x < 520; x++) if (alpha(shoes, x, y)) clearPx(shoes, x, y);
      }
    }
  }
  console.log("shoes CC after fringe", keepLargestComponents(shoes, 2, 200));
  console.log("legs CC after shoe subtract", keepLargestComponents(legs, 1));

  // --- Head / hair (tight ellipses from existing good layers, re-cut from master) ---
  let head = cutMask(master, (x, y) => inEllipse(x, y, 360, 165, 55, 95) || inEllipse(x, y, 360, 240, 28, 28));
  head = dilateIntoMaster(head, master, 4, (x, y) => x >= 290 && x <= 430 && y >= 70 && y <= 280);
  console.log("head CC", keepLargestComponents(head, 1));

  let hair = cutMask(master, (x, y) => inEllipse(x, y, 360, 120, 58, 55) || (y < 160 && x >= 300 && x <= 420 && alpha(master, x, y) && !alpha(head, x, y)));
  // Prefer: hair = master in hair region minus face skin interior — use existing approach
  hair = cutMask(
    master,
    (x, y) =>
      y >= 70 &&
      y <= 220 &&
      x >= 300 &&
      x <= 420 &&
      alpha(master, x, y) &&
      (inEllipse(x, y, 360, 115, 60, 50) || y < 130)
  );
  // Remove face pixels that are clearly skin (high R) from hair
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(hair, x, y)) continue;
      const k = idx(x, y);
      const r = master[k];
      const g = master[k + 1];
      const b = master[k + 2];
      // skin-ish face interior
      if (r > 170 && g > 120 && b > 100 && y > 120) clearPx(hair, x, y);
    }
  }
  console.log("hair CC", keepLargestComponents(hair, 1));

  // --- Torso / jacket: master minus everything else, then keep largest CC only ---
  let torso = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(master, x, y)) continue;
      if (alpha(head, x, y) || alpha(hair, x, y)) continue;
      if (alpha(lh, x, y) || alpha(rh, x, y)) continue;
      if (alpha(lf, x, y) || alpha(rf, x, y)) continue;
      if (alpha(lu, x, y) || alpha(ru, x, y)) continue;
      if (alpha(legs, x, y) || alpha(shoes, x, y)) continue;
      // Hard reject: never put foot/leg-band leftovers on torso
      if (y > JACKET_HEM_Y) continue;
      if (x < 200 || x > 520) continue;
      copyPx(torso, master, x, y);
    }
  }
  // Ensure jacket body filled (chest poly)
  const TORSO_CORE = [
    [255, 230],
    [465, 230],
    [490, 320],
    [485, 520],
    [470, JACKET_HEM_Y],
    [250, JACKET_HEM_Y],
    [235, 520],
    [230, 320],
  ];
  for (let y = 220; y <= JACKET_HEM_Y; y++) {
    for (let x = 220; x < 500; x++) {
      if (!alpha(master, x, y)) continue;
      if (!pointInPoly(x, y, TORSO_CORE)) continue;
      if (alpha(lu, x, y) || alpha(ru, x, y) || alpha(lf, x, y) || alpha(rf, x, y)) continue;
      if (alpha(head, x, y) || alpha(hair, x, y)) continue;
      if (!alpha(torso, x, y)) copyPx(torso, master, x, y);
    }
  }
  console.log("torso CC before", countComps(torso));
  console.log("torso keep", keepLargestComponents(torso, 1, 5000));

  // Smooth armscye: sleeve on upper, jacket shoulder on torso
  const CAP_TOP = 248;
  const ARMPIT_Y = 360;
  const ARMPIT_INSET = 48;
  function smoothstep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }
  function applyArmscye(upper, side) {
    for (let y = CAP_TOP; y <= 450; y++) {
      let mOuter = null;
      if (side === "L") {
        for (let x = 180; x < 360; x++) if (alpha(master, x, y)) {
          mOuter = x;
          break;
        }
      } else {
        for (let x = 540; x > 360; x--) if (alpha(master, x, y)) {
          mOuter = x;
          break;
        }
      }
      if (mOuter == null) continue;
      const t = smoothstep((y - CAP_TOP) / (ARMPIT_Y - CAP_TOP));
      const inset = Math.round(ARMPIT_INSET * t);
      const torsoEdge = side === "L" ? mOuter + inset : mOuter - inset;

      if (side === "L") {
        for (let x = torsoEdge; x < Math.min(360, torsoEdge + 50); x++) {
          if (alpha(master, x, y) && !alpha(lu, x, y) && !alpha(lf, x, y) && !alpha(lh, x, y)) {
            if (!alpha(torso, x, y)) copyPx(torso, master, x, y);
          }
        }
        for (let x = mOuter; x < torsoEdge; x++) {
          if (alpha(torso, x, y)) clearPx(torso, x, y);
          if (alpha(master, x, y)) copyPx(upper, master, x, y);
        }
        // short underlap under jacket
        for (let x = torsoEdge; x < torsoEdge + 10 && x < 360; x++) {
          if (alpha(master, x, y) && alpha(torso, x, y)) copyPx(upper, master, x, y);
        }
      } else {
        for (let x = torsoEdge; x > Math.max(360, torsoEdge - 50); x--) {
          if (alpha(master, x, y) && !alpha(ru, x, y) && !alpha(rf, x, y) && !alpha(rh, x, y)) {
            if (!alpha(torso, x, y)) copyPx(torso, master, x, y);
          }
        }
        for (let x = torsoEdge + 1; x <= mOuter; x++) {
          if (alpha(torso, x, y)) clearPx(torso, x, y);
          if (alpha(master, x, y)) copyPx(upper, master, x, y);
        }
        for (let x = torsoEdge; x > torsoEdge - 10 && x > 360; x--) {
          if (alpha(master, x, y) && alpha(torso, x, y)) copyPx(upper, master, x, y);
        }
      }
    }
  }
  applyArmscye(lu, "L");
  applyArmscye(ru, "R");

  // Re-separate after armscye
  lf = subtractKeepingUnderlap(lf, lh, 18);
  rf = subtractKeepingUnderlap(rf, rh, 18);
  lu = subtractKeepingUnderlap(lu, lf, 18);
  ru = subtractKeepingUnderlap(ru, rf, 18);

  // Final CC scrub — critical for zero floating fragments
  console.log("FINAL scrub:");
  console.log("  torso", keepLargestComponents(torso, 1, 5000));
  console.log("  lu", keepLargestComponents(lu, 1));
  console.log("  ru", keepLargestComponents(ru, 1));
  console.log("  lf", keepLargestComponents(lf, 1));
  console.log("  rf", keepLargestComponents(rf, 1));
  console.log("  lh", keepLargestComponents(lh, 1));
  console.log("  rh", keepLargestComponents(rh, 1));
  console.log("  legs", keepLargestComponents(legs, 1));
  console.log("  shoes", keepLargestComponents(shoes, 2, 200));
  console.log("  head", keepLargestComponents(head, 1));
  console.log("  hair", keepLargestComponents(hair, 1));

  // Hard safety: wipe torso below jacket hem and outside body column
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(torso, x, y)) continue;
      if (y > JACKET_HEM_Y || x < 220 || x > 500) clearPx(torso, x, y);
    }
  }
  console.log("torso after hem clamp", keepLargestComponents(torso, 1, 5000));

  await savePng("torso.png", torso);
  await savePng("left-upper-arm.png", lu);
  await savePng("right-upper-arm.png", ru);
  await savePng("left-forearm.png", lf);
  await savePng("right-forearm.png", rf);
  await savePng("left-hand.png", lh);
  await savePng("right-hand.png", rh);
  await savePng("legs.png", legs);
  await savePng("shoes.png", shoes);
  await savePng("head.png", head);
  await savePng("hair.png", hair);

  // Joints
  const Lsh = measureShoulder(lu, torso, "L");
  const Rsh = measureShoulder(ru, torso, "R");
  const Lel = centroid((x, y) => alpha(lu, x, y) && alpha(lf, x, y));
  const Rel = centroid((x, y) => alpha(ru, x, y) && alpha(rf, x, y));
  const Lwr = centroid((x, y) => alpha(lf, x, y) && alpha(lh, x, y));
  const Rwr = centroid((x, y) => alpha(rf, x, y) && alpha(rh, x, y));
  const hl = centroid((x, y) => alpha(lh, x, y));
  const hr = centroid((x, y) => alpha(rh, x, y));
  const joints = {
    leftShoulder: { x: Lsh.x, y: Lsh.y },
    leftElbow: { x: Lel.x, y: Lel.y },
    leftWrist: { x: Lwr.x, y: Lwr.y },
    rightShoulder: { x: Rsh.x, y: Rsh.y },
    rightElbow: { x: Rel.x, y: Rel.y },
    rightWrist: { x: Rwr.x, y: Rwr.y },
    handRest: { left: { x: hl.x, y: hl.y }, right: { x: hr.x, y: hr.y } },
    innerHandHold: { x: hr.x + 35, y: hr.y },
  };
  console.log("joints", JSON.stringify(joints, null, 2));

  if (fs.existsSync(JOINTS_PATH)) {
    const all = JSON.parse(fs.readFileSync(JOINTS_PATH, "utf8"));
    Object.assign(all.groom, {
      ...joints,
      holdHandTarget: joints.innerHandHold,
    });
    fs.writeFileSync(JOINTS_PATH, JSON.stringify(all, null, 2) + "\n");
  }

  // Per-layer checkerboard QC + static assembly
  const layers = {
    shoes,
    legs,
    "left-upper-arm": lu,
    "right-upper-arm": ru,
    "left-forearm": lf,
    "right-forearm": rf,
    "left-hand": lh,
    "right-hand": rh,
    torso,
    head,
    hair,
  };
  const qcDir = "/opt/cursor/artifacts/kiss-cam-redesign";
  for (const [name, buf] of Object.entries(layers)) {
    const vis = blank();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = idx(x, y);
        const c = ((x >> 4) ^ (y >> 4)) & 1 ? 210 : 170;
        if (buf[k + 3] > 40) {
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
    await sharp(vis, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toFile(path.join(qcDir, `LAYER-${name}.png`));
  }

  // Static composite (pink) — z-order: shoes, legs, arms, torso, head, hair
  const order = [shoes, legs, lu, ru, lf, rf, lh, rh, torso, head, hair];
  const out = blank();
  for (let p = 0; p < W * H; p++) {
    out[p * 4] = 255;
    out[p * 4 + 1] = 105;
    out[p * 4 + 2] = 180;
    out[p * 4 + 3] = 255;
  }
  for (const d of order) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const k = idx(x, y);
        if (d[k + 3] > 40) {
          out[k] = d[k];
          out[k + 1] = d[k + 1];
          out[k + 2] = d[k + 2];
          out[k + 3] = 255;
        }
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(path.join(qcDir, "CLEAN-static.png"));
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: 40, top: 60, width: 640, height: 1100 })
    .png()
    .toFile(path.join(qcDir, "CLEAN-static-full.png"));
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: 160, top: 230, width: 400, height: 300 })
    .png()
    .toFile(path.join(qcDir, "CLEAN-static-shoulder.png"));

  // vs master gaps in body
  let miss = 0;
  let extra = 0;
  for (let y = 70; y < 1100; y++) {
    for (let x = 40; x < 680; x++) {
      const k = idx(x, y);
      const m = master[k + 3] > 40;
      const r = !(out[k] === 255 && out[k + 1] === 105 && out[k + 2] === 180);
      if (m && !r) miss++;
      if (!m && r) extra++;
    }
  }
  console.log("full body vs master miss/extra", miss, extra);
  console.log(
    "component counts",
    Object.fromEntries(
      Object.entries(layers).map(([n, b]) => [n, countComps(b)])
    )
  );

  return joints;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
