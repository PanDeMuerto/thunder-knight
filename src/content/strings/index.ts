import { DE } from './de';
import { EN, type StringKey } from './en';
import { ES } from './es';
import { FR } from './fr';
import { IT } from './it';
import { JA } from './ja';
import { KO } from './ko';
import { PT } from './pt';
import { RU } from './ru';
import { TR } from './tr';
import { ZH } from './zh';

type Table = Partial<Record<StringKey, string>>;

/**
 * Every language, with a table of the same keys (`tests/strings.test.ts` checks every key and placeholder). Missing
 * keys fall back to English. Poki's eleven (M11), by the base code Poki and the browser give (`pt` is Brazilian
 * Portuguese, `zh` Simplified Chinese). The ten translations are written from `tools/strings/<code>.txt` by
 * `python tools/strings/build_strings.py`.
 */
const TABLES: Record<string, Table> = {
  en: EN,
  fr: FR,
  it: IT,
  de: DE,
  es: ES,
  pt: PT,
  tr: TR,
  ru: RU,
  zh: ZH,
  ja: JA,
  ko: KO,
};

/** Each language by its own name, for the picker in Pause. */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  tr: 'Türkçe',
  ru: 'Русский',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
};

/** Every table, for tests. */
export const LANGUAGE_TABLES: Readonly<Record<string, Table>> = TABLES;

let active: Table = EN;
let activeCode = 'en';

export const SUPPORTED_LANGUAGES = Object.keys(TABLES);

export function setLanguage(code: string): void {
  active = TABLES[code] ?? EN;
  activeCode = TABLES[code] ? code : 'en';
}

export function currentLanguage(): string {
  return activeCode;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let text: string = active[key] ?? EN[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function isStringKey(key: string): key is StringKey {
  return key in EN;
}

export type { StringKey };
