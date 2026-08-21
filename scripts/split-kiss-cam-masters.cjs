/**
 * Split premium kiss-cam master illustrations into transparent puppet layers.
 * Every layer is cut from the same master (character-local masks → canvas px).
 *
 * Run from myjiefun-website/:
 *   node scripts/split-kiss-cam-masters.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 720;
const H = 1380;
const ROOT = path.join(__dirname, "../public/assets/kiss-cam");
const MASTER_SRC = {
  groom: path.join(__dirname, "../public/assets/kiss-cam/masters/groom-master.png"),
  bride: path.join(__dirname, "../public/assets/kiss-cam/masters/bride-master.png"),
};

function maskSvg(paths) {
  // No SVG filters — featherAlpha handles edge softening safely.
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <g fill="#fff">${paths}</g>
</svg>`);
}

/** Character-local % → canvas helpers bound to a placed box */
function makeGeom(box) {
  const X = (pct) => box.left + (pct / 100) * box.newW;
  const Y = (pct) => box.top + (pct / 100) * box.newH;
  const SX = (pct) => (pct / 100) * box.newW;
  const SY = (pct) => (pct / 100) * box.newH;
  return {
    ellipse: (cx, cy, rx, ry) =>
      `<ellipse cx="${X(cx)}" cy="${Y(cy)}" rx="${SX(rx)}" ry="${SY(ry)}"/>`,
    poly: (pts) =>
      `<polygon points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}"/>`,
    joints: {
      neck: { x: X(50), y: Y(13) },
      veilAttach: { x: X(50), y: Y(9) },
      leftShoulder: { x: X(26), y: Y(20) },
      leftElbow: { x: X(16), y: Y(36) },
      leftWrist: { x: X(14), y: Y(50) },
      rightShoulder: { x: X(74), y: Y(20) },
      rightElbow: { x: X(84), y: Y(36) },
      rightWrist: { x: X(86), y: Y(50) },
      holdHandTargetGroom: { x: X(96), y: Y(52) },
      holdHandTargetBride: { x: X(4), y: Y(52) },
    },
  };
}

async function matteAndCrop(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const isBackdrop = (r, g, b, a) => {
    if (a < 8) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const grayDist = Math.sqrt((r - 138) ** 2 + (g - 138) ** 2 + (b - 138) ** 2);
    // Mid-gray studio only — do NOT key light whites (shirt/dress/veil)
    if (grayDist < 40 && sat < 22) return true;
    if (r > 248 && g > 248 && b > 248 && sat < 6) return true;
    return false;
  };

  // Flood-fill key from corners so white shirt/dress interiors stay opaque
  const seen = new Uint8Array(width * height);
  const stack = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const p = y * width + x;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * channels;
    if (!isBackdrop(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
    data[i + 3] = 0;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // Soften leftover near-bg fringe
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const grayDist = Math.sqrt((r - 138) ** 2 + (g - 138) ** 2 + (b - 138) ** 2);
    if (grayDist < 42 && sat < 12) {
      data[i + 3] = Math.min(data[i + 3], Math.round(((grayDist - 28) / 14) * 255));
    } else if (sat < 10 && lum > 200 && lum < 248) {
      // only if mostly surrounded by transparent — skip here; flood handles bg
    }
  }

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let bMinX = width;
  let bMinY = height;
  let bMaxX = 0;
  let bMaxY = 0;
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3];
    if (a < 10) continue;
    const px = (i / channels) % width;
    const py = Math.floor(i / channels / width);
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
    // Body: exclude sheer veil-like pale translucent pixels
    const isSheer = lum > 200 && sat < 25 && a < 180;
    if (!isSheer && a > 50) {
      if (px < bMinX) bMinX = px;
      if (px > bMaxX) bMaxX = px;
      if (py < bMinY) bMinY = py;
      if (py > bMaxY) bMaxY = py;
    }
  }

  const pad = 6;
  const fullMinX = Math.max(0, minX - pad);
  const fullMinY = Math.max(0, minY - pad);
  const fullMaxX = Math.min(width - 1, maxX + pad);
  const fullMaxY = Math.min(height - 1, maxY + pad);

  if (bMaxX <= bMinX || bMaxY <= bMinY) {
    bMinX = minX;
    bMinY = minY;
    bMaxX = maxX;
    bMaxY = maxY;
  }

  const cropped = await sharp(data, { raw: { width, height, channels } })
    .extract({
      left: fullMinX,
      top: fullMinY,
      width: fullMaxX - fullMinX + 1,
      height: fullMaxY - fullMinY + 1,
    })
    .png()
    .toBuffer();

  return {
    buffer: cropped,
    full: {
      minX: fullMinX,
      minY: fullMinY,
      maxX: fullMaxX,
      maxY: fullMaxY,
      w: fullMaxX - fullMinX + 1,
      h: fullMaxY - fullMinY + 1,
    },
    body: {
      minX: bMinX - fullMinX,
      minY: bMinY - fullMinY,
      maxX: bMaxX - fullMinX,
      maxY: bMaxY - fullMinY,
      w: bMaxX - bMinX + 1,
      h: bMaxY - bMinY + 1,
    },
  };
}

