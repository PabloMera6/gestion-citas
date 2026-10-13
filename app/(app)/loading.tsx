import PageLoading from "@/components/PageLoading";

// Cubre la carga del propio layout compartido (AppLayout, que hace
// await getAuthContext() en cada navegación) además de la de cada
// página. Sin este archivo, el loading.tsx de cada subcarpeta no
// entra en juego hasta que el layout padre ya se resolvió, dejando
// ese primer tramo sin ningún indicador visual.
export default function Loading() {
  return <PageLoading />;
}
