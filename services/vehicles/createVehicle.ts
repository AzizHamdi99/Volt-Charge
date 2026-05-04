import { connectDB } from "@/libs/mongoose";
import { Vehicle } from "@/models/Vehicle";

interface VehicleData {
  licensePlate: string;
  vin: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  ownerId: string;
}

export async function createVehicle(data: VehicleData) {
  if (!data.licensePlate || !data.vin || !data.ownerId) {
    throw new Error("License plate, VIN and ownerId are required");
  }

  await connectDB();

  const existing = await Vehicle.findOne({
    $or: [{ licensePlate: data.licensePlate }, { vin: data.vin }],
  });

  if (existing) throw new Error("Vehicle already exists");

  const vehicle = await Vehicle.create(data);
  return vehicle;
}