async function placeOnCanvas(matted, role) {
  const meta = await sharp(matted.buffer).metadata();
  const srcW = meta.width;
  const srcH = meta.height;

  const topMargin = Math.round(H * 0.05);
  const bottomMargin = Math.round(H * 0.05);
  const sideMargin = Math.round(W * 0.05);
  const targetH = H - topMargin - bottomMargin;

  // Scale so the BODY height fills the stage (veil can extend sideways)
  const bodyH = matted.body.h || srcH;
  let scale = targetH / bodyH;
  let newW = Math.round(srcW * scale);
  let newH = Math.round(srcH * scale);
  const maxW = W - sideMargin * 2;
  if (newW > maxW) {
    scale = maxW / srcW;
    newW = Math.round(srcW * scale);
    newH = Math.round(srcH * scale);
  }

  // Vertically align so body sits on the stage; allow veil above
  const bodyTopInSrc = matted.body.minY || 0;
  const bodyTopScaled = Math.round(bodyTopInSrc * scale);
  let top = topMargin - bodyTopScaled;
  // Clamp: keep feet near bottom if possible
  if (top + newH > H - bottomMargin) top = H - bottomMargin - newH;
  if (top < topMargin) top = topMargin;

  const left = Math.round((W - newW) / 2);

  const resized = await sharp(matted.buffer)
    .resize(newW, newH, { fit: "fill" })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  // Character box used for masks = body-centric proportions within placed image
  // Map body rectangle into canvas space for more accurate % masks
  const bodyLeft = left + Math.round((matted.body.minX || 0) * scale);
  const bodyTop = top + Math.round((matted.body.minY || 0) * scale);
  const bodyW = Math.round((matted.body.w || srcW) * scale);
  const bodyHScaled = Math.round((matted.body.h || srcH) * scale);

  return {
    buffer: canvas,
    left: bodyLeft,
    top: bodyTop,
    newW: bodyW,
    newH: bodyHScaled,
    fullLeft: left,
    fullTop: top,
    fullW: newW,
    fullH: newH,
    scale,
  };
}

