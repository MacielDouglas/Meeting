export type MeetingPdfAssigneeRole =
  | "chairman"
  | "conductor"
  | "reader"
  | "assistant"
  | "prayer"
  | "other";

export type MeetingPdfAssignee = {
  name: string;
  role?: MeetingPdfAssigneeRole;
};

export type MeetingPdfItemEmphasis = "normal" | "song" | "opening" | "conclusion" | "study";

export type MeetingPdfItem = {
  id: string;
  time?: string;
  title?: string;
  subtitle?: string;
  assignees?: MeetingPdfAssignee[];
  emphasis?: MeetingPdfItemEmphasis;
  durationMin?: number;
  compactAfter?: boolean;
  gapAfterMin?: number;
};

export type MeetingPdfSectionKey =
  | "bibleTreasures"
  | "applyYourself"
  | "christianLife"
  | "publicTalk"
  | "watchtowerStudy";

export type MeetingPdfSection = {
  key: MeetingPdfSectionKey;
  title?: string;
  subtitle?: string;
  items: MeetingPdfItem[];
};

export type MeetingPdfData = {
  id: string;
  date: string;
  congregationName: string;
  weekLabel?: string;
  startTime?: string;
  openingItem?: MeetingPdfItem;
  introduction?: MeetingPdfItem;
  leadItems?: MeetingPdfItem[];
  sections: MeetingPdfSection[];
  conclusion?: MeetingPdfItem;
  closingItem?: MeetingPdfItem;
};
