'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'

interface ScreenshotCaptureProps {
  onCapture: (dataUrl: string) => void
  onCancel: () => void
}

type MarkupTool = 'arrow' | 'rect' | 'circle' | 'text' | 'freehand'
type MarkupColor = '#EF4444' | '#F59E0B' | '#22C55E' | '#3B82F6' | '#FFFFFF'

interface MarkupItem {
  id: string
  tool: MarkupTool
  color: string
  startX: number
  startY: number
  endX: number
  endY: number
  text?: string
  points?: { x: number; y: number }[]
}

export default function ScreenshotCapture({ onCapture, onCancel }: ScreenshotCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'capturing' | 'editing' | 'error'>('capturing')
  const [tool, setTool] = useState<MarkupTool>('arrow')
  const [color, setColor] = useState<MarkupColor>('#EF4444')
  const [markups, setMarkups] = useState<MarkupItem[]>([])
  const [drawing, setDrawing] = useState(false)
  const [currentMarkup, setCurrentMarkup] = useState<MarkupItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null)

  const captureScreen = useCallback(async () => {
    setPhase('capturing')

    // Wait one frame for React to unmount this component's UI from the DOM
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    try {
      const dataUrl = await toPng(document.documentElement, {
        cacheBust: true,
        pixelRatio: 1,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        style: {
          transform: `translate(-${window.scrollX}px, -${window.scrollY}px)`,
        },
        filter: (node) => {
          // Skip elements marked to ignore
          if (node instanceof HTMLElement && node.hasAttribute('data-html2canvas-ignore')) {
            return false
          }
          return true
        },
      })

      setCapturedDataUrl(dataUrl)
      setPhase('editing')
    } catch (err) {
      console.error('Screenshot capture failed:', err)
      setError('Failed to capture screenshot. Please try again.')
      setPhase('error')
    }
  }, [])

  // Auto-capture on mount
  useEffect(() => {
    captureScreen()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Draw captured image to canvas when entering edit mode
  useEffect(() => {
    if (phase !== 'editing' || !capturedDataUrl) return

    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)

      const overlay = overlayCanvasRef.current
      if (overlay) {
        overlay.width = img.width
        overlay.height = img.height
      }
    }
    img.src = capturedDataUrl
  }, [phase, capturedDataUrl])

  // Redraw markups on overlay canvas
  const redrawMarkups = useCallback((items: MarkupItem[], current?: MarkupItem | null) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const allItems = current ? [...items, current] : items
    for (const m of allItems) {
      ctx.strokeStyle = m.color
      ctx.fillStyle = m.color
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      switch (m.tool) {
        case 'arrow': {
          const dx = m.endX - m.startX
          const dy = m.endY - m.startY
          const angle = Math.atan2(dy, dx)
          const headLen = 16

          ctx.beginPath()
          ctx.moveTo(m.startX, m.startY)
          ctx.lineTo(m.endX, m.endY)
          ctx.stroke()

          ctx.beginPath()
          ctx.moveTo(m.endX, m.endY)
          ctx.lineTo(m.endX - headLen * Math.cos(angle - Math.PI / 6), m.endY - headLen * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(m.endX - headLen * Math.cos(angle + Math.PI / 6), m.endY - headLen * Math.sin(angle + Math.PI / 6))
          ctx.closePath()
          ctx.fill()
          break
        }
        case 'rect':
          ctx.strokeRect(m.startX, m.startY, m.endX - m.startX, m.endY - m.startY)
          break
        case 'circle': {
          const rx = Math.abs(m.endX - m.startX) / 2
          const ry = Math.abs(m.endY - m.startY) / 2
          const cx = (m.startX + m.endX) / 2
          const cy = (m.startY + m.endY) / 2
          ctx.beginPath()
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          ctx.stroke()
          break
        }
        case 'freehand':
          if (m.points && m.points.length > 1) {
            ctx.beginPath()
            ctx.moveTo(m.points[0].x, m.points[0].y)
            for (let i = 1; i < m.points.length; i++) {
              ctx.lineTo(m.points[i].x, m.points[i].y)
            }
            ctx.stroke()
          }
          break
        case 'text':
          if (m.text) {
            ctx.font = 'bold 18px -apple-system, sans-serif'
            ctx.fillText(m.text, m.startX, m.startY)
          }
          break
      }
    }
  }, [])

  const getCanvasCoords = (e: React.MouseEvent) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return { x: 0, y: 0 }
    const rect = overlay.getBoundingClientRect()
    const scaleX = overlay.width / rect.width
    const scaleY = overlay.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (phase !== 'editing' || tool === 'text') return
    const { x, y } = getCanvasCoords(e)
    setDrawing(true)

    const newMarkup: MarkupItem = {
      id: Date.now().toString(),
      tool,
      color,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      points: tool === 'freehand' ? [{ x, y }] : undefined,
    }
    setCurrentMarkup(newMarkup)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !currentMarkup) return
    const { x, y } = getCanvasCoords(e)

    const updated = { ...currentMarkup, endX: x, endY: y }
    if (currentMarkup.tool === 'freehand' && currentMarkup.points) {
      updated.points = [...currentMarkup.points, { x, y }]
    }
    setCurrentMarkup(updated)
    redrawMarkups(markups, updated)
  }

  const handleMouseUp = () => {
    if (!drawing || !currentMarkup) return
    setDrawing(false)
    setMarkups([...markups, currentMarkup])
    setCurrentMarkup(null)
    redrawMarkups([...markups, currentMarkup])
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== 'text' || phase !== 'editing') return
    const { x, y } = getCanvasCoords(e)
    const text = prompt('Enter text annotation:')
    if (text) {
      const newMarkup: MarkupItem = {
        id: Date.now().toString(),
        tool: 'text',
        color,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        text,
      }
      const updated = [...markups, newMarkup]
      setMarkups(updated)
      redrawMarkups(updated)
    }
  }

  const handleUndo = () => {
    const updated = markups.slice(0, -1)
    setMarkups(updated)
    redrawMarkups(updated)
  }

  const handleSave = () => {
    const canvas = document.createElement('canvas')
    const base = canvasRef.current
    const overlay = overlayCanvasRef.current
    if (!base || !overlay) return

    canvas.width = base.width
    canvas.height = base.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(base, 0, 0)
    ctx.drawImage(overlay, 0, 0)

    const dataUrl = canvas.toDataURL('image/png')
    onCapture(dataUrl)
  }

  const toolsList: { id: MarkupTool; label: string; icon: string }[] = [
    { id: 'arrow', label: 'Arrow', icon: '↗' },
    { id: 'rect', label: 'Rectangle', icon: '□' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'freehand', label: 'Draw', icon: '✎' },
    { id: 'text', label: 'Text', icon: 'T' },
  ]

  const colors: MarkupColor[] = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#FFFFFF']

  // While capturing, show a small toast so the user knows it's working
  // Marked data-html2canvas-ignore so it won't appear in the capture
  if (phase === 'capturing') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" data-html2canvas-ignore>
        <div className="bg-gray-900/95 border border-gray-700 rounded-xl px-6 py-4 text-center shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">Capturing screenshot...</p>
              <p className="text-xs text-gray-400 mt-0.5">The markup toolbar will appear at the top when ready.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" data-html2canvas-ignore>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center max-w-md">
          <p className="text-sm text-amber-300 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={captureScreen}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Editing phase — markup editor
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-html2canvas-ignore>
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {toolsList.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
                tool === t.id
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {t.icon}
            </button>
          ))}

          <div className="w-px h-6 bg-gray-700 mx-2" />

          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? 'border-white scale-125' : 'border-gray-600'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="w-px h-6 bg-gray-700 mx-2" />

          <button
            onClick={handleUndo}
            disabled={markups.length === 0}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed"
          >
            Undo
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-lg"
          >
            Save Screenshot
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full"
            style={{ display: 'block' }}
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 max-w-full max-h-full"
            style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
          />
        </div>
      </div>
    </div>
  )
}
