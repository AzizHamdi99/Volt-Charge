import axios from "axios";

export type ConnectorStatus = "available" | "occupied" | "fault";

export interface ConnectorPayload {
  type: string;
  speed: string;
  status: ConnectorStatus;
  stationId?: string | null;
}

export interface ConnectorDto extends ConnectorPayload {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getConnectorsApi(stationId?: string) {
  const query = stationId ? `?stationId=${stationId}` : "";
  const res = await axios.get<ConnectorDto[]>(`/api/connector${query}`);
  return res.data;
}

export async function getConnectorApi(id: string) {
  const res = await axios.get<ConnectorDto>(`/api/connector/${id}`);
  return res.data;
}

export async function createConnectorApi(payload: ConnectorPayload) {
  const res = await axios.post<ConnectorDto>("/api/connector", payload);
  return res.data;
}

export async function updateConnectorApi(
  id: string,
  payload: Partial<ConnectorPayload>,
) {
  const res = await axios.put<ConnectorDto>(`/api/connector/${id}`, payload);
  return res.data;
}

export async function deleteConnectorApi(id: string) {
  const res = await axios.delete<{ message: string }>(`/api/connector/${id}`);
  return res.data;
}
