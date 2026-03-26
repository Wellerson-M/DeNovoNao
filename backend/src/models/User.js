import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      enum: [0, 1, 2],
      default: 0,
      index: true,
    },
    id_casal: {
      type: String,
      default: null,
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

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ id_casal: 1, role: 1 });

export const User = mongoose.models.User || model("User", userSchema);
