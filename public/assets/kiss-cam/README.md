# Kiss Cam artwork assets

## Live characters (layered puppets)

Animation uses transparent PNG layers + CSS transforms in `kiss-cam-puppet.tsx`.
Pose state machine stays in `kiss-cam-pose.ts` (idle / breath / hold / kiss / return).

| Path | Purpose |
|------|---------|
| `groom/*.png` | Groom puppet layers cut from the premium master |
| `bride/*.png` | Bride puppet layers (+ tiara, veil, bodice, skirt) |
| `masters/*-master.png` | Full-body painted masters (source of truth) |
| `masters/*-master-placed.png` | Masters placed on the 720×1380 stage |
| `masters/*-master-preview.png` | Layer stack reconstruction previews |
| `masters/joints.json` | Joint pivots for the puppet rig |

### Regenerating layers from masters

```bash
# Requires the v2 masters under /opt/cursor/artifacts/kiss-cam-masters/
# or update MASTER_SRC paths inside the script.
node scripts/split-kiss-cam-masters.cjs
```

Do **not** use `scripts/generate-kiss-cam-layers.cjs` for production art — that SVG
path only produces flat cartoon layers and will overwrite the premium PNGs.

## Character Rig Debug (development only)

In non-production builds, toggle **Character Rig Debug** in Kiss Cam Controls,
or open with `?rigDebug=1`, or set `NEXT_PUBLIC_KISS_CAM_RIG_DEBUG=1`.

Shows layer bounds, joint pivots, and hand-hold targets. **Never enabled in production.**

## Legacy static SVG references

| File | Purpose |
|------|---------|
| `groom.svg` / `bride.svg` | Older static cartoon references (not used by live puppets) |
| `balloons.svg` / `hearts.svg` / `background.svg` | Atmosphere references |
| `music/` | LED background music |

Visual language: premium semi-realistic wedding invitation illustration with adult proportions.
