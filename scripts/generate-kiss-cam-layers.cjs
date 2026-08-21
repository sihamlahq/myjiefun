/**
 * DEPRECATED — flat cartoon SVG → PNG generator.
 * Do NOT run this for production Kiss Cam art; it overwrites premium master-cut layers.
 * Use scripts/split-kiss-cam-masters.cjs instead.
 *
 * Canvas: 480×920 (legacy). Live puppets now use 720×1380 premium PNGs.
 *
 * Run: node scripts/generate-kiss-cam-layers.cjs
 */
if (process.env.FORCE_CARTOON_LAYERS !== "1") {
  console.error(
    "Refusing to run: this script generates flat cartoon layers.\n" +
      "Use: node scripts/split-kiss-cam-masters.cjs\n" +
      "Or set FORCE_CARTOON_LAYERS=1 to override (not recommended).",
  );
  process.exit(1);
}
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const W = 480;
const H = 920;
const ROOT = path.join(__dirname, "../public/assets/kiss-cam");

const SKIN = "#f0c4a8";
const SKIN_S = "#d9a088";
const HAIR = "#1a1412";
const HAIR_M = "#2a221e";
const TUX = "#161618";
const TUX_D = "#0c0c0e";
const SHIRT = "#fffcf8";
const TIE = "#101012";
const STROKE = "#5a4a42";
const GOWN = "#fffcf8";
const GOWN_M = "#f5eee6";
const LACE = "#efe6dc";
const TIARA = "#e8eef4";
const VEIL = "rgba(255,255,255,0.55)";

function svgDoc(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
${body}
</svg>`;
}

async function writePng(dir, name, body) {
  const outDir = path.join(ROOT, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${name}.png`);
  await sharp(Buffer.from(svgDoc(body)))
    .png()
    .toFile(out);
  console.log("wrote", path.relative(process.cwd(), out));
}

