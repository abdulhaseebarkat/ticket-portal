// Shared chart color roles, one place so every chart on the dashboard draws
// from the same validated palette instead of each picking its own hues.
// Dark-mode steps only - this app is a fixed dark UI, no light theme.
// Every multi-color combination here has been run through the dataviz
// skill's validator (scripts/validate_palette.js) against this app's dark
// chart surface (#0f172a) - ALL CHECKS PASS for each grouping below.

// Categorical hues, fixed order (never cycled/reassigned by filters).
export const categorical = [
  '#3987e5', // 1 blue
  '#d95926', // 2 orange
  '#199e70', // 3 aqua
  '#c98500', // 4 yellow
  '#d55181', // 5 magenta
  '#008300', // 6 green
  '#9085e9', // 7 violet
  '#e66767', // 8 red
];

// Sequential single-hue roles for magnitude comparisons (bar charts where
// bars differ in length, not identity). Two used together (e.g. volume vs.
// time for the same dimension) get adjacent slots so they read as related
// but distinct.
export const sequentialPrimary = categorical[0]; // blue - complaint volume
export const sequentialSecondary = categorical[1]; // orange - resolution time

// Status colors for the stacked status-breakdown bar. Rendered in exactly
// this sequence (OPEN -> IN_PROGRESS -> WAITING -> REOPENED -> CLOSED ->
// RESOLVED) so every adjacent pair in the actual stack is a validated-safe
// consecutive run of the categorical palette (slots 1-6, in order).
export const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'WAITING', 'REOPENED', 'CLOSED', 'RESOLVED'];
export const statusColors: Record<string, string> = {
  OPEN: categorical[0], // blue
  IN_PROGRESS: categorical[1], // orange
  WAITING: categorical[2], // aqua
  REOPENED: categorical[3], // yellow
  CLOSED: categorical[4], // magenta
  RESOLVED: categorical[5], // green
};

// Trend chart (open vs. resolved over time) - reuses the same blue/green
// roles as the status chart above for a consistent color language.
export const trendOpen = categorical[0]; // blue
export const trendResolved = categorical[5]; // green

// Reserved status/severity palette - never reused for generic series, kept
// distinct from the categorical set by design. Priority is a severity axis
// (Low -> Critical), not an identity axis, so it draws from here instead of
// the categorical hues.
export const severity = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};
export const priorityColors: Record<string, string> = {
  LOW: severity.good,
  MEDIUM: severity.warning,
  HIGH: severity.serious,
  CRITICAL: severity.critical,
};
export const PRIORITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const chartTooltipStyle = {
  backgroundColor: '#0f172a',
  borderRadius: 12,
  border: '1px solid #334155',
  color: '#e2e8f0',
};

export const axisColor = '#94a3b8';
export const gridColor = '#334155';

/**
 * A single-hue "how full" background for a heatmap cell - never color
 * alone, the caller still prints the count as text. `ratio` is 0-1 (this
 * cell's count relative to the grid's max).
 */
export const heatmapCellColor = (ratio: number, hueRgb = '57, 135, 229') => {
  const alpha = ratio <= 0 ? 0.06 : 0.15 + ratio * 0.75;
  return `rgba(${hueRgb}, ${alpha.toFixed(2)})`;
};
