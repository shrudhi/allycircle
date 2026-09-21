import { fieldsSharePracticeArea } from "@/lib/config/fields";
import { isTakingABreak } from "@/lib/domain/types";

export type EligibilityPerson = {
  id: string;
  fieldId: string;
  fieldCustom?: string | null;
  experienceYears: number;
  openToBeInterviewed: boolean;
  openToInterviewOthers: boolean;
  disabled?: boolean;
};

export function canInterview(
  interviewer: EligibilityPerson,
  candidate: EligibilityPerson,
  pairAllowed: boolean
) {
  if (!pairAllowed) return false;
  if (interviewer.id === candidate.id) return false;
  if (interviewer.disabled || candidate.disabled) return false;
  if (!interviewer.openToInterviewOthers) return false;
  if (isTakingABreak(interviewer)) return false;
  if (!fieldsSharePracticeArea(interviewer, candidate)) return false;
  if (interviewer.experienceYears < candidate.experienceYears) return false;
  return true;
}

export function canOfferReciprocalSwap(
  a: EligibilityPerson,
  b: EligibilityPerson,
  pairAllowed: boolean
) {
  return (
    a.openToBeInterviewed &&
    b.openToBeInterviewed &&
    a.openToInterviewOthers &&
    b.openToInterviewOthers &&
    canInterview(a, b, pairAllowed) &&
    canInterview(b, a, pairAllowed)
  );
}

export function canAppearInMarketplace(person: EligibilityPerson) {
  return !person.disabled && !isTakingABreak(person) && person.openToInterviewOthers;
}
