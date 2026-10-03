# Kiss Cam assets

Heart-frame stage assets (SVG motifs + couple standby video + live mask).

| Path | Purpose |
|------|---------|
| `kiss-cam.mp4` | Couple video full-bleed until a phone camera goes live |
| `love-frame.png` | Static frame (transparent heart) drawn in front of the live share |
| `live-heart-mask.png` | Exact heart silhouette cropped from the designed video — CSS-masks the live camera |
| `music/theme.mp3` | Optional default LED music |
| `background.svg`, `hearts.svg`, `balloons.svg` | Atmosphere |

Bride/groom puppet PNGs and rig code have been removed. Live camera + this video own the LED.

## Add `kiss-cam.mp4` from your PC

Cloud agents cannot receive large Desktop attachments. From the monorepo root on Windows:

```powershell
Copy-Item "$env:USERPROFILE\OneDrive\Desktop\kiss-cam.mp4" `
  "myjiefun-website\public\assets\kiss-cam\kiss-cam.mp4" -Force
git add myjiefun-website/public/assets/kiss-cam/kiss-cam.mp4
git commit -m "Add Kiss Cam couple video"
git push origin main
powershell -ExecutionPolicy Bypass -File scripts\deploy-myjiefun-now.ps1
```

Or use **Choose video** in Kiss Cam Controls for a same-browser test (not persisted to production).
