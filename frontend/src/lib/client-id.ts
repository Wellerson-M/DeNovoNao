function hex(byte: number) {
  return byte.toString(16).padStart(2, "0");
}

export function generateClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const parts = [
      Array.from(bytes.slice(0, 4)).map(hex).join(""),
      Array.from(bytes.slice(4, 6)).map(hex).join(""),
      Array.from(bytes.slice(6, 8)).map(hex).join(""),
      Array.from(bytes.slice(8, 10)).map(hex).join(""),
      Array.from(bytes.slice(10, 16)).map(hex).join(""),
    ];

    return parts.join("-");
  }

  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
