import { useId, type SVGProps } from 'react'

import { cn } from '@/lib/utils'

/*
 * Zona OS identity, rebuilt from Brand Kit v1.1. The symbol paths come from
 * the kit's ZonaLogo component; the wordmark is live text so it uses the
 * loaded Montserrat and stays crisp at any size.
 */

const symbolPaths = [
  'M89 0 H135 Q138 0 137 4 L128 23 Q124 29 118 29 H74 Q72 29 74 25 L82 8 Q85 0 89 0 Z',
  'M19 30 H67 Q70 30 69 34 L60 53 Q57 61 43 61 H2 Q-1 61 0 57 L10 36 Q14 30 19 30 Z',
  'M67 55 H124 Q128 55 126 61 L112 92 Q107 102 96 103 H45 Q41 103 43 98 L57 68 Q62 55 67 55 Z',
]

/** The three-block Zona OS symbol. Decorative unless given a `title`. */
export function ZonaSymbol({ title, className, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  const id = useId()
  return (
    <svg
      viewBox="-1 0 140 104"
      className={cn('h-8 w-auto shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#B266FF" />
          <stop offset=".58" stopColor="#8B4DF6" />
          <stop offset="1" stopColor="#692CE4" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        {symbolPaths.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

const sizes = {
  sm: { symbol: 'h-6', word: 'text-lg', descriptor: 'text-[8px] tracking-[0.32em]' },
  md: { symbol: 'h-8', word: 'text-[1.4rem]', descriptor: 'text-[9px] tracking-[0.34em]' },
  lg: { symbol: 'h-12', word: 'text-4xl', descriptor: 'text-[11px] tracking-[0.4em]' },
} as const

/** Horizontal Zona OS lockup: symbol, "Zona" in white, "OS" in purple. */
export function ZonaOSLogo({
  size = 'md',
  descriptor = false,
  className,
}: {
  size?: keyof typeof sizes
  /** Shows "PLATAFORMA OPERATIVA" under the wordmark. */
  descriptor?: boolean
  className?: string
}) {
  const s = sizes[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap', className)} role="img" aria-label="Zona OS">
      <ZonaSymbol className={s.symbol} />
      <span className="flex flex-col leading-none" aria-hidden="true">
        <span className={cn('font-display font-extrabold tracking-[-0.045em] text-white', s.word)}>
          Zona <span className="text-zona-500">OS</span>
        </span>
        {descriptor && <span className={cn('mt-1 font-medium uppercase text-slate-400', s.descriptor)}>Plataforma operativa</span>}
      </span>
    </span>
  )
}

/*
 * Zona Gol uses the approved raster art (Brand Kit v2.1): the ball with its
 * motion trail is not redrawn. Assets are 2x WebP with intrinsic sizes so the
 * aspect ratio is always kept.
 */

/** Zona Gol symbol: the ball in motion. Decorative unless given a `title`. */
export function ZonaGolMark({ className, title }: { className?: string; title?: string }) {
  return (
    <img
      src="/brand/zona-gol-simbolo.svg"
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      width={299}
      height={239}
      decoding="async"
      className={cn('h-6 w-auto shrink-0 object-contain', className)}
    />
  )
}

/** Zona Gol horizontal lockup: ball and orbit with the ZONA GOL wordmark. */
export function ZonaGolLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/zona-gol-logo.svg"
      alt="Zona Gol"
      width={835}
      height={239}
      decoding="async"
      className={cn('h-auto w-full max-w-[368px] object-contain', className)}
    />
  )
}
