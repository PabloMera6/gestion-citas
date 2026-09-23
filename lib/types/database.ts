export type UserRole = "trainer" | "client";
export type BookingStatus = "confirmed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  color: string;
  bio: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  client_id: string;
  added_at: string;
}

export interface GymClass {
  id: string;
  trainer_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  max_capacity: number;
  duration_minutes: number;
  recurring_weekday: number | null;
  recurring_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClassSession {
  id: string;
  class_id: string | null;
  trainer_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  max_capacity: number;
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  created_at: string;
}

export interface SessionWithAvailability extends ClassSession {
  trainer_name: string;
  trainer_color: string;
  group_name: string | null;
  available_spots: number;
}

export interface Booking {
  id: string;
  session_id: string;
  client_id: string;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
}

export interface BookingWithSession extends Booking {
  session: SessionWithAvailability;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

export interface AnnouncementWithAuthor extends Announcement {
  author_name: string;
  author_color: string;
}

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export const TRAINER_COLORS = [
  "#6366f1", // indigo
  "#22d3ee", // cian
  "#e879f9", // magenta
  "#ec4899", // rosa
  "#0ea5e9", // celeste
  "#eab308", // amarillo mostaza
] as const;

// Número mínimo de horas de antelación para poder cancelar una reserva.
// Debe coincidir con public.cancellation_limit_hours() en la base de datos.
export const CANCELLATION_LIMIT_HOURS = 4;
