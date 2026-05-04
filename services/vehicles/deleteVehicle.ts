import { connectDB } from "@/libs/mongoose";
import { Vehicle } from "@/models/Vehicle";

export async function deleteVehicle(id: string, ownerId: string) {
  if (!id) throw new Error("ID is required");
  if (!ownerId) throw new Error("ownerId is required");
  await connectDB();

  const vehicle = await Vehicle.findOneAndDelete({ _id: id, ownerId });
  if (!vehicle) throw new Error("Vehicle not found");

  return { message: "Vehicle deleted successfully" };
}