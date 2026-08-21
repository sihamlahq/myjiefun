# Kiss Cam artwork assets

## Live characters (layered puppets)

Animation uses PNG layers + CSS transforms in `kiss-cam-puppet.tsx`.
Pose state machine stays in `kiss-cam-pose.ts`.

| Path | Purpose |
|------|---------|
| `groom/*.png` | Groom puppet layers (head, hair, torso, arms, hands, legs, shoes) |
| `bride/*.png` | Bride puppet layers (+ tiara, veil, bodice, skirt) |
| `masters/*-master-preview.png` | Overlaid reconstruction previews |

Regenerate layers:

```bash
node scripts/generate-kiss-cam-layers.cjs
```

## Character Rig Debug (development only)

In non-production builds, toggle **Character Rig Debug** in Kiss Cam Controls,
or open with `?rigDebug=1`, or set `NEXT_PUBLIC_KISS_CAM_RIG_DEBUG=1`.

Shows layer bounds, joint pivots, and hand-hold targets. **Never enabled in production.**

## Legacy static SVG references

| File | Purpose |
|------|---------|
| `groom.svg` / `bride.svg` | Older static references (not used by the live puppet) |
| `balloons.svg` / `hearts.svg` / `background.svg` | Atmosphere references |
| `music/` | LED background music |

Visual language: layered semi-realistic wedding illustration with adult proportions.
