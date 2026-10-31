import { useEffect, useState } from 'react'
export const useWidthScreen = () => {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update, {passive:true})
    return () => window.removeEventListener('resize', update)
  }, [])
  return width
}
