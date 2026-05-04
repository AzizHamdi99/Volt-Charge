import axios from "axios";
import type { ConnectorDto } from "@/services/connectors/connectorApi";

export type StationStatus = "available" | "partial" | "full" | "offline";

export interface StationPayload {
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: StationStatus;
  connectorIds: string[];
  rate: number;
  rating: number;
  reviews: number;
  distance: string;
}

export interface StationDto extends Omit<StationPayload, "connectorIds"> {
  _id: string;
  id: string;
  connectors: ConnectorDto[];
  availableCount: number;
  totalCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getStationsApi() {
  const res = await axios.get<StationDto[]>("/api/station");
  return res.data;
}

export async function getStationApi(id: string) {
  const res = await axios.get<StationDto>(`/api/station/${id}`);
  return res.data;
}

export async function createStationApi(payload: StationPayload) {
  const res = await axios.post<StationDto>("/api/station", payload);
  return res.data;
}

export async function updateStationApi(id: string, payload: Partial<StationPayload>) {
  const res = await axios.put<StationDto>(`/api/station/${id}`, payload);
  return res.data;
}

export async function deleteStationApi(id: string) {
  const res = await axios.delete<{ message: string }>(`/api/station/${id}`);
  return res.data;
}
