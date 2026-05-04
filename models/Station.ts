import mongoose from "mongoose";

export type StationStatus = "available" | "partial" | "full" | "offline";

export interface IStation extends mongoose.Document {
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: StationStatus;
  connectorIds: mongoose.Types.ObjectId[];
  rate: number;
  rating: number;
  reviews: number;
  distance: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const StationSchema = new mongoose.Schema<IStation>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: {
      type: String,
      enum: ["available", "partial", "full", "offline"],
      default: "available",
      required: true,
    },
    connectorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Connector",
      },
    ],
    rate: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    distance: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const Station =
  mongoose.models.Station || mongoose.model<IStation>("Station", StationSchema);
