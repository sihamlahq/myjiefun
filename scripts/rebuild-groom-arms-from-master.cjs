/**
 * Rebuild groom torso + arm/hand layers from groom-master-placed.png.
 *
 * Goals:
 * - One art style: every pixel sampled from the placed master
 * - Jacket shoulder cap on torso so static A-pose matches master silhouette
 * - Sleeve shaft on upper-arm; forearm/hand separate with modest underlap
 * - Rotation-safe underlap (narrow strip below shoulder hinge only)
 *
 * Run from myjiefun-website/:
 *   node scripts/rebuild-groom-arms-from-master.cjs
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

const CAP_TOP = 248;
/** Smooth armscye: full master outer at CAP_TOP → inset body edge by ARMPIT_Y */
const ARMPIT_Y = 365;
const ARMPIT_INSET = 52;
const UNDERLAP_KEEP = 10;
const ELBOW_KEEP = 20;
const WRIST_KEEP = 20;

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Left: torso leftmost x for this row; right: torso rightmost x */
function armscyeTorsoOuter(masterOuter, y, side) {
  const t = smoothstep((y - CAP_TOP) / (ARMPIT_Y - CAP_TOP));
  const inset = Math.round(ARMPIT_INSET * t);
  if (side === "L") return masterOuter + inset;
  return masterOuter - inset;
}

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
  if (info.width !== W || info.height !== H) throw new Error(`bad size ${p}: ${info.width}x${info.height}`);
  return Buffer.from(data);
}

async function savePng(name, buf) {
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, name));
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

