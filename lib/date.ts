import {
  startOfWeek,
  addDays,
  addWeeks,
  format,
  isSameDay,
  isToday as isTodayFn,
} from "date-fns";
import { es } from "date-fns/locale";

export function getWeekDays(reference: Date): Date[] {
  const start = startOfWeek(reference, { weekStartsOn: 1 }); // lunes
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function shiftWeek(reference: Date, delta: number): Date {
  return addWeeks(reference, delta);
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEE d", { locale: es });
}

export function formatMonthLabel(date: Date): string {
  return format(date, "MMMM yyyy", { locale: es });
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function formatFullDate(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

export { isSameDay, isTodayFn as isToday };
