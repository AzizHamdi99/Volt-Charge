import mongoose from "mongoose";

export type ReservationStatus = "confirmed" | "cancelled" | "completed";

export interface IReservation extends mongoose.Document {
  userId: string;
  stationId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  rate: number;
  durationMinutes: number;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new mongoose.Schema<IReservation>(
  {
    userId: { type: String, required: true, index: true },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    date: { type: String, required: true, trim: true, index: true },
    slotLabel: { type: String, required: true, trim: true },
    slotStart: { type: String, required: true, trim: true },
    slotEnd: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 60, min: 1 },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

ReservationSchema.index(
  { stationId: 1, date: 1, slotLabel: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
  },
);

export const Reservation =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);
