import type { AuthResponse } from "@/lib/types";

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }

  return "http://localhost:4000/api";
}

type AuthRequest = {
  email: string;
  password: string;
};

type RegisterRequest = AuthRequest & {
  name: string;
};

async function readErrorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
}

export async function loginUser(input: AuthRequest) {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível entrar"));
  }

  return (await response.json()) as AuthResponse;
}

export async function registerUser(input: RegisterRequest) {
  const response = await fetch(`${getApiUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível criar a conta"));
  }

  return (await response.json()) as AuthResponse;
}
