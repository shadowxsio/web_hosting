import { useEffect, useState } from 'react'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Deux photos (départ / fin) en fondu enchaîné, façon GIF. */
export function PhotoPair({ srcs, alt, className = '' }: { srcs: [string, string]; alt: string; className?: string }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (reduced()) return
    const id = window.setInterval(() => setFrame((f) => 1 - f), 1100)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className={`relative overflow-hidden bg-paper-2 ${className}`}>
      {srcs.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${alt} — position ${i + 1}`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === i ? 1 : 0 }}
        />
      ))}
    </div>
  )
}

/** Photos d'un étirement du retour au calme. */
export const stretchPhotos = (id: string): [string, string] => [`${import.meta.env.BASE_URL}demos/stretch-${id}-0.webp`, `${import.meta.env.BASE_URL}demos/stretch-${id}-1.webp`]
