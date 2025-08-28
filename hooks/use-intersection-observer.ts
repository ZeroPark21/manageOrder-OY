import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverProps {
  threshold?: number
  root?: Element | null
  rootMargin?: string
  freezeOnceVisible?: boolean
}

export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0%',
  freezeOnceVisible = false
}: UseIntersectionObserverProps = {}) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const [isVisible, setIsVisible] = useState(false)
  const frozen = useRef(false)
  
  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    setEntry(entry)
    setIsVisible(entry.isIntersecting)
    
    if (entry.isIntersecting && freezeOnceVisible) {
      frozen.current = true
    }
  }
  
  useEffect(() => {
    const node = document.querySelector('[data-intersection-root]')
    const hasIOSupport = !!window.IntersectionObserver
    
    if (!hasIOSupport || frozen.current || !node) return
    
    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)
    
    observer.observe(node)
    
    return () => observer.disconnect()
  }, [threshold, root, rootMargin, freezeOnceVisible])
  
  return { entry, isVisible }
}