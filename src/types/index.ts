/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = "administrador" | "docente" | "alumno" | "postulante";

export type ProgramId = 
  | "electricidad-industrial" 
  | "contabilidad" 
  | "desarrollo-sistemas"
  | "administracion" 
  | "enfermeria" 
  | "mecanica";

// 1. users
export interface User {
  _id: string;
  dni: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  state: "Activo" | "Inactivo";
  createdAt: string;
}

// 2. academic-periods
export interface AcademicPeriod {
  _id: string; // Ej: "2026-I"
  name: string;
  type: "REGULAR" | "ADMISION";
  startDate: string;
  endDate: string;
  admissionSchedule?: {
    registrationStart: string;
    registrationEnd: string;
    examDate: string;
    enrollmentStart: string;
    enrollmentEnd: string;
  };
  isActive: boolean;
}

// 3. academic-programs
export interface AcademicProgram {
  _id: string; // Ej: "electricidad-industrial"
  name: string;
  code: string; // Ej: "EE"
  description: string;
  duration: string;
  totalCredits: number;
  state: "Activo" | "Inactivo";
  curriculum: {
    cycleNumber: number;
    courses: string[]; // Códigos de cursos (Ej: "EE-101")
  }[];
}

// 4. teachers
export interface Teacher {
  _id: string;
  userId: string; // Relación con users._id
  dni: string;
  specialty: string;
  degree: string;
  status: "Activo" | "Inactivo";
}

// 5. applicants
export interface ApplicantDoc {
  fileUrl: string;
  status: "PENDIENTE" | "VALIDADO" | "OBSERVADO" | "SIN_ENVIAR";
  obs?: string | null;
}

export interface Applicant {
  _id: string; // DNI del postulante
  userId: string; // Relación con users._id
  applicantCode: string;
  programId: string; // Relación con academic-programs._id
  periodId: string; // Relación con academic-periods._id
  status: "EN_PROCESO" | "OBSERVADO" | "ADMITIDO" | "NO_ADMITIDO";
  payment: {
    amount: number;
    operationNumber: string;
    voucherUrl: string;
    status: "PENDIENTE" | "VALIDADO" | "OBSERVADO";
    observation?: string | null;
    reviewedAt?: string | null;
  };
  folder: {
    status: "PENDIENTE" | "OBSERVADO" | "APROBADO";
    generalObservation?: string | null;
    documents: {
      dni: ApplicantDoc;
      certificadoSecundaria: ApplicantDoc;
      partidaNacimiento: ApplicantDoc;
      fotoCarnet: ApplicantDoc;
    };
  };
  supportTickets?: {
    category: string;
    message: string;
    response?: string | null;
    createdAt: string;
  }[];
}

// 6. enrollments
export interface EnrollmentDoc {
  fileUrl: string;
  status: "PENDIENTE" | "VALIDADO" | "OBSERVADO" | "SIN_ENVIAR";
  obs?: string | null;
}

export interface Enrollment {
  _id: string; // Ej: "mat_2026_1_74770902"
  studentDni: string;
  userId: string; // Relación con users._id
  studentCode: string;
  programId: string; // Relación con academic-programs._id
  periodId: string; // Relación con academic-periods._id
  cycleNumber: number;
  shift: "Mañana" | "Tarde" | "Noche";
  academicStatus: "ADMITIDO" | "MATRICULADO" | "RETIRADO";
  registeredSections: string[]; // Relación con sections._id
  payment: {
    amount: number;
    operationNumber: string;
    voucherUrl: string;
    status: "PENDIENTE" | "VALIDADO" | "OBSERVADO";
    validatedAt?: string | null;
    observation?: string | null;
  };
  docs?: {
    dni: EnrollmentDoc;
    certificadoSecundaria: EnrollmentDoc;
    partidaNacimiento: EnrollmentDoc;
    fotoCarnet: EnrollmentDoc;
  };
}

// 7. classrooms
export interface Classroom {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  type: "LABORATORIO" | "TEORIA" | "TALLER";
}

// 8. courses
export interface Course {
  _id: string; // Ej: "EE-101"
  code: string;
  name: string;
  programId: string; // Relación con academic-programs._id
  cycleNumber: number;
  credits: number;
  hours: {
    theory: number;
    practice: number;
  };
  formula: string; // Ej: "0.05*PYT1 + 0.10*PYT2 + 0.20*PYT3 + 0.15*PYT4 + 0.50*SUP1"
}

// 9. sections
export interface SectionSchedule {
  day: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";
  startTime: string; // Ej: "08:00"
  endTime: string; // Ej: "11:30"
  classroomId: string; // Relación con classrooms._id
  type: "LABORATORIO" | "TEORIA" | "TALLER";
}