/** Groom layers — adult proportions, double-breasted suit */
async function groom() {
  // legs (with slight shoe overlap kept for attach)
  await writePng(
    "groom",
    "legs",
    `<path d="M188 520 C184 620 180 720 186 790 L228 790 C232 720 230 620 228 520Z" fill="${TUX}" stroke="${STROKE}" stroke-width="2"/>
     <path d="M252 520 C256 620 258 720 254 790 L296 790 C300 720 296 620 292 520Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="2"/>`,
  );
  await writePng(
    "groom",
    "shoes",
    `<path d="M182 788 L178 818 C186 822 230 822 236 818 L232 788Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="1.8"/>
     <path d="M248 788 L244 818 C252 822 296 822 302 818 L298 788Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="1.8"/>
     <path d="M186 806 H228" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>
     <path d="M252 806 H294" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"/>`,
  );
  // torso includes shoulder stubs that tuck under arms
  await writePng(
    "groom",
    "torso",
    `<path d="M168 250 C168 220 196 198 240 198 C284 198 312 220 312 250 L328 520 L152 520Z" fill="${TUX}" stroke="${STROKE}" stroke-width="2.2"/>
     <path d="M224 220 L240 400 L256 220Z" fill="${SHIRT}" stroke="${STROKE}" stroke-width="1.4"/>
     <path d="M216 210 L240 232 L264 210 L254 204 L240 220 L226 204Z" fill="${SHIRT}" stroke="${STROKE}" stroke-width="1.3"/>
     <path d="M232 230 L240 244 L248 230 L244 224 L240 228 L236 224Z" fill="${TIE}"/>
     <path d="M234 244 L240 396 L246 244Z" fill="${TIE}"/>
     <path d="M220 218 L178 290 L212 302 L236 244Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="1.5"/>
     <path d="M260 218 L302 290 L268 302 L244 244Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="1.5"/>
     <circle cx="216" cy="340" r="5" fill="${TUX_D}" stroke="${STROKE}"/><circle cx="264" cy="340" r="5" fill="${TUX_D}" stroke="${STROKE}"/>
     <circle cx="216" cy="390" r="5" fill="${TUX_D}" stroke="${STROKE}"/><circle cx="264" cy="390" r="5" fill="${TUX_D}" stroke="${STROKE}"/>
     <!-- shoulder stubs for overlap -->
     <ellipse cx="168" cy="255" rx="22" ry="18" fill="${TUX}"/>
     <ellipse cx="312" cy="255" rx="22" ry="18" fill="${TUX_D}"/>`,
  );

  // left arm (outer / balloon side) — upper includes elbow stub
  await writePng(
    "groom",
    "left-upper-arm",
    `<path d="M168 250 C140 280 120 330 128 370 L168 378 C176 330 180 285 188 258Z" fill="${TUX}" stroke="${STROKE}" stroke-width="2"/>
     <ellipse cx="148" cy="370" rx="20" ry="16" fill="${TUX}"/>`,
  );
  await writePng(
    "groom",
    "left-forearm",
    `<path d="M128 365 C118 410 122 455 132 490 L168 486 C172 450 168 410 168 375Z" fill="${TUX}" stroke="${STROKE}" stroke-width="2"/>
     <rect x="138" y="478" width="28" height="14" rx="3" fill="${SHIRT}" stroke="${STROKE}"/>
     <ellipse cx="150" cy="365" rx="18" ry="14" fill="${TUX}"/>`,
  );
  await writePng(
    "groom",
    "left-hand",
    `<ellipse cx="150" cy="510" rx="22" ry="24" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.8"/>
     <path d="M136 498 C130 478 140 468 150 472 C160 468 170 478 164 498" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.4"/>
     <ellipse cx="150" cy="490" rx="16" ry="10" fill="${SKIN}" opacity="0.9"/>`,
  );

  // right arm (inner / hold)
  await writePng(
    "groom",
    "right-upper-arm",
    `<path d="M312 250 C340 280 360 330 352 370 L312 378 C304 330 300 285 292 258Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="2"/>
     <ellipse cx="332" cy="370" rx="20" ry="16" fill="${TUX_D}"/>`,
  );
  await writePng(
    "groom",
    "right-forearm",
    `<path d="M352 365 C362 410 358 455 348 490 L312 486 C308 450 312 410 312 375Z" fill="${TUX_D}" stroke="${STROKE}" stroke-width="2"/>
     <rect x="314" y="478" width="28" height="14" rx="3" fill="${SHIRT}" stroke="${STROKE}"/>
     <ellipse cx="330" cy="365" rx="18" ry="14" fill="${TUX_D}"/>`,
  );
  await writePng(
    "groom",
    "right-hand",
    `<ellipse cx="330" cy="510" rx="22" ry="24" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.8"/>
     <path d="M316 498 C310 478 320 468 330 472 C340 468 350 478 344 498" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.4"/>
     <ellipse cx="330" cy="490" rx="16" ry="10" fill="${SKIN}" opacity="0.9"/>`,
  );

  await writePng(
    "groom",
    "head",
    `<!-- neck stub under torso collar -->
     <path d="M220 188 L226 220 L254 220 L260 188Z" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.5"/>
     <ellipse cx="240" cy="150" rx="58" ry="66" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
     <ellipse cx="226" cy="138" rx="14" ry="10" fill="rgba(255,255,255,0.22)"/>
     <!-- face -->
     <path d="M214 132 Q226 126 236 132" fill="none" stroke="${HAIR}" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M244 132 Q254 126 266 132" fill="none" stroke="${HAIR}" stroke-width="2.2" stroke-linecap="round"/>
     <ellipse cx="222" cy="148" rx="10" ry="6.5" fill="#fff" stroke="${STROKE}" stroke-width="1.3"/>
     <ellipse cx="222" cy="148.5" rx="4.2" ry="4.4" fill="#3a2a22"/><circle cx="222" cy="148.5" r="2" fill="#1a1210"/>
     <circle cx="224" cy="146.5" r="1.2" fill="#fff"/>
     <ellipse cx="258" cy="148" rx="10" ry="6.5" fill="#fff" stroke="${STROKE}" stroke-width="1.3"/>
     <ellipse cx="258" cy="148.5" rx="4.2" ry="4.4" fill="#3a2a22"/><circle cx="258" cy="148.5" r="2" fill="#1a1210"/>
     <circle cx="260" cy="146.5" r="1.2" fill="#fff"/>
     <path d="M239 142 Q242 154 237 160" fill="none" stroke="${SKIN_S}" stroke-width="2" stroke-linecap="round"/>
     <ellipse cx="240" cy="161" rx="4" ry="2.4" fill="${SKIN_S}" opacity="0.35"/>
     <ellipse cx="220" cy="168" rx="12" ry="8" fill="#efb0b4" opacity="0.35"/>
     <ellipse cx="260" cy="168" rx="12" ry="8" fill="#efb0b4" opacity="0.35"/>
     <path d="M226 176 Q240 188 254 176" fill="#e8a0a6" stroke="#c97a82" stroke-width="1.4"/>`,
  );

  await writePng(
    "groom",
    "hair",
    `<path d="M184 160 C178 120 200 88 230 82 L224 140Z" fill="${HAIR}"/>
     <path d="M296 164 C302 124 280 90 250 84 L256 142Z" fill="${HAIR}"/>
     <path d="M198 145 C188 80 230 55 262 58 C298 62 308 105 296 145 C278 118 248 110 220 125Z" fill="${HAIR_M}" stroke="${STROKE}" stroke-width="2"/>
     <path d="M220 95 Q248 78 278 100" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="4" stroke-linecap="round"/>
     <path d="M210 115 Q240 95 270 118" fill="none" stroke="${HAIR}" stroke-width="2.5" opacity="0.7"/>`,
  );
}

