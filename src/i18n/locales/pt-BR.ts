/** Português (Brasil) — the app's original language, moved here verbatim. */
import { pad2 } from "../format";
import type { Messages } from "./en";

export const ptBR: Messages = {
  theme: {
    useLight: "Usar tema claro",
    useDark: "Usar tema escuro",
  },
  language: {
    label: "Alterar idioma",
  },
  about: {
    label: "Sobre",
    title: "Check DNS Block",
    description:
      "Verifica se uma lista de domínios/IPs está bloqueada em um determinado servidor DNS, comparando suas respostas com as de um servidor DNS de referência.",
    license: "Licença MIT · © 2026 Mateus Felipe Gonçalves",
    madeBy: "Feito por Mateus Felipe Gonçalves",
    sourceCode: "Código-fonte no GitHub",
    close: "Fechar",
  },
  window: {
    minimize: "Minimizar",
    maximize: "Maximizar",
    restore: "Restaurar",
    close: "Fechar",
  },
  input: {
    serverLabel: "Servidor DNS a consultar:",
    serverAriaLabel: "Servidor DNS a consultar",
    compareLabel: "Comparar com DNS público:",
    referenceAriaLabel: "DNS público de comparação",
    hint: "Cole abaixo os domínios e/ou IPs (um por linha, ou separados por espaço, vírgula ou ponto e vírgula):",
    placeholder: "exemplo.com.br\n192.0.2.10\noutro-dominio.com",
    textareaAriaLabel: "Domínios e IPs para verificar",
  },
  toolbar: {
    verify: "Verificar",
    clear: "Limpar",
    copyResult: "Copiar resultado",
    saveCsv: "Salvar CSV…",
    saveEvidence: "Salvar evidência…",
    onlyBlocked: "Mostrar só bloqueados",
  },
  table: {
    columnEntry: "Entrada",
    columnType: "Tipo",
    columnStatus: "Situação",
    columnAnswer: (server) => `Resposta ${server}`,
    columnCheckedAt: "Consultado em",
    referenceColumnLabel: "Referência",
  },
  results: {
    runningTitle: "Consultando…",
    emptyTitle: "Nenhum resultado ainda",
    emptyDescription: "Cole domínios ou IPs acima e clique em Verificar para ver o resultado aqui.",
  },
  status: {
    total: "total",
    blocked: "bloqueados",
    notBlocked: "não bloqueados",
    notFound: "não existe",
    running: (done, total) => `Consultando… ${done} de ${total}`,
    ignored: (n) => `(${n} trechos ignorados por não serem domínio nem IP)`,
    copied: (n) => `${n} linhas copiadas para a área de transferência.`,
    savedAt: (path) => `Salvo em ${path}`,
    evidenceSavedAt: (path) => `Evidência salva em ${path}`,
  },
  verdict: {
    blocked: "BLOQUEADO",
    not_blocked: "NÃO BLOQUEADO",
    unresolved: "NÃO RESOLVE",
    no_response: "SEM RESPOSTA",
    not_found: "NÃO EXISTE",
    reverse_ok: "REVERSO OK",
    no_reverse: "SEM REVERSO",
  },
  kind: {
    domain: "Domínio",
    ip: "IP",
  },
  answer: {
    nxDomain: "não resolve (NXDOMAIN)",
    servFail: "falha (SERVFAIL)",
    refused: "recusado (REFUSED)",
    timeout: "sem resposta",
    emptyDomain: "sem registro A",
    emptyIp: "sem reverso",
    error: (message) => `erro: ${message}`,
  },
  errors: {
    bannerTitle: "Não foi possível verificar",
    invalidServer: "Informe o IP do servidor DNS a consultar.",
    invalidReference: "Informe o IP do DNS público de comparação ou desmarque a opção.",
    noEntries: "Cole pelo menos um domínio ou IP válido.",
    serverUnreachable: (server, control) =>
      `O servidor ${server} não respondeu a consulta de teste (${control}).\n\n` +
      "Este computador precisa estar na rede atendida por esse DNS.",
    internal: (message) => `Erro interno: ${message}`,
    notInApp: "A verificação só funciona dentro do aplicativo Check DNS Block.",
  },
  saveErrors: {
    notInApp: "Salvar arquivos só funciona dentro do aplicativo Check DNS Block.",
    dialogFailed: "Falha ao abrir a caixa de diálogo.",
    writeFailed: (message) => `Não foi possível salvar: ${message}`,
  },
  warnings: {
    referenceUnreachable: (server) =>
      `O DNS público ${server} não respondeu daqui. A verificação segue sem comparação: ` +
      "o que não resolver aparece como NÃO RESOLVE.",
  },
  report: {
    summaryPrefix: (n) => `${n} verificados:`,
    evidenceTitle: "EVIDÊNCIA DE BLOQUEIO DE DOMÍNIOS NO DNS RECURSIVO",
    generatedAt: "Gerado em:",
    queriedServer: "Servidor DNS consultado:",
    compareServer: "DNS público de comparação:",
    result: "Resultado:",
    blockedDomains: (n) => `DOMÍNIOS BLOQUEADOS (${n})`,
    none: "(nenhum)",
    otherEntries: (n) => `DEMAIS ENTRADAS (${n})`,
    criteriaBlocked:
      "Critério: BLOQUEADO = o servidor consultado não resolve o domínio (ou devolve 0.0.0.0/127.x)",
    criteriaWithReference: (reference) =>
      `enquanto o DNS público ${reference} resolve normalmente. NÃO EXISTE = não resolve em nenhum dos dois.`,
    manualCheck: (server) => `Conferência manual: nslookup <domínio> ${server}`,
  },
  files: {
    csvName: (ts) => `bloqueio-dns-${ts}.csv`,
    csvFilter: "CSV",
    evidenceName: (ts) => `evidencia-bloqueio-dns-${ts}.txt`,
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
