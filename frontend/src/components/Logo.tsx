import type { ImgHTMLAttributes } from 'react'

export type LogoVariant = 'horizontal' | 'vertical' | 'emblem'

export interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  variant?: LogoVariant
  size?: number
  className?: string
  alt?: string
}

/**
 * Logotypes officiels du CIAT (Centre d'Innovation, d'Application et de Transfert Technologique - ISEP Amadou Trawaré) :
 * - horizontal (gauche sur photo) : logotype complet avec sigle CIAT et dénomination (page de connexion et en-tête mobile)
 * - vertical (droite sur photo) : logotype institutionnel avec emblème C centré et dénomination (barre latérale)
 * - emblem : symbole C avec histogramme et arche dorée (icône et favicon)
 */
export function Logo({
  variant = 'vertical',
  size,
  className = '',
  alt = "CIAT — Centre d'Innovation, d'Application et de Transfert Technologique",
  ...props
}: LogoProps) {
  const lightSrc = `/ciat-logo-${variant}.png`
  const darkSrc = `/ciat-logo-${variant}-dark.png`

  const style = size ? { width: size, height: 'auto', ...props.style } : props.style

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={lightSrc}
        alt={alt}
        className="logo-light block h-auto max-w-full"
        style={style}
        loading="eager"
        decoding="async"
        {...props}
      />
      <img
        src={darkSrc}
        alt={alt}
        className="logo-dark block h-auto max-w-full"
        style={style}
        loading="eager"
        decoding="async"
        {...props}
      />
    </span>
  )
}

