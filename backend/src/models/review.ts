import mongoose, { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    placeName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    locationLabel: {
      type: String,
      required: true,
      trim: true,
    },
    coupleRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    myOpinion: {
      type: String,
      default: "",
      trim: true,
    },
    herOpinion: {
      type: String,
      default: "",
      trim: true,
    },
    redFlags: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: String,
      enum: ["casal"],
      default: "casal",
    },
    syncMeta: {
      source: {
        type: String,
        enum: ["web", "mobile-pwa", "import"],
        default: "mobile-pwa",
      },
      clientReviewId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      lastSyncedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reviewSchema.index({ placeName: "text", locationLabel: "text", redFlags: "text" });

export type ReviewDocument = {
  placeName: string;
  locationLabel: string;
  coupleRating: number;
  myOpinion: string;
  herOpinion: string;
  redFlags: string[];
  tags: string[];
  visitedAt: Date;
  createdBy: "casal";
  syncMeta: {
    source: "web" | "mobile-pwa" | "import";
    clientReviewId: string;
    lastSyncedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};

export const Review = mongoose.models.Review || model("Review", reviewSchema);
