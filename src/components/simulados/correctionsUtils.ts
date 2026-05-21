import type { Simulado, SimuladoSubject } from "@/lib/simuladoTypes";

export interface SimuladoResult {
  id: string;
  simulado_id: string;
  student_id: string;
  answers: Record<string, string>;
  score: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  student_name?: string;
  student_roll?: string;
}

export interface CorrectionPreview {
  correct: number;
  wrong: number;
  blank: number;
  score: number;
}

export function parseAnswerKey(subjects: SimuladoSubject[]): Record<number, string> {
  const key: Record<number, string> = {};
  let currentQ = 1;

  for (const subject of subjects) {
    if (subject.type === "discursiva") continue;

    if (!subject.answer_key?.trim()) {
      currentQ += subject.question_count;
      continue;
    }

    const raw = subject.answer_key.trim();
    const pairs = raw.split(/[,;\n]+/).map((value) => value.trim()).filter(Boolean);
    let offset = 0;

    for (const pair of pairs) {
      const matchNum = pair.match(/^(\d+)\s*[-).:\s]+\s*([A-Ea-e])/);
      if (matchNum) {
        const qNum = parseInt(matchNum[1]);
        key[qNum] = matchNum[2].toUpperCase();
      } else {
        const matchLetter = pair.match(/^([A-Ea-e])$/);
        if (matchLetter) {
          key[currentQ + offset] = matchLetter[1].toUpperCase();
          offset++;
        }
      }
    }

    currentQ += subject.question_count;
  }

  return key;
}

export function buildQuestionSubjects(selectedSim?: Simulado | null): { num: number; subject: string }[] {
  if (!selectedSim) return [];

  const questionSubjects: { num: number; subject: string }[] = [];
  let q = 1;

  for (const subject of selectedSim.subjects) {
    if (subject.type === "discursiva") continue;

    for (let i = 0; i < subject.question_count; i++) {
      questionSubjects.push({ num: q, subject: subject.subject_name });
      q++;
    }
  }

  return questionSubjects;
}

export function buildCorrectionPreview(
  answers: Record<string, string>,
  answerKey: Record<number, string>,
  totalQuestions: number
): CorrectionPreview {
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  for (let q = 1; q <= totalQuestions; q++) {
    const studentAns = answers[String(q)];
    const correctAns = answerKey[q];

    if (!studentAns) {
      blank++;
      continue;
    }

    if (correctAns && studentAns === correctAns) {
      correct++;
    } else {
      wrong++;
    }
  }

  const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 1000) / 10 : 0;
  return { correct, wrong, blank, score };
}

export function buildCorrectionStats(results: SimuladoResult[], studentsCount: number) {
  const avgScore = results.length > 0
    ? Math.round((results.reduce((sum, result) => sum + result.score, 0) / results.length) * 10) / 10
    : 0;
  const maxScore = results.length > 0 ? Math.max(...results.map((result) => result.score)) : 0;
  const minScore = results.length > 0 ? Math.min(...results.map((result) => result.score)) : 0;
  const participationRate = studentsCount > 0 ? Math.round((results.length / studentsCount) * 100) : 0;

  return {
    avgScore,
    maxScore,
    minScore,
    participationRate,
  };
}

export function buildSubjectAverages(
  selectedSim: Simulado | null | undefined,
  results: SimuladoResult[],
  answerKey: Record<number, string>
) {
  if (!selectedSim || results.length === 0) return [];

  const stats: Record<string, { correct: number; total: number }> = {};

  results.forEach((result) => {
    let qNum = 1;
    selectedSim.subjects.forEach((subject) => {
      if (subject.type === "discursiva") return;
      if (!stats[subject.subject_name]) stats[subject.subject_name] = { correct: 0, total: 0 };

      for (let i = 0; i < subject.question_count; i++) {
        const studentAns = result.answers[String(qNum)]?.toUpperCase();
        const correctAns = answerKey[qNum];
        if (studentAns && correctAns && studentAns === correctAns) {
          stats[subject.subject_name].correct++;
        }
        stats[subject.subject_name].total++;
        qNum++;
      }
    });
  });

  return Object.entries(stats).map(([name, data]) => ({
    name,
    average: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));
}
