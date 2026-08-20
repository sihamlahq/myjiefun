"use client"

import { useEffect, useRef } from "react"

type KissCamCanvasCompositorProps = {
  video: HTMLVideoElement | null
  enabled: boolean
  layout: "center" | "portrait" | "rounded" | "full"
  fadeIn: boolean
  className?: string
}

/**
 * Draws the live camera into a cinematic frame with warm grading + vignette.
 * Keeps the <video> element off-DOM / hidden; only the canvas is shown.
 */
export function KissCamCanvasCompositor({
  video,
  enabled,
  layout,
  fadeIn,
  className = "",
}: KissCamCanvasCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const opacityRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) {
      opacityRef.current = 0
      return
    }

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const draw = () => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const parent = canvas.parentElement
      const w = parent?.clientWidth || 640
      const h = parent?.clientHeight || 360
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.clearRect(0, 0, w, h)

      const targetOpacity = video && video.readyState >= 2 ? 1 : 0
      opacityRef.current += (targetOpacity - opacityRef.current) * (fadeIn ? 0.04 : 0.2)

      if (opacityRef.current < 0.01 || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      // Frame geometry
      let fw = w * 0.42
      let fh = h * 0.52
      let fx = (w - fw) / 2
      let fy = h * 0.18
      let radius = 18

      if (layout === "portrait") {
        fw = w * 0.28
        fh = h * 0.58
        fx = (w - fw) / 2
        fy = h * 0.14
        radius = 22
      } else if (layout === "rounded") {
        fw = w * 0.38
        fh = h * 0.48
        fx = (w - fw) / 2
        fy = h * 0.16
        radius = Math.min(fw, fh) / 2
      } else if (layout === "full") {
        fw = w
        fh = h
        fx = 0
        fy = 0
        radius = 0
      }

      ctx.save()
      ctx.globalAlpha = opacityRef.current

      // Soft drop shadow
      if (layout !== "full") {
        ctx.shadowColor = "rgba(40, 20, 20, 0.45)"
        ctx.shadowBlur = 28
        ctx.shadowOffsetY = 10
      }

      roundRectPath(ctx, fx, fy, fw, fh, radius)
      ctx.clip()
      ctx.shadowColor = "transparent"

      // Cover-fit draw
      const vw = video.videoWidth || 1280
      const vh = video.videoHeight || 720
      const scale = Math.max(fw / vw, fh / vh)
      const dw = vw * scale
      const dh = vh * scale
      const dx = fx + (fw - dw) / 2
      const dy = fy + (fh - dh) / 2

      ctx.filter = "sepia(0.22) saturate(0.85) brightness(1.05) contrast(1.02)"
      ctx.drawImage(video, dx, dy, dw, dh)
      ctx.filter = "none"

      // Warm wash
      const wash = ctx.createLinearGradient(fx, fy, fx, fy + fh)
      wash.addColorStop(0, "rgba(255, 236, 210, 0.12)")
      wash.addColorStop(0.5, "rgba(232, 180, 160, 0.06)")
      wash.addColorStop(1, "rgba(90, 40, 50, 0.18)")
      ctx.fillStyle = wash
      ctx.fillRect(fx, fy, fw, fh)

      // Soft vignette inside frame
      const vig = ctx.createRadialGradient(
        fx + fw / 2,
        fy + fh / 2,
        Math.min(fw, fh) * 0.25,
        fx + fw / 2,
        fy + fh / 2,
        Math.max(fw, fh) * 0.7
      )
      vig.addColorStop(0, "rgba(0,0,0,0)")
      vig.addColorStop(1, "rgba(40, 20, 25, 0.35)")
      ctx.fillStyle = vig
      ctx.fillRect(fx, fy, fw, fh)

      ctx.restore()

      // Gold hairline border
      if (layout !== "full") {
        ctx.save()
        ctx.globalAlpha = opacityRef.current * 0.9
        ctx.strokeStyle = "rgba(184, 149, 106, 0.85)"
        ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.002)
        roundRectPath(ctx, fx, fy, fw, fh, radius)
        ctx.stroke()
        ctx.strokeStyle = "rgba(255, 248, 235, 0.35)"
        ctx.lineWidth = 1
        roundRectPath(ctx, fx + 3, fy + 3, fw - 6, fh - 6, Math.max(0, radius - 3))
        ctx.stroke()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [video, enabled, layout, fadeIn])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  )
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}
