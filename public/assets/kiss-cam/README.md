# Kiss Cam artwork assets

## Architecture

```
poseForPhase()          → animation intent (x, rotations, holdProgress, kissProgress)
        ↓
kiss-cam-rig.ts         → measured joints + resolveCharacterRig()
        ↓
kiss-cam-puppet.tsx     → nested layer transforms (true 2-bone arms)
```

Do **not** map poses onto legacy SVG transform origins (`78px 140px`, etc.).
Joints live in `masters/joints.json` and `kiss-cam-rig.ts`, measured from the PNG layers.

## Live characters (layered puppets)

| Path | Purpose |
|------|---------|
| `groom/*.png` | Groom layers cut from the premium master |
| `bride/*.png` | Bride layers (+ tiara, veil, bodice, skirt) |
| `masters/*-master.png` | Full-body painted masters |
| `masters/joints.json` | Measured joint pivots for the puppet rig |

### Regenerating layers from masters

```bash
node scripts/split-kiss-cam-masters.cjs
# Then re-measure joints into kiss-cam-rig.ts / joints.json
```

Do **not** use `scripts/generate-kiss-cam-layers.cjs` for production art.

## Character Rig Debug (development only)

Toggle **Character Rig Debug** in Kiss Cam Controls, or `?rigDebug=1`, or
`NEXT_PUBLIC_KISS_CAM_RIG_DEBUG=1`. Shows pivots, bone lines
(shoulder→elbow→wrist→hand), hold + kiss targets. **Never in production.**

## Legacy static SVG references

`groom.svg` / `bride.svg` are older cartoon references — not used by live puppets.
