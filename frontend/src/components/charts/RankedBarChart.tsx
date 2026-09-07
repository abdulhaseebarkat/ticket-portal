import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { chartTooltipStyle, axisColor, gridColor } from '../../lib/chartColors';

/**
 * A horizontal bar chart for comparing magnitude across categories - sorted
 * longest-to-shortest. Pass a single `color` for a plain sequential chart
 * (bars differ in length only), or give each datum its own `color` (e.g.
 * for an ordered severity axis like priority) to color per-bar instead.
 */
export function RankedBarChart({
  data,
  color,
  valueFormatter,
  height = 260,
}: {
  data: { name: string; value: number; color?: string }[];
  color?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  const hasPerItemColor = data.some((item) => item.color);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
        <XAxis type="number" stroke={axisColor} allowDecimals={false} tickFormatter={valueFormatter} />
        <YAxis type="category" dataKey="name" stroke={axisColor} width={100} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16}>
          {hasPerItemColor && data.map((item) => <Cell key={item.name} fill={item.color || color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
