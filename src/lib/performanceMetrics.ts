// Single-pass aggregation engine for performance dashboard metrics

export interface GradeRow {
  score: number;
  max_score: number;
  class_group: string;
  bimester: string;
  subject_id: string | null;
  student_id: string;
  subjects?: { name: string } | null;
}

export interface AttendanceRow {
  student_id: string;
  class_group: string;
  status: string;
  date: string;
  subject_id: string | null;
}

export interface ClassMetrics {
  name: string;
  average: number;
  totalGrades: number;
  studentsCount: number;
  below60Pct: number;
  above80Pct: number;
}

export interface SubjectMetrics {
  id: string;
  name: string;
  average: number;
  totalGrades: number;
  classBreakdown: { className: string; average: number }[];
}

export interface StudentMetrics {
  id: string;
  name: string;
  classGroup: string;
  average: number;
  frequency: number;
  totalGrades: number;
  totalAttendance: number;
  presentCount: number;
  evolution: number; // difference between last and first bimester avg
  status: "proficiente" | "atencao_continua" | "foco_prioritario" | "evolucao_constante";
  engagementIndex: number;
  learningProfile: "consistente" | "explorador" | "resiliente" | "desafiado";
  subjectScores: { name: string; average: number }[];
  bimesterScores: { bimester: string; average: number }[];
  recommendation: string;
}

