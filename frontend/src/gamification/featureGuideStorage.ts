import { readFirstVocabularyOnboardingDone } from '../components/firstVocabularyOnboardingMeta';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';
import type { FeatureGuideId } from './featureGuideIds';

export const FEATURE_GUIDE_STORAGE_PREFIX = 'languageApp:featureGuideSeen:';
export const FEATURE_GUIDE_GLOBAL_DISMISS_KEY = 'languageApp:featureGuideDismissedAll:v1';

export function featureGuideStorageKey(guideId: FeatureGuideId) {
  return `${FEATURE_GUIDE_STORAGE_PREFIX}${guideId}`;
}

export function hasDismissedAllFeatureGuides() {
  return readStorageValue(FEATURE_GUIDE_GLOBAL_DISMISS_KEY) === 'true';
}

export function markAllFeatureGuidesDismissed() {
  writeStorageValue(FEATURE_GUIDE_GLOBAL_DISMISS_KEY, 'true');
}

export function hasSeenFeatureGuide(guideId: FeatureGuideId) {
  if (hasDismissedAllFeatureGuides()) return true;
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
