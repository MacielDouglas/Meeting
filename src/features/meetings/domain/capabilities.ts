/** Mapeia a parte da reunião ao campo de habilitação da pessoa. */
export type MeetingCapability =
  | "president"
  | "weekendOpening"
  | "prayer"
  | "treasuresTalk"
  | "pearlsQuest"
  | "bibleReading"
  | "ministry"
  | "ministryStart"
  | "ministryReturn"
  | "ministryDisciples"
  | "ministryExplainStaging"
  | "ministrySpeech"
  | "ministryElder"
  | "living"
  | "congregationStudy"
  | "publicTalk"
  | "watchtowerStudy";

export function capabilityField(capability: string | undefined): string | null {
  switch (capability) {
    case "president":
      return "midweekChairman";
    case "prayer":
      return "prayer";
    case "weekendOpening":
      return "publicChairman";
    case "treasuresTalk":
      return "treasuresTalk";
    case "pearlsQuest":
      return "pearlsQuest";
    case "bibleReading":
      return "bibleReading";
    case "ministry":
      return null;
    case "ministryStart":
      return "startConversations";
    case "ministryReturn":
      return "returnVisits";
    case "ministryDisciples":
      return "makeDisciples";
    case "ministryExplainStaging":
      return "explainBeliefs";
    case "ministrySpeech":
      return "betterSpeech";
    case "ministryElder":
      return "elderOrServant";
    case "living":
      return "analysisTalk";
    case "congregationStudy":
      return "bibleStudy";
    case "publicTalk":
      return "publicTalk";
    case "watchtowerStudy":
      return "watchtowerConductor";
    default:
      return null;
  }
}

export function helperCapabilityField(capability: string | undefined): string | null {
  switch (capability) {
    case "ministry":
    case "ministryStart":
    case "ministryReturn":
    case "ministryDisciples":
    case "ministryExplainStaging":
      return "helper";
    case "congregationStudy":
      return "studyReader";
    case "watchtowerStudy":
      return "watchtowerReader";
    default:
      return null;
  }
}

/** Regra de elegibilidade do ajudante em relação ao titular. */
export type HelperRule = "sameSex" | "sameSexOrFamily";

export function helperRuleFor(capability: string | undefined): HelperRule | null {
  switch (capability) {
    case "ministry":
    case "ministryStart":
    case "ministryExplainStaging":
      return "sameSexOrFamily";
    case "ministryReturn":
    case "ministryDisciples":
      return "sameSex";
    default:
      return null;
  }
}

interface HelperCandidate {
  id: string;
  sex: "male" | "female";
  familyGroupId: string | null;
}

/** Verifica se o ajudante pode acompanhar o titular (mesmo sexo e/ou família). */
export function isEligibleHelper<T extends HelperCandidate, H extends HelperCandidate>(
  titular: T,
  helper: H,
  rule: HelperRule | null,
): boolean {
  if (helper.id === titular.id) return false;
  if (rule === "sameSex") return helper.sex === titular.sex;
  if (rule === "sameSexOrFamily") {
    if (helper.sex === titular.sex) return true;
    return titular.familyGroupId != null && helper.familyGroupId === titular.familyGroupId;
  }
  return true;
}
