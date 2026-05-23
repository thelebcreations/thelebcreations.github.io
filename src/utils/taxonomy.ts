import {
  CATEGORIE_OPTIONS,
  THEME_OPTIONS,
  STATUT_OPTIONS,
} from '../../tina/options';

type LabeledValue = { value: string; label: string };

const toLabelMap = (options: readonly LabeledValue[]): Record<string, string> =>
  Object.fromEntries(options.map(({ value, label }) => [value, label]));

const CATEGORY_LABELS = toLabelMap(CATEGORIE_OPTIONS);
const THEME_LABELS = toLabelMap(THEME_OPTIONS);
const STATUT_LABELS = toLabelMap(STATUT_OPTIONS);

export const getCategoryLabel = (value: string): string =>
  CATEGORY_LABELS[value] ?? value;

export const getThemeLabel = (value: string): string =>
  THEME_LABELS[value] ?? value;

export const getStatutLabel = (value: string): string =>
  STATUT_LABELS[value] ?? value;
