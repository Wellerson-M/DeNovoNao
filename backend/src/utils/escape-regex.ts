// Escapa caracteres especiais para usar texto digitado pelo usuário dentro de $regex.
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
