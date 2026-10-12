const VISIT_DATE = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });

/**
 * A data da visita é um dia do calendário, salvo como meia-noite UTC ("2026-10-11" vira
 * 2026-10-11T00:00Z). Formatar no fuso local jogaria a data um dia para trás no Brasil.
 */
export function formatVisitDate(value: string) {
  return VISIT_DATE.format(new Date(value));
}
