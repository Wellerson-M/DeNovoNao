const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

/** R$ 32 — sem centavos quando o valor é redondo. */
export function formatPrice(value: number) {
  return Number.isInteger(value) ? BRL.format(value).replace(/,00$/, "") : BRL.format(value);
}

/** "R$ 32" quando min = max, ou "R$ 28 a R$ 45" quando há faixa. */
export function formatPriceRange(min: number, max: number) {
  return min === max ? formatPrice(min) : `${formatPrice(min)} a ${formatPrice(max)}`;
}
