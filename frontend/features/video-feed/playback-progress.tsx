"use client"
import { memo, RefObject, useEffect, useState } from 'react'

/** timeupdate changes only this small subtree, not the card, menus or comments. */
export const PlaybackProgress = memo(function PlaybackProgress({video}: {video: RefObject<HTMLVideoElement>}) {
  const [position, setPosition] = useState({time: 0, duration: 0})
  useEffect(() => {
    const element = video.current
    if (!element) return
    const update = () => setPosition({time: element.currentTime, duration: Number.isFinite(element.duration) ? element.duration : 0})
    element.addEventListener('timeupdate', update)
    element.addEventListener('loadedmetadata', update)
    update()
    return () => {
      element.removeEventListener('timeupdate', update)
      element.removeEventListener('loadedmetadata', update)
    }
  }, [video])
  return <progress aria-label="Прогресс видео" className="h-1 w-full accent-sky-500" value={position.time} max={position.duration || 1}/>
})