/** Bride layers — lace gown, updo, tiara, veil */
async function bride() {
  await writePng(
    "bride",
    "veil",
    `<path d="M170 160 C190 40 300 36 320 160 L340 480 C290 430 200 430 150 475Z" fill="${VEIL}" stroke="#7a6a62" stroke-width="1.2"/>`,
  );
  await writePng(
    "bride",
    "legs",
    `<path d="M210 620 C206 700 204 760 210 800 L236 800 C240 760 238 700 236 620Z" fill="${SKIN}" opacity="0.35"/>
     <path d="M244 620 C248 700 250 760 244 800 L270 800 C274 760 272 700 270 620Z" fill="${SKIN}" opacity="0.35"/>`,
  );
  await writePng(
    "bride",
    "shoes",
    `<ellipse cx="224" cy="808" rx="18" ry="8" fill="${GOWN_M}" stroke="${STROKE}" stroke-width="1.2"/>
     <ellipse cx="256" cy="808" rx="18" ry="8" fill="${GOWN_M}" stroke="${STROKE}" stroke-width="1.2"/>`,
  );
  await writePng(
    "bride",
    "skirt",
    `<path d="M190 390 C120 490 100 680 130 820 L350 820 C380 680 360 490 290 390 C270 420 210 420 190 390Z" fill="${GOWN}" stroke="${STROKE}" stroke-width="2"/>
     <path d="M180 405 C150 445 145 490 175 515 C210 490 240 465 240 448 C260 465 290 490 325 515 C355 490 350 445 320 405 C295 435 270 448 240 442 C230 448 205 435 180 405Z" fill="${GOWN_M}" stroke="${STROKE}" stroke-width="1.6"/>
     <path d="M160 560 Q240 530 320 560" fill="none" stroke="${GOWN_M}" stroke-width="8" opacity="0.55"/>
     <path d="M145 650 Q240 620 335 650" fill="none" stroke="${LACE}" stroke-width="6" opacity="0.5"/>
     <path d="M140 740 Q240 715 340 740" fill="none" stroke="${LACE}" stroke-width="5" opacity="0.4"/>`,
  );
  await writePng(
    "bride",
    "bodice",
    `<path d="M198 250 L282 250 L292 390 C265 418 215 418 188 390Z" fill="${GOWN}" stroke="${STROKE}" stroke-width="2"/>
     <path d="M210 250 L210 278 L270 278 L270 250" fill="none" stroke="${STROKE}" stroke-width="1.4" opacity="0.45"/>
     <path d="M216 300 Q240 280 264 300 Q240 322 216 300Z" fill="${LACE}" stroke="#7a6a62" stroke-width="1"/>
     <circle cx="240" cy="300" r="4" fill="#f8fbff" stroke="#7a6a62"/>
     <circle cx="224" cy="330" r="3" fill="${LACE}" stroke="#7a6a62"/>
     <circle cx="240" cy="338" r="3.5" fill="${LACE}" stroke="#7a6a62"/>
     <circle cx="256" cy="330" r="3" fill="${LACE}" stroke="#7a6a62"/>
     <path d="M212 355 Q240 342 268 355" fill="none" stroke="${LACE}" stroke-width="2"/>
     <!-- shoulder stubs -->
     <ellipse cx="190" cy="265" rx="20" ry="16" fill="${GOWN}"/>
     <ellipse cx="290" cy="265" rx="20" ry="16" fill="${GOWN}"/>`,
  );

  await writePng(
    "bride",
    "left-upper-arm",
    `<path d="M190 260 C155 295 140 345 148 385 L182 390 C188 345 192 300 210 275Z" fill="rgba(255,252,248,0.85)" stroke="${STROKE}" stroke-width="1.6" stroke-dasharray="3 4"/>
     <circle cx="168" cy="300" r="2.5" fill="${LACE}"/><circle cx="156" cy="340" r="2.5" fill="${LACE}"/>
     <ellipse cx="165" cy="385" rx="18" ry="14" fill="rgba(255,252,248,0.85)"/>`,
  );
  await writePng(
    "bride",
    "left-forearm",
    `<path d="M148 380 C138 425 142 470 152 505 L182 500 C186 465 182 425 182 390Z" fill="rgba(255,252,248,0.85)" stroke="${STROKE}" stroke-width="1.6" stroke-dasharray="3 4"/>
     <circle cx="160" cy="430" r="2.2" fill="${LACE}"/>
     <ellipse cx="165" cy="380" rx="16" ry="12" fill="rgba(255,252,248,0.85)"/>`,
  );
  await writePng(
    "bride",
    "left-hand",
    `<ellipse cx="166" cy="525" rx="20" ry="22" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.7"/>
     <path d="M154 514 C148 496 156 486 166 490 C176 486 184 496 178 514" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.3"/>`,
  );

  await writePng(
    "bride",
    "right-upper-arm",
    `<path d="M290 260 C325 295 340 345 332 385 L298 390 C292 345 288 300 270 275Z" fill="rgba(255,252,248,0.85)" stroke="${STROKE}" stroke-width="1.6" stroke-dasharray="3 4"/>
     <circle cx="312" cy="300" r="2.5" fill="${LACE}"/><circle cx="324" cy="340" r="2.5" fill="${LACE}"/>
     <ellipse cx="315" cy="385" rx="18" ry="14" fill="rgba(255,252,248,0.85)"/>`,
  );
  await writePng(
    "bride",
    "right-forearm",
    `<path d="M332 380 C342 425 338 470 328 505 L298 500 C294 465 298 425 298 390Z" fill="rgba(255,252,248,0.85)" stroke="${STROKE}" stroke-width="1.6" stroke-dasharray="3 4"/>
     <circle cx="320" cy="430" r="2.2" fill="${LACE}"/>
     <ellipse cx="315" cy="380" rx="16" ry="12" fill="rgba(255,252,248,0.85)"/>`,
  );
  await writePng(
    "bride",
    "right-hand",
    `<ellipse cx="314" cy="525" rx="20" ry="22" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.7"/>
     <path d="M302 514 C296 496 304 486 314 490 C324 486 332 496 326 514" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.3"/>`,
  );

  await writePng(
    "bride",
    "head",
    `<path d="M222 188 L228 222 L252 222 L258 188Z" fill="${SKIN}" stroke="${STROKE}" stroke-width="1.4"/>
     <ellipse cx="240" cy="152" rx="54" ry="62" fill="${SKIN}" stroke="${STROKE}" stroke-width="2"/>
     <ellipse cx="228" cy="140" rx="12" ry="9" fill="rgba(255,255,255,0.25)"/>
     <path d="M216 134 Q226 128 234 134" fill="none" stroke="${HAIR_M}" stroke-width="2" stroke-linecap="round"/>
     <path d="M246 134 Q254 128 264 134" fill="none" stroke="${HAIR_M}" stroke-width="2" stroke-linecap="round"/>
     <ellipse cx="224" cy="150" rx="9.5" ry="6" fill="#fff" stroke="${STROKE}" stroke-width="1.2"/>
     <ellipse cx="224" cy="150.5" rx="3.8" ry="4" fill="#3a2a22"/><circle cx="224" cy="150.5" r="1.8" fill="#1a1210"/>
     <circle cx="226" cy="148.8" r="1.1" fill="#fff"/>
     <ellipse cx="256" cy="150" rx="9.5" ry="6" fill="#fff" stroke="${STROKE}" stroke-width="1.2"/>
     <ellipse cx="256" cy="150.5" rx="3.8" ry="4" fill="#3a2a22"/><circle cx="256" cy="150.5" r="1.8" fill="#1a1210"/>
     <circle cx="258" cy="148.8" r="1.1" fill="#fff"/>
     <path d="M239 144 Q242 156 237 162" fill="none" stroke="${SKIN_S}" stroke-width="1.9" stroke-linecap="round"/>
     <ellipse cx="222" cy="168" rx="11" ry="7" fill="#efb0b4" opacity="0.38"/>
     <ellipse cx="258" cy="168" rx="11" ry="7" fill="#efb0b4" opacity="0.38"/>
     <path d="M228 178 Q240 188 252 178" fill="#e8a0a6" stroke="#c97a82" stroke-width="1.3"/>`,
  );

  await writePng(
    "bride",
    "hair",
    `<path d="M188 170 C182 120 210 85 240 80 C270 85 298 120 292 170 C278 145 258 135 240 136 C222 135 202 145 188 170Z" fill="${HAIR}" stroke="${STROKE}" stroke-width="2"/>
     <ellipse cx="240" cy="95" rx="26" ry="22" fill="${HAIR_M}" stroke="${STROKE}" stroke-width="1.8"/>
     <ellipse cx="234" cy="90" rx="8" ry="5" fill="rgba(255,255,255,0.14)"/>
     <path d="M192 175 Q198 200 206 210" fill="none" stroke="${HAIR_M}" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M288 175 Q282 200 274 210" fill="none" stroke="${HAIR_M}" stroke-width="2.2" stroke-linecap="round"/>`,
  );

  await writePng(
    "bride",
    "tiara",
    `<path d="M208 115 Q224 78 240 70 Q256 78 272 115 Q252 102 240 100 Q228 102 208 115Z" fill="${TIARA}" stroke="#7a6a62" stroke-width="1.4"/>
     <circle cx="240" cy="76" r="4" fill="#f8fbff" stroke="#7a6a62"/>
     <circle cx="224" cy="92" r="3" fill="#f8fbff" stroke="#7a6a62"/>
     <circle cx="256" cy="92" r="3" fill="#f8fbff" stroke="#7a6a62"/>
     <circle cx="214" cy="108" r="2.2" fill="#f8fbff" stroke="#7a6a62"/>
     <circle cx="266" cy="108" r="2.2" fill="#f8fbff" stroke="#7a6a62"/>`,
  );
}

async function previews() {
  // Overlay reconstruction previews
  const groomLayers = [
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
  ];
  const brideLayers = [
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
  ];

  async function stack(dir, layers, outName) {
    let base = sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png();
    // sharp composite needs a real buffer first
    let buf = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 58, g: 36, b: 48, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const composites = [];
    for (const layer of layers) {
      composites.push({
        input: path.join(ROOT, dir, `${layer}.png`),
        left: 0,
        top: 0,
      });
    }
    await sharp(buf)
      .composite(composites)
      .png()
      .toFile(path.join(ROOT, "masters", outName));
    console.log("preview", outName);
  }

  fs.mkdirSync(path.join(ROOT, "masters"), { recursive: true });
  await stack("groom", groomLayers, "groom-master-preview.png");
  await stack("bride", brideLayers, "bride-master-preview.png");
}

(async () => {
  await groom();
  await bride();
  await previews();
  console.log("done");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
