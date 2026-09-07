import { Fragment } from 'react';
import { heatmapCellColor } from '../../lib/chartColors';

interface HeatmapProps {
  rows: string[];
  columns: string[];
  /** value(row, column) -> count. Missing pairs are treated as 0. */
  value: (row: string, column: string) => number;
}

/**
 * A department x category grid - the one chart that shows both dimensions
 * at once. Built as a plain HTML/CSS grid (recharts has no heatmap
 * primitive); cell shading is one hue scaled by that cell's share of the
 * grid's max, and every cell still prints its number so meaning is never
 * color-only.
 */
export function Heatmap({ rows, columns, value }: HeatmapProps) {
  const max = Math.max(1, ...rows.flatMap((row) => columns.map((column) => value(row, column))));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-1.5"
        style={{ gridTemplateColumns: `140px repeat(${columns.length}, minmax(80px, 1fr))` }}
      >
        <div />
        {columns.map((column) => (
          <div key={column} className="truncate px-1 pb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400" title={column}>
            {column}
          </div>
        ))}
        {rows.map((row) => (
          <Fragment key={row}>
            <div className="truncate py-2 pr-2 text-sm font-medium text-slate-300" title={row}>
              {row}
            </div>
            {columns.map((column) => {
              const count = value(row, column);
              return (
                <div
                  key={`${row}-${column}`}
                  className="flex items-center justify-center rounded-lg py-2 text-sm font-semibold text-slate-100"
                  style={{ backgroundColor: heatmapCellColor(count / max) }}
                  title={`${row} · ${column}: ${count}`}
                >
                  {count > 0 ? count : <span className="text-slate-600">0</span>}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
