import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    login: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      enum: [0, 1, 2],
      default: 1,
      index: true,
    },
    id_casal: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ login: 1 }, { unique: true, sparse: true });
userSchema.index({ id_casal: 1, role: 1 });

export const User = mongoose.models.User || model("User", userSchema);