export interface Section {
  _id: string;
  courseId: string; // Relación con courses._id
  teacherId: string; // Relación con teachers._id
  periodId: string; // Relación con academic-periods._id
  groupName: string; // Ej: "Grupo A"
  shift: "Mañana" | "Tarde" | "Noche";
  schedules: SectionSchedule[];
  syllabusUrl?: string | null;
  isClosed: boolean;
}

// 10. course-materials
export interface CourseMaterial {
  _id: string;
  sectionId: string; // Relación con sections._id
  weekNumber: number;
  title: string;
  type: "DOCUMENTO" | "ENLACE_VIDEO" | "ENLACE_MEET";
  fileUrl?: string | null;
  externalUrl?: string | null;
  publishedAt: string;
}

// 11. assignments
export interface Assignment {
  _id: string;
  sectionId: string; // Relación con sections._id
  weekNumber: number;
  title: string;
  instructions: string;
  dueDate: string;
  referenceFileUrl?: string | null;
  maxScore: number; // Ej: 20
}

// 12. assignment-submissions
export interface AssignmentSubmission {
  _id: string;
  assignmentId: string; // Relación con assignments._id
  sectionId: string; // Relación con sections._id
  studentDni: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

// 13. evaluations
export interface EvaluationQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface EvaluationQuestion {
  id: string;
  text: string;
  options: EvaluationQuestionOption[];
}

export interface Evaluation {
  _id: string;
  sectionId: string; // Relación con sections._id
  weekNumber: number;
  title: string;
  weightPercentage: number; // Ej: 15
  durationMinutes: number;
  startDate: string;
  endDate: string;
  questions: EvaluationQuestion[];
}

// 14. evaluation-attempts
export interface EvaluationAttemptAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface EvaluationAttempt {
  _id: string;
  evaluationId: string; // Relación con evaluations._id
  studentDni: string;
  startedAt: string;
  finishedAt?: string | null;
  answers: EvaluationAttemptAnswer[];
  score?: number | null;
  status: "INICIADO" | "FINALIZADO";
}

// 15. attendances (Alumnos)
export interface AttendanceStudentDetail {
  studentDni: string;
  status: "PRESENTE" | "TARDANZA" | "FALTA" | "JUSTIFICADO";
  markedAt?: string | null;
}

export interface Attendance {
  _id: string; // Ej: "att_secEE101_20260406_T"
  sectionId: string; // Relación con sections._id
  date: string; // Formato YYYY-MM-DD
  sessionType: "TEORIA" | "LABORATORIO";
  records: AttendanceStudentDetail[];
}

// 16. teacher-attendances
export interface TeacherAttendance {
  _id: string;
  teacherId: string; // Relación con teachers._id
  sectionId: string; // Relación con sections._id
  date: string; // Formato YYYY-MM-DD
  scheduledTime: string; // Ej: "08:00"
  entryTime?: string | null;
  status: "PUNTUAL" | "TARDANZA" | "FALTA" | "JUSTIFICADO";
}

// 17. teacher-logs
export interface TeacherLog {
  _id: string;
  sectionId: string; // Relación con sections._id
  weekNumber: number;
  category: "Evidencia de Laboratorio / Taller" | "Observación General" | "Acuerdo";
  title: string;
  description: string;
  fileUrl?: string | null;
  createdAt: string;
}

// 18. academic-records
export interface AcademicRecordCourseDetail {
  courseId: string;
  courseName: string;
  credits: number;
  finalGrade: number;
  attendanceRate: number;
  approved: boolean;
}

export interface AcademicRecord {
  _id: string; // Ej: "rec_74770902_2026_I"
  studentDni: string;
  periodId: string; // Relación con academic-periods._id
  cycleNumber: number;
  weightedAverage: number;
  totalCreditsEnrolled: number;
  totalCreditsApproved: number;
  overallAttendanceRate: number;
  cycleStatus: "APROBADO" | "DESAPROBADO" | "EN_CURSO";
  courses: AcademicRecordCourseDetail[];
  closedAt?: string | null;
}

// 19. graduations
export interface Graduation {
  _id: string; // Ej: "grad_74770902"
  studentDni: string;
  programId: string; // Relación con academic-programs._id
  trafficLightStatus: "VERDE" | "AMBAR" | "ROJO";
  status: "SOLICITADO" | "EN_PROCESO" | "APTO" | "EMITIDO";
  requirementsCheck: {
    totalCreditsApproved: boolean;
    preProfessionalPractices: boolean;
    englishLevelB2: boolean;
    communityService: boolean;
    paymentFee: boolean;
  };
  conformityReport?: {
    reportNumber: string;
    generatedAt: string;
    fileUrl: string;
  } | null;
  certificates?: {
    type: string;
    registryCode: string;
    fileUrl: string;
    issueDate: string;
  }[];
}
