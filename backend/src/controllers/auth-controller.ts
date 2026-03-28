import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { User } from "../models/User.js";
import { getReviewDriver } from "../data/review-store.js";
import { signAuthToken } from "../utils/auth-token.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

function normalizeLogin(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseRegisterInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido.");
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const login = normalizeLogin(input.login);
  const password = typeof input.password === "string" ? input.password : "";

  if (name.length < 2) {
    throw new Error("O nome precisa ter pelo menos 2 caracteres.");
  }

  if (!LOGIN_REGEX.test(login)) {
    throw new Error("O login deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.");
  }

  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  return { name, login, password };
}

function parseLoginInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido.");
  }

  const input = body as Record<string, unknown>;
  const login = normalizeLogin(input.login);
  const password = typeof input.password === "string" ? input.password : "";

  if (!login) {
    throw new Error("Login obrigatório.");
  }

  if (!password) {
    throw new Error("Senha obrigatória.");
  }

  return { login, password };
}

function parseUpdateProfileInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido.");
  }

  const input = body as Record<string, unknown>;
  const patch: {
    name?: string;
    login?: string;
    currentPassword?: string;
    newPassword?: string;
  } = {};

  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new Error("O nome precisa ter pelo menos 2 caracteres.");
    }
    patch.name = name;
  }

  if (typeof input.login === "string") {
    const login = normalizeLogin(input.login);
    if (!LOGIN_REGEX.test(login)) {
      throw new Error("O login deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.");
    }
    patch.login = login;
  }

  if (typeof input.newPassword === "string" && input.newPassword) {
    const { newPassword } = input;
    const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";

    if (!currentPassword) {
      throw new Error("Informe a senha atual para trocar a senha.");
    }

    if (newPassword.length < 6) {
      throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
    }

    patch.currentPassword = currentPassword;
    patch.newPassword = newPassword;
  }

  if (!patch.name && !patch.login && !patch.newPassword) {
    throw new Error("Nenhuma alteração válida foi enviada.");
  }

  return patch;
}

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A autenticação exige conexão com o MongoDB." });
    return false;
  }

  return true;
}

function serializeUser(user: InstanceType<typeof User>) {
  return {
    id: String(user._id),
    name: user.name,
    login: user.login ?? null,
    email: user.email ?? null,
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
    const { name, login, password } = parseRegisterInput(request.body);
    const existingUser = await User.findOne({ login });

    if (existingUser) {
      return response.status(409).json({ message: "Este login já está em uso." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const generatedCoupleId = new mongoose.Types.ObjectId().toString();
    const user = await User.create({
      name,
      login,
      passwordHash,
      role: 1,
      id_casal: generatedCoupleId,
      active: true,
    });

    const token = signAuthToken({
      userId: String(user._id),
      name: user.name,
      login: user.login ?? login,
      email: user.email ?? "",
      role: user.role,
      id_casal: user.id_casal == null ? null : String(user.id_casal),
    });

    return response.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar a conta.";
    return response.status(400).json({ message });
  }
}

export async function loginController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const { login, password } = parseLoginInput(request.body);
    const user = await User.findOne({
      $or: [
        { login },
        ...(EMAIL_REGEX.test(login) ? [{ email: login }] : []),
      ],
    });

    if (!user || !user.active) {
      return response.status(401).json({ message: "Login ou senha inválidos." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return response.status(401).json({ message: "Login ou senha inválidos." });
    }

    const token = signAuthToken({
      userId: String(user._id),
      name: user.name,
      login: user.login ?? login,
      email: user.email ?? "",
      role: user.role,
      id_casal: user.id_casal == null ? null : String(user.id_casal),
    });

    return response.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível entrar.";
    return response.status(400).json({ message });
  }
}

export async function updateMeController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const { authUser } = request;
    if (!authUser?.id) {
      return response.status(401).json({ message: "Autenticação obrigatória." });
    }

    const input = parseUpdateProfileInput(request.body);
    const user = await User.findById(authUser.id);

    if (!user || !user.active) {
      return response.status(404).json({ message: "Usuário não encontrado." });
    }

    if (input.login && input.login !== user.login) {
      const loginInUse = await User.findOne({ login: input.login, _id: { $ne: user._id } });
      if (loginInUse) {
        return response.status(409).json({ message: "Este login já está em uso." });
      }
      user.login = input.login;
    }

    if (input.name) {
      user.name = input.name;
    }

    if (input.newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword ?? "", user.passwordHash);
      if (!isCurrentPasswordValid) {
        return response.status(401).json({ message: "A senha atual está incorreta." });
      }
      user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    }

    await user.save();

    const token = signAuthToken({
      userId: String(user._id),
      name: user.name,
      login: user.login ?? "",
      email: user.email ?? "",
      role: user.role,
      id_casal: user.id_casal == null ? null : String(user.id_casal),
    });

    return response.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o perfil.";
    return response.status(400).json({ message });
  }
}

