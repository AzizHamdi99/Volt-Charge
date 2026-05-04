import { connectDB } from "@/libs/mongoose";
import { Vehicle } from "@/models/Vehicle";

interface UpdateVehicleData {
  licensePlate?: string;
  vin?: string;
  fullName?: string;
  make?: string;
  model?: string;
  year?: string;
  fuelType?: string;
}

export async function updateVehicle(id: string, ownerId: string, data: UpdateVehicleData) {
  if (!id) throw new Error("ID is required");
  if (!ownerId) throw new Error("ownerId is required");
  await connectDB();

  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: id, ownerId },
    { $set: data },
    { new: true }
  );

  if (!vehicle) throw new Error("Vehicle not found");
  return vehicle;
}