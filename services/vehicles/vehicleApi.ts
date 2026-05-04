import axios from "axios";

export interface VehiclePayload {
  licensePlate: string;
  vin: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
}

export interface VehicleDto extends VehiclePayload {
  _id: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function createVehicleApi(payload: VehiclePayload) {
  const res = await axios.post<VehicleDto>("/api/vehicle", payload);
  return res.data;
}

export async function getVehiclesApi() {
  const res = await axios.get<VehicleDto[]>("/api/vehicle");
  return res.data;
}

export async function getVehicleApi(id: string) {
  const res = await axios.get<VehicleDto>(`/api/vehicle/${id}`);
  return res.data;
}

export async function updateVehicleApi(id: string, payload: Partial<VehiclePayload>) {
  const res = await axios.put<VehicleDto>(`/api/vehicle/${id}`, payload);
  return res.data;
}

export async function deleteVehicleApi(id: string) {
  const res = await axios.delete<{ message: string }>(`/api/vehicle/${id}`);
  return res.data;
}
