/** Mapeia a parte da reunião ao campo de habilitação da pessoa. */
export type MeetingCapability =
  | "president"
  | "prayer"
  | "treasuresTalk"
  | "pearlsQuest"
  | "bibleReading"
  | "ministry"
  | "living"
  | "congregationStudy"
  | "publicTalk"
  | "watchtowerStudy";

export function capabilityField(capability: string | undefined): string | null {
  switch (capability) {
    case "president":
      return "midweekChairman";
    case "treasuresTalk":
      return "treasuresTalk";
    case "pearlsQuest":
      return "pearlsQuest";
    case "bibleReading":
      return "bibleReading";
    case "ministry":
      return null;
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
      return "helper";
    case "congregationStudy":
      return "studyReader";
    case "watchtowerStudy":
      return "watchtowerReader";
    default:
      return null;
  }
}