function subtractKeepingUnderlap(base, other, keep) {
  const out = Buffer.from(base);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(out, x, y) || !alpha(other, x, y)) continue;
      let minD = 999;
      for (let dy = -45; dy <= 45; dy++) {
        for (let dx = -45; dx <= 45; dx++) {
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

/**
 * Build a smooth jacket armscye on torso from the master silhouette, and put
 * the remaining sleeve shaft on upper-arm (with a short underlap strip).
 */
function applySmoothArmscye(torso, upper, master, side) {
  let torsoMoved = 0;
  let sleeveRestored = 0;
  for (let y = CAP_TOP; y <= 470; y++) {
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

    const torsoEdge = armscyeTorsoOuter(mOuter, y, side);

    if (side === "L") {
      // Claim torso from torsoEdge inward a bit past previous body edge
      let bodyInner = null;
      for (let x = 180; x < 360; x++) if (alpha(torso, x, y)) {
        bodyInner = x;
        break;
      }
      const fillTo = bodyInner != null ? Math.min(360, Math.max(bodyInner + 6, torsoEdge + 6)) : Math.min(360, torsoEdge + 40);
      for (let x = Math.max(mOuter, torsoEdge); x <= fillTo; x++) {
        if (alpha(master, x, y) && !alpha(torso, x, y)) {
          copyPx(torso, master, x, y);
          torsoMoved++;
        }
      }
      // Also fill any hole between torsoEdge and existing torso
      for (let x = torsoEdge; x <= fillTo; x++) {
        if (alpha(master, x, y) && !alpha(torso, x, y)) {
          copyPx(torso, master, x, y);
          torsoMoved++;
        }
      }
      // Clear torso outside armscye (sleeve belongs on upper)
      for (let x = mOuter; x < torsoEdge; x++) {
        if (alpha(torso, x, y)) clearPx(torso, x, y);
      }
      // Sleeve on upper outside torso + short underlap
      for (let x = mOuter; x < torsoEdge; x++) {
        if (alpha(master, x, y) && !alpha(upper, x, y)) {
          copyPx(upper, master, x, y);
          sleeveRestored++;
        }
      }
      for (let x = torsoEdge; x < torsoEdge + 14 && x < 360; x++) {
        if (alpha(master, x, y) && !alpha(upper, x, y) && alpha(torso, x, y)) {
          copyPx(upper, master, x, y);
          sleeveRestored++;
        }
      }
    } else {
      let bodyInner = null;
      for (let x = 540; x > 360; x--) if (alpha(torso, x, y)) {
        bodyInner = x;
        break;
      }
      const fillTo = bodyInner != null ? Math.max(360, Math.min(bodyInner - 6, torsoEdge - 6)) : Math.max(360, torsoEdge - 40);
      for (let x = Math.min(mOuter, torsoEdge); x >= fillTo; x--) {
        if (alpha(master, x, y) && !alpha(torso, x, y)) {
          copyPx(torso, master, x, y);
          torsoMoved++;
        }
      }
      for (let x = torsoEdge; x >= fillTo; x--) {
        if (alpha(master, x, y) && !alpha(torso, x, y)) {
          copyPx(torso, master, x, y);
          torsoMoved++;
        }
      }
      for (let x = torsoEdge + 1; x <= mOuter; x++) {
        if (alpha(torso, x, y)) clearPx(torso, x, y);
      }
      for (let x = torsoEdge + 1; x <= mOuter; x++) {
        if (alpha(master, x, y) && !alpha(upper, x, y)) {
          copyPx(upper, master, x, y);
          sleeveRestored++;
        }
      }
      for (let x = torsoEdge; x > torsoEdge - 14 && x > 360; x--) {
        if (alpha(master, x, y) && !alpha(upper, x, y) && alpha(torso, x, y)) {
          copyPx(upper, master, x, y);
          sleeveRestored++;
        }
      }
    }
  }
  return { torsoMoved, sleeveRestored };
}

function trimRotationSafeUnderlap(upper, torso, shoulderY, side) {
  let cleared = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(upper, x, y)) continue;
      if (!alpha(torso, x, y)) continue;
      if (y < shoulderY - 4) {
        clearPx(upper, x, y);
        cleared++;
        continue;
      }
      let tOuter = null;
      if (side === "L") {
        for (let xx = 180; xx < 400; xx++) if (alpha(torso, xx, y)) {
          tOuter = xx;
          break;
        }
        if (tOuter == null || x >= tOuter + UNDERLAP_KEEP) {
          clearPx(upper, x, y);
          cleared++;
        }
      } else {
        for (let xx = 540; xx > 320; xx--) if (alpha(torso, xx, y)) {
          tOuter = xx;
          break;
        }
        if (tOuter == null || x <= tOuter - UNDERLAP_KEEP) {
          clearPx(upper, x, y);
          cleared++;
        }
      }
    }
  }
  return cleared;
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
  for (let y = 250; y < 400; y++) {
    let c = 0;
    const x0 = side === "L" ? 180 : 360;
    const x1 = side === "L" ? 360 : 540;
    for (let x = x0; x < x1; x++) if (alpha(upper, x, y) && !alpha(torso, x, y)) c++;
    if (c >= 10) {
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
  const y0 = Math.max(250, (firstVis || 320) - 15);
  const y1 = (firstVis || 320) + 25;
  const ov = centroid((x, y) => {
    const inSide = side === "L" ? x < 360 : x > 360;
    return inSide && y >= y0 && y <= y1 && alpha(torso, x, y) && alpha(upper, x, y);
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

async function main() {
  const master = await loadRaw(MASTER);
  const head = await loadRaw(path.join(DIR, "head.png"));
  const hair = await loadRaw(path.join(DIR, "hair.png"));
  const legs = await loadRaw(path.join(DIR, "legs.png"));
  const shoes = await loadRaw(path.join(DIR, "shoes.png"));

  // Fitted polygons on the placed 720×1380 master (A-pose suit).
  const L_UPPER = [
    [228, 268],
    [268, 255],
    [285, 290],
    [282, 360],
    [268, 430],
    [230, 455],
    [200, 430],
    [195, 360],
    [205, 300],
  ];
  const L_FORE = [
    [195, 420],
    [240, 415],
    [235, 470],
    [200, 530],
    [140, 545],
    [95, 530],
    [90, 500],
    [130, 460],
    [175, 435],
  ];
  const R_UPPER = [
    [492, 268],
    [452, 255],
    [435, 290],
    [438, 360],
    [452, 430],
    [490, 455],
    [520, 430],
    [525, 360],
    [515, 300],
  ];
  const R_FORE = [
    [525, 420],
    [480, 415],
    [485, 470],
    [520, 530],
    [580, 545],
    [625, 530],
    [630, 500],
    [590, 460],
    [545, 435],
  ];

  let lh = cutMask(master, (x, y) => inEllipse(x, y, 90, 553, 48, 42));
  let rh = cutMask(master, (x, y) => inEllipse(x, y, 630, 553, 48, 42));
  let lf = cutMask(master, (x, y) => pointInPoly(x, y, L_FORE));
  let rf = cutMask(master, (x, y) => pointInPoly(x, y, R_FORE));
  let lu = cutMask(master, (x, y) => pointInPoly(x, y, L_UPPER));
  let ru = cutMask(master, (x, y) => pointInPoly(x, y, R_UPPER));

  lu = dilateIntoMaster(lu, master, 12, (x, y) => x < 310 && y >= 248 && y <= 470);
  ru = dilateIntoMaster(ru, master, 12, (x, y) => x > 410 && y >= 248 && y <= 470);
  lf = dilateIntoMaster(lf, master, 8, (x, y) => x < 280 && y >= 400 && y <= 560);
  rf = dilateIntoMaster(rf, master, 8, (x, y) => x > 440 && y >= 400 && y <= 560);
  lh = dilateIntoMaster(lh, master, 6, (x, y) => x < 160 && y >= 500 && y <= 610);
  rh = dilateIntoMaster(rh, master, 6, (x, y) => x > 560 && y >= 500 && y <= 610);

  lf = subtractKeepingUnderlap(lf, lh, WRIST_KEEP);
  rf = subtractKeepingUnderlap(rf, rh, WRIST_KEEP);
  lu = subtractKeepingUnderlap(lu, lf, ELBOW_KEEP);
  ru = subtractKeepingUnderlap(ru, rf, ELBOW_KEEP);

  // Torso = master minus other puppet layers (arms claimed separately).
  let torso = blank();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!alpha(master, x, y)) continue;
      if (alpha(head, x, y) || alpha(hair, x, y) || alpha(legs, x, y) || alpha(shoes, x, y)) continue;
      if (alpha(lh, x, y) || alpha(rh, x, y) || alpha(lf, x, y) || alpha(rf, x, y)) continue;
      if (alpha(lu, x, y) || alpha(ru, x, y)) continue;
      copyPx(torso, master, x, y);
    }
  }

  console.log("armscye L", applySmoothArmscye(torso, lu, master, "L"));
  console.log("armscye R", applySmoothArmscye(torso, ru, master, "R"));

  // Re-separate after sleeve restore so elbow/wrist underlaps stay bounded
  lf = subtractKeepingUnderlap(lf, lh, WRIST_KEEP);
  rf = subtractKeepingUnderlap(rf, rh, WRIST_KEEP);
  lu = subtractKeepingUnderlap(lu, lf, ELBOW_KEEP);
  ru = subtractKeepingUnderlap(ru, rf, ELBOW_KEEP);

  // Provisional shoulders for underlap trim
  let Lsh = measureShoulder(lu, torso, "L");
  let Rsh = measureShoulder(ru, torso, "R");
  console.log("trim underlap", trimRotationSafeUnderlap(lu, torso, Lsh.y || 325, "L"), trimRotationSafeUnderlap(ru, torso, Rsh.y || 325, "R"));

  Lsh = measureShoulder(lu, torso, "L");
  Rsh = measureShoulder(ru, torso, "R");
  const Lel = centroid((x, y) => alpha(lu, x, y) && alpha(lf, x, y));
  const Rel = centroid((x, y) => alpha(ru, x, y) && alpha(rf, x, y));
  const Lwr = centroid((x, y) => alpha(lf, x, y) && alpha(lh, x, y));
  const Rwr = centroid((x, y) => alpha(rf, x, y) && alpha(rh, x, y));
  const hl = centroid((x, y) => alpha(lh, x, y));
  const hr = centroid((x, y) => alpha(rh, x, y));

  await savePng("torso.png", torso);
  await savePng("left-upper-arm.png", lu);
  await savePng("right-upper-arm.png", ru);
  await savePng("left-forearm.png", lf);
  await savePng("right-forearm.png", rf);
  await savePng("left-hand.png", lh);
  await savePng("right-hand.png", rh);

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

  // Update masters/joints.json groom arm fields only
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
      innerHandHold: joints.innerHandHold,
      holdHandTarget: joints.innerHandHold,
    });
    fs.writeFileSync(JOINTS_PATH, JSON.stringify(all, null, 2) + "\n");
    console.log("updated", JOINTS_PATH);
  }

  // QC: silhouette vs master in shoulder band
  const layers = [shoes, legs, lu, ru, lf, rf, lh, rh, torso, head, hair];
  const out = blank();
  for (let p = 0; p < W * H; p++) {
    out[p * 4] = 255;
    out[p * 4 + 1] = 105;
    out[p * 4 + 2] = 180;
    out[p * 4 + 3] = 255;
  }
  for (const d of layers) {
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
  let miss = 0;
  let extra = 0;
  for (let y = 250; y < 400; y++) {
    for (let x = 180; x < 540; x++) {
      const k = idx(x, y);
      const m = master[k + 3] > 40;
      const r = !(out[k] === 255 && out[k + 1] === 105 && out[k + 2] === 180);
      if (m && !r) miss++;
      if (!m && r) extra++;
    }
  }
  console.log("shoulder-band vs master miss/extra", miss, extra);

  const qcDir = "/opt/cursor/artifacts/kiss-cam-redesign";
  if (fs.existsSync("/opt/cursor/artifacts")) {
    await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toFile(path.join(qcDir, "SCRIPT-static.png"));
    await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: 160, top: 240, width: 400, height: 280 })
      .png()
      .toFile(path.join(qcDir, "SCRIPT-static-shoulder.png"));
  }

  return joints;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
