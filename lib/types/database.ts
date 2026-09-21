export type UserRole = "trainer" | "client";
export type BookingStatus = "confirmed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface GymClass {
  id: string;
  trainer_id: string;
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

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
}
