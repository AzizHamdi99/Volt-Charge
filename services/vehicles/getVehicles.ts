import { connectDB } from "@/libs/mongoose";
import { Vehicle } from "@/models/Vehicle";

export async function getVehicleById(id: string, ownerId: string) {
  if (!id) throw new Error("ID is required");
  if (!ownerId) throw new Error("ownerId is required");
  await connectDB();
  const vehicle = await Vehicle.findOne({ _id: id, ownerId });
  if (!vehicle) throw new Error("Vehicle not found");
  return vehicle;
}

export async function getVehiclesByOwner(ownerId: string) {
  if (!ownerId) throw new Error("ownerId is required");
  await connectDB();
  return await Vehicle.find({ ownerId }).sort({ createdAt: -1 });
}