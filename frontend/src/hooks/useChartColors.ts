import { useMemo } from 'react'
import { useTheme } from '@/lib/theme'

export interface ChartColors { series: string[]; grid: string; axis: string; ink: string; surface: string; success: string; warning: string; danger: string }

/** Les attributs SVG de Recharts n'évaluent pas toujours var(--x) : on lit les valeurs calculées à chaque changement de thème. */
export function useChartColors(): ChartColors {
  const { resolved } = useTheme()
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement)
    const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
    return {
      series: [1, 2, 3, 4, 5, 6].map((i) => get(`--chart-${i}`, '#0a6cff')),
      grid: get('--chart-grid', '#e3e8f1'), axis: get('--chart-axis', '#5d6171'), ink: get('--ink', '#1d1d1f'), surface: get('--surface', '#fff'),
      success: get('--success', '#17703a'), warning: get('--warning', '#8f5200'), danger: get('--danger', '#b3261e'),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved])
}

export function usePrefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
