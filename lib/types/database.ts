export type UserRole = "trainer" | "client";
export type BookingStatus = "confirmed" | "cancelled";
export type TrainingModality = "individual" | "duo" | "group3" | "group4" | "custom_group";

export const TRAINING_MODALITIES: { value: TrainingModality; label: string; defaultCapacity: number | null }[] = [
  { value: "individual", label: "Individual (1 persona)", defaultCapacity: 1 },
  { value: "duo", label: "Dúo (2 personas)", defaultCapacity: 2 },
  { value: "group3", label: "Grupal (3 personas)", defaultCapacity: 3 },
  { value: "group4", label: "Grupal (4 personas)", defaultCapacity: 4 },
  { value: "custom_group", label: "Grupo de más personas", defaultCapacity: null },
];

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
  training_modality: TrainingModality;
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
  "#2563eb", // azul
  "#16a34a", // verde
  "#eab308", // amarillo
  "#dc2626", // rojo
  "#7c3aed", // violeta
  "#0891b2", // cian
] as const;

// Número mínimo de horas de antelación para poder cancelar una reserva.
// Debe coincidir con public.cancellation_limit_hours() en la base de datos.
export const CANCELLATION_LIMIT_HOURS = 4;

// ---------------------------------------------------------
// Miembros y bonos de clases
// ---------------------------------------------------------
export interface BonusPackage {
  id: string;
  name: string;
  sessions: number;
  is_default: boolean;
  created_at: string;
}

export interface MemberDetails {
  member_id: string;
  class_credits: number;
  updated_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  class_credits: number;
}

export interface CreditMovement {
  id: string;
  member_id: string;
  trainer_id: string | null;
  delta: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
  trainer_name?: string | null;
}

// Miembro apuntado a una sesión (para el modal de detalle)
export interface SessionMember {
  id: string;
  full_name: string;
  phone: string | null;
  class_credits: number | null;
  booked_at: string;
}
