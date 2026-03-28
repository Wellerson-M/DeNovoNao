import mongoose, { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    id_casal: {
      type: String,
      required: true,
      index: true,
    },
    createdByUserId: {
      type: String,
      default: null,
      index: true,
    },
    createdByName: {
      type: String,
      default: "",
      trim: true,
    },
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
      index: true,
    },
    isDelivery: {
      type: Boolean,
      default: false,
      index: true,
    },
    placeRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    opinionOne: {
      type: String,
      default: "",
      trim: true,
    },
    opinionTwo: {
      type: String,
      default: "",
      trim: true,
    },
    criticalWarnings: {
      type: [String],
      default: [],
    },
    visitedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reviewSchema.index({
  placeName: "text",
  locationLabel: "text",
  opinionOne: "text",
  opinionTwo: "text",
  criticalWarnings: "text",
});

export const Review = mongoose.models.Review || model("Review", reviewSchema);
