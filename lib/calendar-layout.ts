// Reparte sesiones que se solapan en el tiempo en "carriles" (lanes)
// paralelos, al estilo Google Calendar, para que el calendario semanal
// pueda pintarlas una al lado de otra en vez de una encima de otra.
//
// Antes, todas las tarjetas de sesión se posicionaban con el mismo
// "left-1 right-1" sin tener en cuenta solapamientos, así que cuando
// había 2 clases a la misma hora (algo ahora posible a propósito, con
// el límite de MAX_CONCURRENT_SESSIONS), la segunda se dibujaba justo
// encima de la primera y la ocultaba por completo.

export interface TimeRange {
  id: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface LaidOutItem<T extends TimeRange> {
  item: T;
  lane: number; // índice de columna dentro de su grupo de solapamiento (0-based)
  laneCount: number; // nº total de columnas de ese grupo, para calcular el ancho
}

/**
 * Agrupa los items en "clusters" de solapamiento transitivo (si A se
 * solapa con B, y B con C, los tres entran en el mismo cluster aunque
 * A y C no se solapen directamente), y dentro de cada cluster asigna
 * a cada item el primer carril libre, como en un calendario normal.
 */
export function layoutOverlappingRanges<T extends TimeRange>(
  items: T[]
): LaidOutItem<T>[] {
  const sorted = [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const result: LaidOutItem<T>[] = [];

  // No se sabe cuántos carriles necesitará un cluster hasta que
  // termina, así que acumulamos sus items y los volcamos a `result`
  // (con laneCount ya resuelto) al cerrarlo.
  let pendingCluster: { item: T; lane: number }[] = [];
  let laneEnds: number[] = []; // fin (ms) del último item asignado a cada carril
  let clusterEnd = -Infinity; // fin (ms) más tardío de todo el cluster actual

  function closeCluster() {
    if (pendingCluster.length === 0) return;
    const laneCount = laneEnds.length;
    for (const { item, lane } of pendingCluster) {
      result.push({ item, lane, laneCount });
    }
    pendingCluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  }

  for (const item of sorted) {
    const start = new Date(item.startsAt).getTime();
    const end = new Date(item.endsAt).getTime();

    if (pendingCluster.length > 0 && start >= clusterEnd) {
      // Este item empieza después de que termine todo lo visto hasta
      // ahora: no se solapa con nada del cluster actual, así que lo
      // cerramos y empezamos uno nuevo desde aquí.
      closeCluster();
    }

    // Primer carril ya abierto que haya quedado libre antes de que
    // empiece este item; si no hay ninguno, se abre un carril nuevo.
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }

    clusterEnd = Math.max(clusterEnd, end);
    pendingCluster.push({ item, lane });
  }
  closeCluster();

  return result;
}
