import mongoose from "mongoose";
export interface IVehicle extends Document {
  licensePlate: string;
  vin: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new mongoose.Schema<IVehicle>(
  {
    licensePlate: { type: String, required: true, unique: true },
    vin: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: String, required: true },
    fuelType: { type: String, required: true },
    ownerId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Vehicle =
  mongoose.models.Vehicle ||
  mongoose.model<IVehicle>("Vehicle", VehicleSchema);
