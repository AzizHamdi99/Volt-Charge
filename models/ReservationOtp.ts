import mongoose from "mongoose";

export interface IReservationOtp extends mongoose.Document {
  userId: string;
  email: string;
  stationId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  codeHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationOtpSchema = new mongoose.Schema<IReservationOtp>(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, trim: true },
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
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

ReservationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ReservationOtpSchema.index(
  {
    userId: 1,
    stationId: 1,
    vehicleId: 1,
    date: 1,
    slotLabel: 1,
    usedAt: 1,
  },
  { name: "reservation_otp_lookup" },
);

export const ReservationOtp =
  mongoose.models.ReservationOtp ||
  mongoose.model<IReservationOtp>("ReservationOtp", ReservationOtpSchema);
