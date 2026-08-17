/** Known fraud sample from test_smote.csv (row index 840) — for demo only */
export const SAMPLE_FEATURES = [
  -0.5770209396345437, 1.7095871332840609, -1.5802401902150398,
  1.4759361630670078, -1.0108396624834246, -0.5780273453164237,
  -2.7630098522381523, 2.135125300728127, -1.7908843370969485,
  -4.835568105279098, 1.5250884354509235, -4.72602086703024,
  0.5087640664576899, -6.780601630768068, 0.4430943953949692,
  -4.9612727982507545, -7.324180575873486, -3.1169355103154635,
  1.8693814227701684, 1.809432843711652, 1.6454345845010645,
  0.0703813064196881, -0.6796471566201917, -0.7109529103250202,
  0.3121646080957374, 1.424148650355784, 3.899083870356413,
  1.823488737516145, -0.3060542797494781, 0.0, 0.0,
  -1.265474486668137, -0.3060542797494781, 0.0,
];

export const FEATURE_COUNT = 34;

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatProbability(value) {
  return formatPercent(value, 3);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function predictionLabel(prediction) {
  return Number(prediction) === 1 ? "FRAUD" : "LEGITIMATE";
}
