export interface DialectVariant {
  region: string;
  regionId: string;
  dialect: string;
  variant: string;
  pronunciation?: string;
}

export interface WordDialects {
  standardGerman: string;
  translation: string;
  variants: DialectVariant[];
}

export const GERMAN_REGIONS = [
  { id: 'bayern', name: 'Bayern', dialect: 'Bairisch', color: '#3B82F6' },
  { id: 'sachsen', name: 'Sachsen', dialect: 'Sächsisch', color: '#10B981' },
  { id: 'schwaben', name: 'Schwaben', dialect: 'Schwäbisch', color: '#F59E0B' },
  { id: 'berlin', name: 'Berlin', dialect: 'Berlinerisch', color: '#EF4444' },
  { id: 'koeln', name: 'Köln/Rheinland', dialect: 'Kölsch', color: '#8B5CF6' },
  { id: 'hamburg', name: 'Hamburg/Nord', dialect: 'Plattdeutsch', color: '#06B6D4' },
  { id: 'franken', name: 'Franken', dialect: 'Fränkisch', color: '#EC4899' },
  { id: 'oesterreich', name: 'Österreich', dialect: 'Österreichisch', color: '#84CC16' },
];

export const DIALECT_DATA: Record<string, WordDialects> = {
  'Brötchen': {
    standardGerman: 'Brötchen',
    translation: 'Panino',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Semmel' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Bemme' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Weckle' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Schrippe' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Röggelchen' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Rundstück' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Weggla' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Semmel' },
    ]
  },
  'Kartoffel': {
    standardGerman: 'Kartoffel',
    translation: 'Patata',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Erdapfel' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Ardäppl' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Grombira' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Kartoffel' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Ääpel' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Tüffel' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Bodaggn' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Erdäpfel' },
    ]
  },
  'Junge': {
    standardGerman: 'Junge',
    translation: 'Ragazzo',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Bua' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Gunge' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Bub' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Jöre' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Jung' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Jung' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Bou' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Bub' },
    ]
  },
  'Mädchen': {
    standardGerman: 'Mädchen',
    translation: 'Ragazza',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Madl / Dirndl' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Mädl' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Mädle' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Göre' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Mädsche' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Deern' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Mädla' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Madl' },
    ]
  },
  'sprechen': {
    standardGerman: 'sprechen',
    translation: 'Parlare',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'redn' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'rädn' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'schwätza' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'quatschen' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'kalle' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'snacken' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'babbln' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'reden' },
    ]
  },
  'schauen': {
    standardGerman: 'schauen',
    translation: 'Guardare',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'schaug\'n' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'gucken' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'luga' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'kieken' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'luure' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'kieken' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'gucka' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'schauen' },
    ]
  },
  'lecker': {
    standardGerman: 'lecker',
    translation: 'Buono/Gustoso',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'gschmackig' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'lecker' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'schmeckig' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'lecker' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'lecker' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'lecker' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'guud' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'guat' },
    ]
  },
  'Geld': {
    standardGerman: 'Geld',
    translation: 'Soldi',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Goid' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Gäld' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Geld' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Knete / Moos' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Jeld' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Geld' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Gäld' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Geld / Schilling' },
    ]
  },
  'Kopf': {
    standardGerman: 'Kopf',
    translation: 'Testa',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'Grind / Schädl' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'Kopp' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'Grind' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'Birne / Rübe' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'Kopp' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'Kopp' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'Kobf' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'Schädl' },
    ]
  },
  'arbeiten': {
    standardGerman: 'arbeiten',
    translation: 'Lavorare',
    variants: [
      { region: 'Bayern', regionId: 'bayern', dialect: 'Bairisch', variant: 'schaffn' },
      { region: 'Sachsen', regionId: 'sachsen', dialect: 'Sächsisch', variant: 'arweeten' },
      { region: 'Schwaben', regionId: 'schwaben', dialect: 'Schwäbisch', variant: 'schaffa' },
      { region: 'Berlin', regionId: 'berlin', dialect: 'Berlinerisch', variant: 'malochen' },
      { region: 'Köln/Rheinland', regionId: 'koeln', dialect: 'Kölsch', variant: 'schaffe' },
      { region: 'Hamburg/Nord', regionId: 'hamburg', dialect: 'Plattdeutsch', variant: 'arbeiten' },
      { region: 'Franken', regionId: 'franken', dialect: 'Fränkisch', variant: 'schaffn' },
      { region: 'Österreich', regionId: 'oesterreich', dialect: 'Österreichisch', variant: 'hackln' },
    ]
  },
};

export function getDialectForWord(word: string): WordDialects | null {
  const normalizedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return DIALECT_DATA[normalizedWord] || DIALECT_DATA[word] || null;
}

export function getAvailableDialectWords(): string[] {
  return Object.keys(DIALECT_DATA);
}

export function getRegionColor(regionId: string): string {
  const region = GERMAN_REGIONS.find(r => r.id === regionId);
  return region?.color || '#64748B';
}
