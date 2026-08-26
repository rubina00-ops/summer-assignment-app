export type AssignmentType = "writing" | "report" | "drawing";
export type AssignmentStatus = "submitted" | "revision_requested" | "approved";

export type PublicAssignment = {
  id: string;
  assignment_type: AssignmentType;
  title: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  status: AssignmentStatus;
  revision_message?: string | null;
  created_at: string;
  signed_url?: string | null;
};

export type BoardStudent = {
  id: string;
  slot_no: number;
  nickname: string;
  emoji: string;
  assignments: PublicAssignment[];
};
