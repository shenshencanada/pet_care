export const APPOINTMENT_STATUSES = ["pending", "confirmed", "arrived", "completed", "canceled"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export type AppointmentView = {
  id: string;
  source: "quick" | "full" | "staff" | "api";
  customerId: string | null;
  petId: string | null;
  contactName: string | null;
  phone: string;
  petName: string | null;
  petType: string;
  packageName: string | null;
  appointmentDate: string;
  appointmentTime: string;
  customerNote: string | null;
  staffNote: string | null;
  status: AppointmentStatus;
  statusChangedAt: string;
  handledByStaffName: string | null;
  createdAt: string;
  updatedAt: string;
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  arrived: "已到店",
  completed: "已完成",
  canceled: "已取消",
};

export const APPOINTMENT_TIME_SLOTS = ["10:30", "14:00", "17:30"];

export const APPOINTMENT_PACKAGES = ["轻盈洁净", "全身精护", "造型焕新"];

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && APPOINTMENT_STATUSES.includes(value as AppointmentStatus);
}

export function isAppointmentPackage(value: unknown) {
  return value === null || (typeof value === "string" && APPOINTMENT_PACKAGES.includes(value));
}

export const FOLLOW_UP_STATUSES = ["pending", "contacted", "booked", "no_answer", "skipped"] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: "待回访",
  contacted: "已联系",
  booked: "已预约",
  no_answer: "未接通",
  skipped: "暂不需要",
};

export type FollowUpView = {
  id: string;
  customerId: string;
  customerName: string | null;
  phone: string;
  petId: string;
  petName: string | null;
  petType: string;
  appointmentId: string | null;
  appointmentDate: string | null;
  packageName: string | null;
  dueDate: string;
  status: FollowUpStatus;
  contactNote: string | null;
  nextFollowUpDate: string | null;
  bookedAppointmentId: string | null;
  handledByStaffName: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isFollowUpStatus(value: unknown): value is FollowUpStatus {
  return typeof value === "string" && FOLLOW_UP_STATUSES.includes(value as FollowUpStatus);
}
