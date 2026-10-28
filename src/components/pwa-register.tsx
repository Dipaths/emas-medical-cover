'use client'
import { useEffect } from 'react'

// Registers the service worker (production only). The worker caches static assets for fast start
// and shows an offline page; it never caches /api responses or any patient data.
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ })
    }
  }, [])
  return null
}
