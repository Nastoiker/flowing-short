"use client"
import { useCallback, useEffect, useRef, useState } from 'react'

/** One media lifecycle: no network request on mount, no render per playback tick. */
export function useVideoPlayback(active: boolean, activate: () => void, onStarted: () => void, audioUrl?: string) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)
  const generation = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const pause = useCallback(() => {
    generation.current++
    videoRef.current?.pause()
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!active) pause()
  }, [active, pause])
  useEffect(() => {
    const video = videoRef.current
    const onVisibility = () => { if (document.hidden) pause() }
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause() }, {threshold: 0.1}) : null
    if (video) observer?.observe(video)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      generation.current++
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      video?.pause()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
        audioRef.current.load()
        audioRef.current = null
      }
    }
  }, [pause])
  useEffect(() => {
    generation.current++
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    audioRef.current = null
  }, [audioUrl])

  const toggle = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) { pause(); return }
    activate()
    setError('')
    const operation = ++generation.current
    try {
      await video.play()
      if (operation !== generation.current) return
      if (audioUrl) {
        audioRef.current ||= new Audio(audioUrl)
        audioRef.current.loop = true
        await audioRef.current.play().catch(() => {})
      }
      if (operation !== generation.current) return
      setPlaying(true)
      if (!startedRef.current) { startedRef.current = true; onStarted() }
    } catch { if (operation === generation.current) setError('Не удалось воспроизвести видео. Попробуйте ещё раз.') }
  }, [activate, audioUrl, onStarted, pause])
  return { videoRef, playing, toggle, pause, error }
}
