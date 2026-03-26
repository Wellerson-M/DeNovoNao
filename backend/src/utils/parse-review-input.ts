type ReviewBody = {
  placeName?: unknown;
  locationLabel?: unknown;
  placeRating?: unknown;
  opinionOne?: unknown;
  opinionTwo?: unknown;
  criticalWarnings?: unknown;
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

export function parseCreateReviewInput(input: ReviewBody) {
  const placeName = asString(input.placeName);
  const locationLabel = asString(input.locationLabel);
  const opinionOne = asString(input.opinionOne);
  const opinionTwo = asString(input.opinionTwo);
  const placeRating = Number(input.placeRating);
  const criticalWarnings = asWarnings(input.criticalWarnings);
  const isPublic = typeof input.isPublic === "boolean" ? input.isPublic : false;

  if (!placeName) {
    throw new Error("placeName is required");
  }

  if (!locationLabel) {
    throw new Error("locationLabel is required");
  }

  if (!Number.isFinite(placeRating) || placeRating < 1 || placeRating > 5) {
    throw new Error("placeRating must be between 1 and 5");
  }

  return {
    placeName,
    locationLabel,
    placeRating,
    opinionOne,
    opinionTwo,
    criticalWarnings,
    isPublic,
    active: true,
  };
}

export function parseUpdateReviewInput(input: ReviewBody) {
  const patch: Record<string, unknown> = {};

  if (input.placeName !== undefined) {
    const placeName = asString(input.placeName);
    if (!placeName) {
      throw new Error("placeName cannot be empty");
    }
    patch.placeName = placeName;
  }

  if (input.locationLabel !== undefined) {
    const locationLabel = asString(input.locationLabel);
    if (!locationLabel) {
      throw new Error("locationLabel cannot be empty");
    }
    patch.locationLabel = locationLabel;
  }

  if (input.placeRating !== undefined) {
    const placeRating = Number(input.placeRating);
    if (!Number.isFinite(placeRating) || placeRating < 1 || placeRating > 5) {
      throw new Error("placeRating must be between 1 and 5");
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

  if (input.isPublic !== undefined) {
    if (typeof input.isPublic !== "boolean") {
      throw new Error("isPublic must be boolean");
    }
    patch.isPublic = input.isPublic;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("No valid fields to update");
  }

  return patch;
}

export function parseDeleteMode(input: { mode?: unknown }) {
  const mode = typeof input.mode === "string" ? input.mode.trim().toLowerCase() : "soft";

  if (mode !== "soft" && mode !== "hard") {
    throw new Error("mode must be soft or hard");
  }

  return mode as "soft" | "hard";
}
