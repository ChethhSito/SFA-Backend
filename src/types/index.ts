/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = "portal" | "postulante" | "alumno" | "docente" | "administrador";

export type ProgramId = 
  | "sistemas" 
  | "administracion" 
  | "contabilidad" 
  | "enfermeria" 
  | "electronica" 
  | "mecanica";

export interface Program {
  id: ProgramId;
  name: string;
  description: string;
  duration: string;
  courses: string[];
}

export interface Applicant {
  applicantCode: string;
  dni: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  programId: ProgramId;
  paymentStatus: "No Pagado" | "Pendiente" | "Validado" | "Rechazado" | "Observado";
  paymentOperation?: string;
  paymentObservations?: string;
  examStatus: "No Programado" | "Programado" | "Rindiendo" | "Finalizado";
  examScore?: number;
  admitted: boolean;
  docs?: {
    dniFile: StudentDoc;
    certificadoFile: StudentDoc;
    partidaFile?: StudentDoc;
    fotoFile: StudentDoc;
  };
  periodId: string;
  folderStatus: "Pending" | "Observed" | "Approved" | "Enrolled";
  folderObservations?: string;
  password?: string;
  supportMessages?: {
    id: string;
    sender: "postulante" | "admin";
    category?: string;
    text: string;
    date: string;
  }[];
}

export type FileVerifyStatus = "No Enviado" | "Pendiente" | "Validado" | "Observado";

export interface StudentDoc {
  status: FileVerifyStatus;
  fileName?: string;
  observations?: string;
  fileDataUrl?: string;
}

export interface StudentPersonalData {
  dni: string;
  birthDate: string;
  name: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
}

export interface Enrollment {
  studentDni: string;
  programId: ProgramId;
  academicStatus: "ADMITIDO" | "MATRICULADO";
  docs: {
    dniFile: StudentDoc;
    certificadoFile: StudentDoc;
    partidaFile: StudentDoc;
    fotoFile: StudentDoc;
  };
  paymentStatus: "No Pagado" | "Pendiente" | "Validado" | "Observado";
  paymentOperation?: string;
  shift?: "Mañana" | "Tarde" | "Noche";
}

export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  classroom: string;
  schedule: string;
  teacherDni: string;
  career?: string;
  group?: string;
  curriculum?: string;
  startDate?: string;
  endDate?: string;
  studentCount?: number;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  title: string;
  date: string;
  fileName: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  submissions: {
    studentDni: string;
    studentName: string;
    fileName: string;
    submitDate: string;
    grade?: number; // scale 0-20
  }[];
}

export interface CourseEvaluation {
  id: string;
  courseId: string;
  title: string;
  questionsCount: number;
  durationMinutes: number;
  grades: {
    studentDni: string;
    score: number;
    date: string;
  }[];
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string;
  statusMap: { [studentDni: string]: "Presente" | "Tardanza" | "Falta" | "Justificado" };
}

export interface CycleStatus {
  cycleNumber: number;
  year: number;
  status: "Aprobado" | "Pendiente" | "Observado";
  average: number;
  credits: number;
  courses: { name: string; grade: number; approved: boolean }[];
  obs?: string;
}

export interface Graduation {
  studentDni: string;
  status: "Solicitado" | "En Proceso" | "Apto" | "No Apto" | "Certificado Emitido";
  step: "Solicitud" | "Revision Documental" | "Emision";
  docsChecked: {
    solicitud: boolean;
    constanciaEgresado: boolean;
    practicasPre: boolean;
    pagoDerecho: boolean;
  };
  obs?: string;
}

export interface Classroom {
  id: string;
  name: string;
  location: string;
  floor: number;
  capacity: number;
}

export interface Teacher {
  dni: string;
  name: string;
  lastName: string;
  email: string;
  specialty: string;
}

export interface AdmissionPeriod {
  id: string;
  name: string;
  isActive: boolean;
  status: "PENDIENTE" | "APERTURADO" | "EXAMEN" | "MATRICULA" | "CERRADO";
  preEnrollmentStartDate: string;
  preEnrollmentEndDate: string;
  admissionDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  classesStartDate: string;
}
