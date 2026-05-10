import type { OnboardingPreferenceAnswer, OnboardingPreferenceAnswers } from './firstVocabularyOnboardingMeta';

interface PreferenceQuestionConfig {
  multiSelect?: boolean;
}

export function isQuestionMultiSelect(question: PreferenceQuestionConfig) {
  return question.multiSelect === true;
}

export function getAnswerOptionIds(answer: OnboardingPreferenceAnswer | undefined): string[] {
  if (Array.isArray(answer)) return answer;
  return answer ? [answer] : [];
}

export function hasAnsweredQuestion(answer: OnboardingPreferenceAnswer | undefined) {
  return getAnswerOptionIds(answer).length > 0;
}

export function toggleAnswerOption(
  answers: OnboardingPreferenceAnswers,
  questionId: string,
  optionId: string,
  multiSelect: boolean,
): OnboardingPreferenceAnswers {
  if (!multiSelect) {
    return {
      ...answers,
      [questionId]: optionId,
    };
  }

  const currentOptionIds = getAnswerOptionIds(answers[questionId]);
  const nextOptionIds = currentOptionIds.includes(optionId)
    ? currentOptionIds.filter((id) => id !== optionId)
    : [...currentOptionIds, optionId];

  return {
    ...answers,
    [questionId]: nextOptionIds,
  };
}