export interface AggregatedData {
  globalAverage: number;
  totalStudents: number;
  riskStudents: number;
  averageFrequency: number;
  classMetrics: ClassMetrics[];
  subjectMetrics: SubjectMetrics[];
  studentMetrics: StudentMetrics[];
  subjectOptions: [string, string][];
  classGroups: string[];
  bimesters: string[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function getStatus(avg: number, evolution: number): StudentMetrics["status"] {
  if (avg >= 70) return "proficiente";
  if (evolution > 5 && avg >= 40) return "evolucao_constante";
  if (avg >= 50) return "atencao_continua";
  return "foco_prioritario";
}

function getRecommendation(status: StudentMetrics["status"], avg: number, freq: number): string {
  if (freq < 75) return "Notamos oportunidades de melhoria na frequência. A presença constante é fundamental para destravar todo o potencial do aluno.";
  if (status === "foco_prioritario") return "O aluno possui um potencial incrível que precisa de apoio estruturado. Recomendamos reforço escolar e parceria próxima com a família.";
  if (status === "atencao_continua") return "O aluno está no caminho certo, mas precisa de incentivo contínuo. Monitorar de perto para garantir que desafios não se tornem obstáculos.";
  if (status === "evolucao_constante") return "Excelente trajetória de crescimento! O esforço do aluno está visível. Manter as estratégias de estudo e celebrar as pequenas vitórias.";
  return "Desempenho sólido e inspirador. O aluno domina os conceitos e pode ser incentivado com desafios criativos ou atividades extracurriculares.";
}

/** Single-pass aggregation — iterates grades once for all metrics */
export function aggregateGrades(
  grades: GradeRow[],
  attendance: AttendanceRow[],
  studentNames: Record<string, string>,
  bimesterFilter: string,
  subjectFilter: string,
  classFilter: string,
): AggregatedData {
  const classBuckets: Record<string, { sum: number; count: number; students: Set<string>; below60: number; above80: number }> = {};
  const subjectBuckets: Record<string, { name: string; sum: number; count: number; byClass: Record<string, { sum: number; count: number }> }> = {};
  const studentBuckets: Record<string, {
    sum: number; count: number; classGroup: string;
    bySubject: Record<string, { name: string; sum: number; count: number }>;
    byBimester: Record<string, { sum: number; count: number }>;
  }> = {};
  const subjectMap = new Map<string, string>();
  const classGroupSet = new Set<string>();
  const bimesterSet = new Set<string>();

  let totalSum = 0;
  let totalCount = 0;

  for (let i = 0; i < grades.length; i++) {
    const g = grades[i];
    const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;
    const sid = g.subject_id || "geral";
    const sname = (g.subjects as any)?.name || "Geral";

    if (!subjectMap.has(sid)) subjectMap.set(sid, sname);
    if (g.class_group) classGroupSet.add(g.class_group);
    if (g.bimester) bimesterSet.add(g.bimester);

    if (bimesterFilter !== "all" && g.bimester !== bimesterFilter) continue;
    if (subjectFilter !== "all" && sid !== subjectFilter) continue;
    if (classFilter !== "all" && g.class_group !== classFilter) continue;

    totalSum += pct;
    totalCount++;

    // Per student
    if (!studentBuckets[g.student_id]) {
      studentBuckets[g.student_id] = { sum: 0, count: 0, classGroup: g.class_group, bySubject: {}, byBimester: {} };
    }
    const sb = studentBuckets[g.student_id];
    sb.sum += pct;
    sb.count++;
    sb.classGroup = g.class_group;
    if (!sb.bySubject[sid]) sb.bySubject[sid] = { name: sname, sum: 0, count: 0 };
    sb.bySubject[sid].sum += pct;
    sb.bySubject[sid].count++;
    if (g.bimester) {
      if (!sb.byBimester[g.bimester]) sb.byBimester[g.bimester] = { sum: 0, count: 0 };
      sb.byBimester[g.bimester].sum += pct;
      sb.byBimester[g.bimester].count++;
    }

    // Per class
    if (g.class_group) {
      if (!classBuckets[g.class_group]) {
        classBuckets[g.class_group] = { sum: 0, count: 0, students: new Set(), below60: 0, above80: 0 };
      }
      const b = classBuckets[g.class_group];
      b.sum += pct;
      b.count++;
      b.students.add(g.student_id);
      if (pct < 60) b.below60++;
      if (pct > 80) b.above80++;
    }

    // Per subject
    if (!subjectBuckets[sid]) {
      subjectBuckets[sid] = { name: sname, sum: 0, count: 0, byClass: {} };
    }
    const sub = subjectBuckets[sid];
    sub.sum += pct;
    sub.count++;
    if (g.class_group) {
      if (!sub.byClass[g.class_group]) sub.byClass[g.class_group] = { sum: 0, count: 0 };
      sub.byClass[g.class_group].sum += pct;
      sub.byClass[g.class_group].count++;
    }
  }

  // Attendance aggregation
  const attendanceBuckets: Record<string, { total: number; present: number }> = {};
  for (const a of attendance) {
    if (classFilter !== "all" && a.class_group !== classFilter) continue;
    if (!attendanceBuckets[a.student_id]) attendanceBuckets[a.student_id] = { total: 0, present: 0 };
    attendanceBuckets[a.student_id].total++;
    if (a.status === "present") attendanceBuckets[a.student_id].present++;
  }

  const classMetrics: ClassMetrics[] = Object.entries(classBuckets)
    .map(([name, d]) => ({
      name,
      average: round1(d.sum / d.count),
      totalGrades: d.count,
      studentsCount: d.students.size,
      below60Pct: Math.round((d.below60 / d.count) * 100),
      above80Pct: Math.round((d.above80 / d.count) * 100),
    }))
    .sort((a, b) => b.average - a.average);

  const subjectMetrics: SubjectMetrics[] = Object.entries(subjectBuckets)
    .map(([id, d]) => ({
      id,
      name: d.name,
      average: round1(d.sum / d.count),
      totalGrades: d.count,
      classBreakdown: Object.entries(d.byClass)
        .map(([cn, s]) => ({ className: cn, average: round1(s.sum / s.count) }))
        .sort((a, b) => b.average - a.average),
    }))
    .sort((a, b) => a.average - b.average);

  let riskStudents = 0;
  let freqSum = 0;
  let freqCount = 0;

  const bimesters = [...bimesterSet].sort();

  const studentMetrics: StudentMetrics[] = Object.entries(studentBuckets).map(([id, s]) => {
    const avg = round1(s.sum / s.count);
    const att = attendanceBuckets[id];
    const freq = att && att.total > 0 ? round1((att.present / att.total) * 100) : 100;
    if (att && att.total > 0) { freqSum += freq; freqCount++; }

    // Evolution: last bimester - first bimester
    const bimScores = Object.entries(s.byBimester)
      .map(([b, d]) => ({ bimester: b, average: round1(d.sum / d.count) }))
      .sort((a, b) => a.bimester.localeCompare(b.bimester));
    const evolution = bimScores.length >= 2
      ? round1(bimScores[bimScores.length - 1].average - bimScores[0].average)
      : 0;

    const status = getStatus(avg, evolution);
    if (status === "foco_prioritario") riskStudents++;

    // Engagement Index (0 to 100)
    let effortScore = avg;
    if (evolution > 0) effortScore = Math.min(100, avg + (evolution * 2));
    const engagementIndex = Math.round((freq * 0.7) + (effortScore * 0.3));

    // Learning Profile (Persona)
    let learningProfile: StudentMetrics["learningProfile"] = "consistente";
    const stdDev = s.count > 1 ? calculateStdDev(Object.values(s.bySubject).map(x => x.sum / x.count)) : 0;

    if (evolution > 5) {
      learningProfile = "resiliente";
    } else if (stdDev > 15 && avg >= 60) {
      learningProfile = "explorador";
    } else if (avg < 50) {
      learningProfile = "desafiado";
    } else {
      learningProfile = "consistente";
    }

    return {
      id,
      name: studentNames[id] || id.slice(0, 8),
      classGroup: s.classGroup,
      average: avg,
      frequency: freq,
      totalGrades: s.count,
      totalAttendance: att?.total || 0,
      presentCount: att?.present || 0,
      evolution,
      status,
      engagementIndex,
      learningProfile,
      subjectScores: Object.entries(s.bySubject)
        .map(([, d]) => ({ name: d.name, average: round1(d.sum / d.count) }))
        .sort((a, b) => a.average - b.average),
      bimesterScores: bimScores,
      recommendation: getRecommendation(status, avg, freq),
    };
  }).sort((a, b) => a.average - b.average);

  return {
    globalAverage: totalCount > 0 ? round1(totalSum / totalCount) : 0,
    totalStudents: studentMetrics.length,
    riskStudents,
    averageFrequency: freqCount > 0 ? round1(freqSum / freqCount) : 0,
    classMetrics,
    subjectMetrics,
    studentMetrics,
    subjectOptions: [...subjectMap.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    classGroups: [...classGroupSet].sort(),
    bimesters,
  };
}

/** Build temporal evolution data */
export function buildTemporalData(grades: GradeRow[], bimesters: string[]) {
  if (bimesters.length < 2) return { data: [], lines: [] };

  const classNames = new Set<string>();
  const buckets: Record<string, Record<string, { sum: number; count: number }>> = {};

  for (const bim of bimesters) {
    buckets[bim] = { Geral: { sum: 0, count: 0 } };
  }

  for (const g of grades) {
    const bim = g.bimester;
    if (!buckets[bim]) continue;
    const pct = g.max_score > 0 ? (g.score / g.max_score) * 100 : 0;

    buckets[bim].Geral.sum += pct;
    buckets[bim].Geral.count++;

    if (g.class_group) {
      classNames.add(g.class_group);
      if (!buckets[bim][g.class_group]) buckets[bim][g.class_group] = { sum: 0, count: 0 };
      buckets[bim][g.class_group].sum += pct;
      buckets[bim][g.class_group].count++;
    }
  }

  const sortedClasses = [...classNames].sort();
  const lines = ["Geral", ...sortedClasses];

  const data = bimesters.map(bim => {
    const row: Record<string, any> = { bimester: `${bim}º Bim` };
    for (const key of lines) {
      const b = buckets[bim]?.[key];
      if (b && b.count > 0) row[key] = round1(b.sum / b.count);
    }
    return row;
  });

  return { data, lines };
}
