import { FaCircleCheck, FaCircleDot, FaFlag } from "react-icons/fa6";
import type { Assignment } from "@/features/assignments/domain/assignment";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";

interface AssignmentListProps {
  assignments: Assignment[];
}

const STATUS_LABEL: Record<Assignment["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  done: "Realizada",
};

export function AssignmentList({ assignments }: AssignmentListProps) {
  if (assignments.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">Aún no hay designaciones para esta reunión.</p>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {assignments.map((assignment) => (
        <li key={assignment.id}>
          <Card className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-sm">
              {assignment.status === "done" ? (
                <FaCircleCheck aria-hidden />
              ) : assignment.status === "confirmed" ? (
                <FaFlag aria-hidden />
              ) : (
                <FaCircleDot aria-hidden />
              )}
              <span className="font-medium">{assignment.assignee}</span>
            </div>
            <Badge variant={assignment.status === "pending" ? "outline" : "secondary"}>
              {STATUS_LABEL[assignment.status]}
            </Badge>
          </Card>
        </li>
      ))}
    </ul>
  );
}
