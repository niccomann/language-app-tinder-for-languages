import { readFirstVocabularyOnboardingDone } from '../components/firstVocabularyOnboardingMeta';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';
import type { FeatureGuideId } from './featureGuideIds';

export const FEATURE_GUIDE_STORAGE_PREFIX = 'languageApp:featureGuideSeen:';

export function featureGuideStorageKey(guideId: FeatureGuideId) {
  return `${FEATURE_GUIDE_STORAGE_PREFIX}${guideId}`;
}

export function hasSeenFeatureGuide(guideId: FeatureGuideId) {
  return readStorageValue(featureGuideStorageKey(guideId)) === 'true';
}

export function markFeatureGuideSeen(guideId: FeatureGuideId) {
  writeStorageValue(featureGuideStorageKey(guideId), 'true');
}

export function shouldDeferGuideUntilVocabularyScan(pathname = readCurrentPathname()) {
  return !readFirstVocabularyOnboardingDone() && pathname === '/';
}

function readCurrentPathname() {
  try {
    return window.location.pathname;
  } catch {
    return '';
  }
}
