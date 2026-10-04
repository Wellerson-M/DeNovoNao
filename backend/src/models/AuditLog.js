import mongoose, { Schema, model } from "mongoose";

/**
 * Ocorrências do painel admin: registro de quem fez o quê.
 * Só grava ações que mudam dados (ou tentativas de login), nunca leituras.
 */
const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      default: null,
      index: true,
    },
    actorName: {
      type: String,
      default: "",
      trim: true,
    },
    actorLogin: {
      type: String,
      default: "",
      trim: true,
    },
    actorRole: {
      type: Number,
      default: 0,
    },
    targetType: {
      type: String,
      enum: ["review", "user", "system"],
      default: "system",
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    targetLabel: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Listagem padrão: mais recentes primeiro, com filtro por tipo de ação.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || model("AuditLog", auditLogSchema);
