import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { User } from "../models/User.js";
import { getReviewDriver } from "../data/review-store.js";
import { signAuthToken } from "../utils/auth-token.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseRegisterInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido");
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (name.length < 2) {
    throw new Error("O nome precisa ter pelo menos 2 caracteres");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Email inválido");
  }

  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres");
  }

  return { name, email, password };
}

function parseLoginInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido");
  }

  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Email inválido");
  }

  if (!password) {
    throw new Error("Senha obrigatória");
  }

  return { email, password };
}

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A autenticação exige conexão com o MongoDB" });
    return false;
  }

  return true;
}

function serializeUser(user: InstanceType<typeof User>) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    id_casal: user.id_casal == null ? null : String(user.id_casal),
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function registerController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const { name, email, password } = parseRegisterInput(request.body);
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return response.status(409).json({ message: "Este email já está em uso" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const generatedCoupleId = new mongoose.Types.ObjectId().toString();
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 1,
      id_casal: generatedCoupleId,
      active: true,
    });

    const token = signAuthToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      id_casal: user.id_casal == null ? null : String(user.id_casal),
    });

    return response.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return response.status(400).json({ message });
  }
}

export async function loginController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const { email, password } = parseLoginInput(request.body);
    const user = await User.findOne({ email });

    if (!user || !user.active) {
      return response.status(401).json({ message: "Email ou senha inválidos" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return response.status(401).json({ message: "Email ou senha inválidos" });
    }

    const token = signAuthToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      id_casal: user.id_casal == null ? null : String(user.id_casal),
    });

    return response.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return response.status(400).json({ message });
  }
}