async function applyMask(baseBuffer, maskPaths) {
  const mask = await sharp(maskSvg(maskPaths)).png().toBuffer();
  return sharp(baseBuffer)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function featherAlpha(buffer, sigma = 0.6) {
  // Blur alpha only via extractChannel — never blur 1-channel raw (sharp expands to RGB).
  if (sigma <= 0) return buffer;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = await sharp(buffer)
    .ensureAlpha()
    .extractChannel(3)
    .blur(sigma)
    .raw()
    .toBuffer();
  if (alpha.length !== info.width * info.height) {
    // Fallback: skip feather if channel size unexpected
    return buffer;
  }
  for (let i = 0, j = 0; i < data.length; i += 4, j++) data[i + 3] = alpha[j];
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function softenVeil(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 170 && sat > 22) {
      data[i + 3] = 0;
      continue;
    }
    if (lum < 130) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = Math.round(a * Math.min(0.8, (lum - 130) / 140 + 0.3));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

function groomMasks(g) {
  return {
    legs:
      g.poly([
        [34, 52],
        [66, 52],
        [68, 94],
        [52, 95],
        [50, 60],
        [48, 95],
        [32, 94],
      ]) + g.ellipse(50, 54, 14, 5),
    shoes: g.poly([
      [30, 91],
      [70, 91],
      [72, 99],
      [28, 99],
    ]),
    torso:
      g.poly([
        [28, 15],
        [72, 15],
        [76, 54],
        [24, 54],
      ]) +
      g.ellipse(26, 22, 6, 5) +
      g.ellipse(74, 22, 6, 5),
    "left-upper-arm":
      g.poly([
        [4, 16],
        [32, 16],
        [30, 38],
        [2, 38],
      ]) + g.ellipse(16, 36, 7, 4),
    // Forearm includes hand (baked) — separate hand ellipses are written for asset
    // compatibility but puppet uses handMode="baked" so fingertips stay complete.
    "left-forearm":
      g.poly([
        [0, 34],
        [30, 34],
        [32, 52],
        [2, 54],
      ]) +
      g.ellipse(16, 36, 7, 4) +
      g.ellipse(12, 56, 11, 8),
    "left-hand": g.ellipse(12, 56, 11, 8),
    "right-upper-arm":
      g.poly([
        [68, 16],
        [96, 16],
        [98, 38],
        [70, 38],
      ]) + g.ellipse(84, 36, 7, 4),
    "right-forearm":
      g.poly([
        [70, 34],
        [100, 34],
        [98, 54],
        [68, 52],
      ]) +
      g.ellipse(84, 36, 7, 4) +
      g.ellipse(88, 56, 11, 8),
    "right-hand": g.ellipse(88, 56, 11, 8),
    head: g.ellipse(50, 8.5, 15, 9) + g.ellipse(50, 15, 6, 3.5),
    hair:
      g.ellipse(50, 6, 17, 8) +
      g.poly([
        [32, 1],
        [68, 1],
        [72, 11],
        [60, 14],
        [50, 7],
        [40, 14],
        [28, 11],
      ]),
  };
}

function brideMasks(g) {
  return {
    legs: g.poly([
      [40, 82],
      [60, 82],
      [62, 98],
      [38, 98],
    ]),
    shoes: g.poly([
      [38, 94],
      [64, 94],
      [65, 100],
      [37, 100],
    ]),
    skirt:
      g.poly([
        [10, 40],
        [90, 40],
        [99, 94],
        [1, 94],
      ]) + g.ellipse(50, 46, 42, 12),
    bodice:
      g.poly([
        [32, 16],
        [68, 16],
        [72, 46],
        [28, 46],
      ]) +
      g.ellipse(30, 24, 6, 7) +
      g.ellipse(70, 24, 6, 7),
    "left-upper-arm":
      g.poly([
        [6, 18],
        [36, 18],
        [34, 38],
        [4, 38],
      ]) + g.ellipse(18, 36, 6, 4),
    // Forearm includes hand (baked) for lace-sleeve bride artwork
    "left-forearm":
      g.poly([
        [2, 34],
        [34, 34],
        [36, 52],
        [6, 54],
      ]) +
      g.ellipse(18, 36, 6, 4) +
      g.ellipse(12, 56, 10, 8),
    "left-hand": g.ellipse(12, 56, 10, 8),
    "right-upper-arm":
      g.poly([
        [64, 18],
        [94, 18],
        [96, 38],
        [66, 38],
      ]) + g.ellipse(82, 36, 6, 4),
    "right-forearm":
      g.poly([
        [66, 34],
        [98, 34],
        [94, 54],
        [64, 52],
      ]) +
      g.ellipse(82, 36, 6, 4) +
      g.ellipse(88, 56, 10, 8),
    "right-hand": g.ellipse(88, 56, 10, 8),
    head: g.ellipse(50, 9, 13, 8.5) + g.ellipse(50, 15.5, 5.5, 3.2),
    hair:
      g.ellipse(50, 6.5, 16, 8.5) +
      g.poly([
        [34, 1],
        [66, 1],
        [70, 13],
        [58, 17],
        [50, 9],
        [42, 17],
        [30, 13],
      ]),
    tiara: g.ellipse(50, 4, 11, 3.2),
  };
}

async function writeLayer(dir, name, buffer) {
  const outDir = path.join(ROOT, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${name}.png`);
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(out);
  console.log("wrote", path.relative(process.cwd(), out));
}

async function previewComposite(dir, layerNames, outName) {
  const inputs = [];
  for (const name of layerNames) {
    const p = path.join(ROOT, dir, `${name}.png`);
    if (fs.existsSync(p)) inputs.push({ input: p, blend: "over" });
  }
  // Light warm backdrop so black suit / white dress both read
  const buf = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 245, g: 240, b: 235, alpha: 1 },
    },
  })
    .composite(inputs)
    .png()
    .toBuffer();
  const out = path.join(ROOT, "masters", outName);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(buf).toFile(out);
  console.log("preview", out);
}

async function processRole(role) {
  console.log("\n===", role, "===");
  // Masters are already the source files when MASTER_SRC points at masters/
  const masterOut = path.join(ROOT, "masters", `${role}-master.png`);
  fs.mkdirSync(path.dirname(masterOut), { recursive: true });
  if (path.resolve(MASTER_SRC[role]) !== path.resolve(masterOut)) {
    fs.copyFileSync(MASTER_SRC[role], masterOut);
  }

  const matted = await matteAndCrop(MASTER_SRC[role]);
  const placed = await placeOnCanvas(matted, role);
  await sharp(placed.buffer).toFile(path.join(ROOT, "masters", `${role}-master-placed.png`));
  console.log("placed", {
    body: { left: placed.left, top: placed.top, w: placed.newW, h: placed.newH },
    full: { left: placed.fullLeft, top: placed.fullTop, w: placed.fullW, h: placed.fullH },
  });

  const g = makeGeom(placed);
  const masks = role === "groom" ? groomMasks(g) : brideMasks(g);

  // Bride veil uses full placed image bounds (wider than body)
  if (role === "bride") {
    const vg = makeGeom({
      left: placed.fullLeft,
      top: placed.fullTop,
      newW: placed.fullW,
      newH: placed.fullH,
    });
    masks.veil =
      vg.poly([
        [5, 0],
        [95, 0],
        [100, 55],
        [70, 40],
        [50, 12],
        [30, 40],
        [0, 55],
      ]) + vg.ellipse(50, 18, 42, 28);
  }

  for (const [name, maskPaths] of Object.entries(masks)) {
    let layer = await applyMask(placed.buffer, maskPaths);
    if (role === "bride" && name === "veil") layer = await softenVeil(layer);
    layer = await featherAlpha(layer, name === "tiara" ? 0.35 : 0.5);
    await writeLayer(role, name, layer);
  }

  return { placed, joints: g.joints };
}

async function main() {
  const groom = await processRole("groom");
  const bride = await processRole("bride");

  const joints = {
    canvas: { w: W, h: H },
    groom: {
      neck: { x: Math.round(groom.joints.neck.x), y: Math.round(groom.joints.neck.y) },
      leftShoulder: {
        x: Math.round(groom.joints.leftShoulder.x),
        y: Math.round(groom.joints.leftShoulder.y),
      },
      leftElbow: { x: Math.round(groom.joints.leftElbow.x), y: Math.round(groom.joints.leftElbow.y) },
      leftWrist: { x: Math.round(groom.joints.leftWrist.x), y: Math.round(groom.joints.leftWrist.y) },
      rightShoulder: {
        x: Math.round(groom.joints.rightShoulder.x),
        y: Math.round(groom.joints.rightShoulder.y),
      },
      rightElbow: {
        x: Math.round(groom.joints.rightElbow.x),
        y: Math.round(groom.joints.rightElbow.y),
      },
      rightWrist: {
        x: Math.round(groom.joints.rightWrist.x),
        y: Math.round(groom.joints.rightWrist.y),
      },
      holdHandTarget: {
        x: Math.round(groom.joints.holdHandTargetGroom.x),
        y: Math.round(groom.joints.holdHandTargetGroom.y),
      },
    },
    bride: {
      neck: { x: Math.round(bride.joints.neck.x), y: Math.round(bride.joints.neck.y) },
      veilAttach: {
        x: Math.round(bride.joints.veilAttach.x),
        y: Math.round(bride.joints.veilAttach.y),
      },
      leftShoulder: {
        x: Math.round(bride.joints.leftShoulder.x),
        y: Math.round(bride.joints.leftShoulder.y),
      },
      leftElbow: { x: Math.round(bride.joints.leftElbow.x), y: Math.round(bride.joints.leftElbow.y) },
      leftWrist: { x: Math.round(bride.joints.leftWrist.x), y: Math.round(bride.joints.leftWrist.y) },
      rightShoulder: {
        x: Math.round(bride.joints.rightShoulder.x),
        y: Math.round(bride.joints.rightShoulder.y),
      },
      rightElbow: {
        x: Math.round(bride.joints.rightElbow.x),
        y: Math.round(bride.joints.rightElbow.y),
      },
      rightWrist: {
        x: Math.round(bride.joints.rightWrist.x),
        y: Math.round(bride.joints.rightWrist.y),
      },
      holdHandTarget: {
        x: Math.round(bride.joints.holdHandTargetBride.x),
        y: Math.round(bride.joints.holdHandTargetBride.y),
      },
    },
  };
  fs.writeFileSync(path.join(ROOT, "masters", "joints.json"), JSON.stringify(joints, null, 2));
  console.log("wrote joints.json", joints);

  await previewComposite(
    "groom",
    [
      "shoes",
      "legs",
      "torso",
      "left-upper-arm",
      "left-forearm",
      "left-hand",
      "right-upper-arm",
      "right-forearm",
      "right-hand",
      "head",
      "hair",
    ],
    "groom-master-preview.png",
  );
  await previewComposite(
    "bride",
    [
      "veil",
      "shoes",
      "legs",
      "skirt",
      "bodice",
      "left-upper-arm",
      "left-forearm",
      "left-hand",
      "right-upper-arm",
      "right-forearm",
      "right-hand",
      "head",
      "hair",
      "tiara",
    ],
    "bride-master-preview.png",
  );
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
