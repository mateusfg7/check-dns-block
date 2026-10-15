/** Español. */
import { pad2 } from "../format";
import type { Messages } from "./en";

export const es: Messages = {
  theme: {
    useLight: "Usar tema claro",
    useDark: "Usar tema oscuro",
  },
  language: {
    label: "Cambiar idioma",
  },
  window: {
    minimize: "Minimizar",
    maximize: "Maximizar",
    restore: "Restaurar",
    close: "Cerrar",
  },
  input: {
    serverLabel: "Servidor DNS a consultar:",
    serverAriaLabel: "Servidor DNS a consultar",
    compareLabel: "Comparar con DNS público:",
    referenceAriaLabel: "DNS público de comparación",
    hint: "Pegue abajo los dominios y/o IPs (uno por línea, o separados por espacio, coma o punto y coma):",
    placeholder: "ejemplo.com\n192.0.2.10\notro-dominio.com",
    textareaAriaLabel: "Dominios e IPs a verificar",
  },
  toolbar: {
    verify: "Verificar",
    clear: "Limpiar",
    copyResult: "Copiar resultado",
    saveCsv: "Guardar CSV…",
    saveEvidence: "Guardar evidencia…",
    onlyBlocked: "Mostrar solo bloqueados",
  },
  table: {
    columnEntry: "Entrada",
    columnType: "Tipo",
    columnStatus: "Estado",
    columnAnswer: (server) => `Respuesta ${server}`,
    columnCheckedAt: "Consultado el",
    referenceColumnLabel: "Referencia",
  },
  results: {
    runningTitle: "Consultando…",
    emptyTitle: "Aún no hay resultados",
    emptyDescription:
      "Pegue dominios o IPs arriba y haga clic en Verificar para ver el resultado aquí.",
  },
  status: {
    total: "total",
    blocked: "bloqueados",
    notBlocked: "no bloqueados",
    notFound: "no existe",
    running: (done, total) => `Consultando… ${done} de ${total}`,
    ignored: (n) => `(${n} fragmentos ignorados por no ser dominio ni IP)`,
    copied: (n) => `${n} filas copiadas al portapapeles.`,
    savedAt: (path) => `Guardado en ${path}`,
    evidenceSavedAt: (path) => `Evidencia guardada en ${path}`,
  },
  verdict: {
    blocked: "BLOQUEADO",
    not_blocked: "NO BLOQUEADO",
    unresolved: "NO RESUELVE",
    no_response: "SIN RESPUESTA",
    not_found: "NO EXISTE",
    reverse_ok: "REVERSO OK",
    no_reverse: "SIN REVERSO",
  },
  kind: {
    domain: "Dominio",
    ip: "IP",
  },
  answer: {
    nxDomain: "no resuelve (NXDOMAIN)",
    servFail: "falla (SERVFAIL)",
    refused: "rechazado (REFUSED)",
    timeout: "sin respuesta",
    emptyDomain: "sin registro A",
    emptyIp: "sin reverso",
    error: (message) => `error: ${message}`,
  },
  errors: {
    bannerTitle: "No se pudo verificar",
    invalidServer: "Indique la IP del servidor DNS a consultar.",
    invalidReference: "Indique la IP del DNS público de comparación o desactive la opción.",
    noEntries: "Pegue al menos un dominio o IP válido.",
    serverUnreachable: (server, control) =>
      `El servidor ${server} no respondió a la consulta de prueba (${control}).\n\n` +
      "Este equipo debe estar en la red atendida por ese DNS.",
    internal: (message) => `Error interno: ${message}`,
    notInApp: "La verificación solo funciona dentro de la aplicación Check DNS Block.",
  },
  saveErrors: {
    notInApp: "Guardar archivos solo funciona dentro de la aplicación Check DNS Block.",
    dialogFailed: "No se pudo abrir el cuadro de diálogo.",
    writeFailed: (message) => `No se pudo guardar: ${message}`,
  },
  warnings: {
    referenceUnreachable: (server) =>
      `El DNS público ${server} no respondió desde aquí. La verificación continúa sin ` +
      "comparación: lo que no resuelva aparecerá como NO RESUELVE.",
  },
  report: {
    summaryPrefix: (n) => `${n} verificados:`,
    evidenceTitle: "EVIDENCIA DE BLOQUEO DE DOMINIOS EN EL DNS RECURSIVO",
    generatedAt: "Generado el:",
    queriedServer: "Servidor DNS consultado:",
    compareServer: "DNS público de comparación:",
    result: "Resultado:",
    blockedDomains: (n) => `DOMINIOS BLOQUEADOS (${n})`,
    none: "(ninguno)",
    otherEntries: (n) => `DEMÁS ENTRADAS (${n})`,
    criteriaBlocked:
      "Criterio: BLOQUEADO = el servidor consultado no resuelve el dominio (o devuelve 0.0.0.0/127.x)",
    criteriaWithReference: (reference) =>
      `mientras el DNS público ${reference} resuelve normalmente. NO EXISTE = no resuelve en ninguno de los dos.`,
    manualCheck: (server) => `Verificación manual: nslookup <dominio> ${server}`,
  },
  files: {
    csvName: (ts) => `bloqueo-dns-${ts}.csv`,
    csvFilter: "CSV",
    evidenceName: (ts) => `evidencia-bloqueo-dns-${ts}.txt`,
    evidenceFilter: "Texto",
  },
  /** `dd/MM/yyyy HH:mm:ss`, using local time. */
  formatDateTime: (date) => {
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    return `${day}/${month}/${date.getFullYear()} ${time}`;
  },
};
