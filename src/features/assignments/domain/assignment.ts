export const ASSIGNMENT_STATUSES = ["pending", "confirmed", "done"] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface Assignment {
  id: string;
  partId: string;
  assignee: string;
  assistant?: string | null;
  status: AssignmentStatus;
}
