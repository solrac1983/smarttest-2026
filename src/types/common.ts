export type User = {
  id: string;
  email: string;
  name?: string;
  // add other fields as needed
};

export type Grade = {
  id: string;
  student_id: string;
  subject_id: string;
  company_id: string;
  class_group: string;
  grade_type: string;
  bimester: string;
  score: number;
  max_score: number;
  evaluation_name: string;
  simulado_result_id?: string | null;
  notes?: string;
  recorded_by: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type ClassGroup = {
  id: string;
  name: string;
  segment?: string;
};

export type Segment = {
  id: string;
  name: string;
};

export type Student = {
  id: string;
  name: string;
  class_group: string;
};
