export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  collegeId: string;
  photoURL?: string;
  deviceId?: string;
  lastIp?: string;
  department?: string;
  contactNumber?: string;
  bio?: string;
}

export interface College {
  id: string;
  name: string;
  adminEmail: string;
  trialEndDate: string;
  isPremium: boolean;
  premiumPlan?: 'monthly' | 'yearly';
  premiumExpiry?: string;
}

export interface ClassSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  lat: number;
  lng: number;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  collegeId: string;
  activeSession?: ClassSession | null;
  radius?: number;
  deleted?: boolean;
}

export interface Session {
  id: string;
  classId: string;
  startTime: string;
  endTime?: string;
  lat: number;
  lng: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  timestamp: string;
  lat: number;
  lng: number;
  sessionId: string;
  deviceId?: string;
  ip?: string;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  title: string;
  type: 'assignment' | 'exam';
  score: number;
  maxScore: number;
  timestamp: string;
}
