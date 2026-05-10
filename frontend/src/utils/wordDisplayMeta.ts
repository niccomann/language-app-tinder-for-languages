export const GENDER_BADGE_META_BY_LANG: Record<string, Record<string, { article: string; color: string }>> = {
  de: {
    masculine: { article: 'der', color: 'bg-blue-500' },
    feminine: { article: 'die', color: 'bg-pink-500' },
    neuter: { article: 'das', color: 'bg-green-500' },
  },
  fr: {
    masculine: { article: 'le', color: 'bg-blue-500' },
    feminine: { article: 'la', color: 'bg-pink-500' },
  },
};

export function genderBadge(language: string, gender: string | null | undefined) {
  if (!gender) return undefined;
  return GENDER_BADGE_META_BY_LANG[language]?.[gender];
}

// Back-compat: keep the old export pointing to German for any straggler code path.
export const GENDER_BADGE_META = GENDER_BADGE_META_BY_LANG.de;
