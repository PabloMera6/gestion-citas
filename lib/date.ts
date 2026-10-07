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

import type { RecurringOccurrence, RecurringSlotInput } from "@/lib/types/database";

/**
 * A partir de un lunes de inicio, un nº de semanas y una lista de
 * slots (día de la semana + hora "HH:mm"), genera todas las
 * ocurrencias concretas (starts_at/ends_at en ISO) de un horario
 * recurrente.
 *
 * El cálculo se hace aquí, en el navegador del entrenador, y NO en el
 * backend/SQL, para que "8:30" se interprete siempre como las 8:30
 * hora LOCAL de quien lo configura (igual que ya hace CrearClaseModal
 * con `new Date(...).toISOString()`); hacerlo en SQL con literales de
 * texto sería ambiguo sobre en qué timezone interpretar esa hora.
 */
export function buildRecurringOccurrences(
  mondayOfFirstWeek: Date,
  weeks: number,
  slots: RecurringSlotInput[],
  durationMinutes: number
): RecurringOccurrence[] {
  const occurrences: RecurringOccurrence[] = [];

  for (const slot of slots) {
    const [hours, minutes] = slot.time.split(":").map(Number);
    // weekday: 0=domingo..6=sábado. mondayOfFirstWeek es el lunes, así
    // que el desplazamiento en días desde el lunes es weekday-1,
    // salvo domingo (0) que es +6.
    const dayOffset = slot.weekday === 0 ? 6 : slot.weekday - 1;

    for (let week = 0; week < weeks; week++) {
      const day = addDays(mondayOfFirstWeek, week * 7 + dayOffset);
      const start = new Date(day);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + durationMinutes * 60000);

      occurrences.push({
        weekday: slot.weekday,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
    }
  }

  return occurrences.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
