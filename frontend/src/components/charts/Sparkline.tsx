import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { useChartColors } from '@/hooks/useChartColors'

/** Mini-courbe décorative (aria-hidden) : la valeur exacte est toujours écrite en texte à côté. */
export function Sparkline({ values }: { values: number[] }) {
  const c = useChartColors()
  const data = values.map((v, i) => ({ i, v }))
  return (
    <div aria-hidden className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs><linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.series[0]} stopOpacity={0.3} /><stop offset="100%" stopColor={c.series[0]} stopOpacity={0} /></linearGradient></defs>
          <Area type="monotone" dataKey="v" stroke={c.series[0]} strokeWidth={2} fill="url(#spark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
