/** Tradução das ações registradas nas ocorrências para texto de gente. */
export const ACTION_LABELS: Record<string, string> = {
  "review.create": "publicou uma avaliação",
  "review.update": "editou uma avaliação",
  "review.trash": "mandou para a lixeira",
  "review.restore": "restaurou da lixeira",
  "review.delete": "excluiu de vez",
  "trash.purge": "limpou a lixeira",
  "logs.purge": "limpou as ocorrências",
  "user.register": "criou uma conta",
  "user.update": "alterou um usuário",
  "user.delete": "excluiu um usuário",
  "user.profile_update": "atualizou o próprio perfil",
  "user.password_change": "trocou a própria senha",
  "auth.login": "entrou no app",
  "auth.login_failed": "errou o login",
};

export type ActionTone = "neutral" | "danger" | "success" | "warning";

export const ACTION_TONES: Record<string, ActionTone> = {
  "review.create": "success",
  "review.restore": "success",
  "review.update": "neutral",
  "review.trash": "warning",
  "review.delete": "danger",
  "trash.purge": "danger",
  "logs.purge": "danger",
  "user.delete": "danger",
  "user.update": "warning",
  "user.register": "success",
  "user.profile_update": "neutral",
  "user.password_change": "warning",
  "auth.login": "neutral",
  "auth.login_failed": "danger",
};

export const ACTION_FILTERS = [
  { value: "all", label: "Tudo" },
  { value: "review", label: "Avaliações" },
  { value: "user", label: "Usuários" },
  { value: "auth", label: "Logins" },
  { value: "auth.login_failed", label: "Logins falhos" },
  { value: "review.delete", label: "Exclusões" },
] as const;

export function describeAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

/** Resumo curto dos detalhes extras de uma ocorrência. */
export function describeDetails(details: Record<string, unknown>) {
  const parts: string[] = [];

  if (typeof details.removed === "number") {
    parts.push(`${details.removed} ${details.removed === 1 ? "registro" : "registros"}`);
  }

  if (typeof details.before === "string") {
    const date = new Date(details.before);
    if (!Number.isNaN(date.getTime())) {
      parts.push(`anteriores a ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date)}`);
    }
  }

  if (details.roleFrom !== undefined && details.roleTo !== undefined) {
    parts.push(`nível ${details.roleFrom} → ${details.roleTo}`);
  }

  if (details.coupleFrom !== undefined && details.coupleTo !== undefined) {
    parts.push(`casal ${details.coupleFrom ?? "nenhum"} → ${details.coupleTo ?? "nenhum"}`);
  }

  if (typeof details.reason === "string") {
    parts.push(details.reason);
  }

  if (details.isPublic === false) {
    parts.push("era privada");
  }

  if (Array.isArray(details.fields) && details.fields.length) {
    parts.push(details.fields.join(", "));
  }

  return parts.join(" · ");
}
