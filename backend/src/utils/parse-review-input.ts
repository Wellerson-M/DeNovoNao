type ReviewBody = {
  placeName?: unknown;
  locationLabel?: unknown;
  placeRating?: unknown;
  opinionOne?: unknown;
  opinionTwo?: unknown;
  criticalWarnings?: unknown;
  visitedAt?: unknown;
  isPublic?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asWarnings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function asDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseCreateReviewInput(input: ReviewBody) {
  const placeName = asString(input.placeName);
  const locationLabel = asString(input.locationLabel);
  const opinionOne = asString(input.opinionOne);
  const opinionTwo = asString(input.opinionTwo);
  const placeRating = Number(input.placeRating);
  const criticalWarnings = asWarnings(input.criticalWarnings);
  const visitedAt = asDate(input.visitedAt) ?? new Date();
  const isPublic = typeof input.isPublic === "boolean" ? input.isPublic : false;

  if (!placeName) {
    throw new Error("Informe o nome do local.");
  }

  if (!locationLabel) {
    throw new Error("Informe a localização do local.");
  }

  if (!Number.isFinite(placeRating) || placeRating < 1 || placeRating > 5) {
    throw new Error("A nota do local precisa estar entre 1 e 5.");
  }

  return {
    placeName,
    locationLabel,
    placeRating,
    opinionOne,
    opinionTwo,
    criticalWarnings,
    visitedAt,
    isPublic,
    active: true,
  };
}

export function parseUpdateReviewInput(input: ReviewBody) {
  const patch: Record<string, unknown> = {};

  if (input.placeName !== undefined) {
    const placeName = asString(input.placeName);
    if (!placeName) {
      throw new Error("O nome do local não pode ficar vazio.");
    }
    patch.placeName = placeName;
  }

  if (input.locationLabel !== undefined) {
    const locationLabel = asString(input.locationLabel);
    if (!locationLabel) {
      throw new Error("A localização não pode ficar vazia.");
    }
    patch.locationLabel = locationLabel;
  }

  if (input.placeRating !== undefined) {
    const placeRating = Number(input.placeRating);
    if (!Number.isFinite(placeRating) || placeRating < 1 || placeRating > 5) {
      throw new Error("A nota do local precisa estar entre 1 e 5.");
    }
    patch.placeRating = placeRating;
  }

  if (input.opinionOne !== undefined) {
    patch.opinionOne = asString(input.opinionOne);
  }

  if (input.opinionTwo !== undefined) {
    patch.opinionTwo = asString(input.opinionTwo);
  }

  if (input.criticalWarnings !== undefined) {
    patch.criticalWarnings = asWarnings(input.criticalWarnings);
  }

  if (input.visitedAt !== undefined) {
    const visitedAt = asDate(input.visitedAt);
    if (!visitedAt) {
      throw new Error("A data da visita precisa ser válida.");
    }
    patch.visitedAt = visitedAt;
  }

  if (input.isPublic !== undefined) {
    if (typeof input.isPublic !== "boolean") {
      throw new Error("O campo de privacidade está inválido.");
    }
    patch.isPublic = input.isPublic;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("Nenhum campo válido foi enviado para atualização.");
  }

  return patch;
}

export function parseDeleteMode(input: { mode?: unknown }) {
  const mode = typeof input.mode === "string" ? input.mode.trim().toLowerCase() : "soft";

  if (mode !== "soft" && mode !== "hard") {
    throw new Error("O modo de exclusão precisa ser soft ou hard.");
  }

  return mode as "soft" | "hard";
}
