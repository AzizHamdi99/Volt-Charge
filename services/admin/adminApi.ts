import axios from "axios";

export type AdminUserDto = {
  _id: string;
  id: string;
  keycloakId: string;
  name: string;
  email: string;
  role: "admin" | "user";
  reservationCount: number;
  vehicleCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminUsersResponse = {
  summary: {
    totalUsers: number;
    adminAccounts: number;
    newThisWeek: number;
  };
  users: AdminUserDto[];
};

export type AdminAppointmentDto = {
  _id: string;
  id: string;
  userId: string;
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  rate: number;
  durationMinutes: number;
  status: "confirmed" | "cancelled" | "completed";
  createdAt?: string;
  updatedAt?: string;
  user: {
    keycloakId: string;
    name: string;
    email: string;
    role: "admin" | "user";
  } | null;
  station: {
    _id: string;
    id: string;
    name: string;
    address: string;
  } | null;
  vehicle: {
    _id: string;
    id: string;
    fullName: string;
    licensePlate: string;
    year: string;
  } | null;
};

export type AdminAppointmentsResponse = {
  summary: {
    totalAppointments: number;
    upcoming: number;
    completedToday: number;
  };
  appointments: AdminAppointmentDto[];
};

export async function getAdminUsersApi() {
  const res = await axios.get<AdminUsersResponse>("/api/admin/users");
  return res.data;
}

export async function getAdminAppointmentsApi() {
  const res = await axios.get<AdminAppointmentsResponse>(
    "/api/admin/appointments",
  );
  return res.data;
}
