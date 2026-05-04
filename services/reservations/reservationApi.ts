import axios from "axios";

export interface ReservationStationDto {
  _id: string;
  id: string;
  name: string;
  address: string;
  rate: number;
}

export interface ReservationVehicleDto {
  _id: string;
  id: string;
  fullName: string;
  licensePlate: string;
  year: string;
}

export interface ReservationDto {
  _id: string;
  id: string;
  userId: string;
  stationId: string;
  vehicleId: string;
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  rate: number;
  durationMinutes: number;
  status: "confirmed" | "cancelled" | "completed";
  station: ReservationStationDto | null;
  vehicle: ReservationVehicleDto | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReservationPayload {
  stationId: string;
  vehicleId: string;
  date: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  rate: number;
  durationMinutes?: number;
}

export interface SendReservationOtpResponse {
  success: boolean;
  message: string;
  email: string;
  expiresInSeconds: number;
}

export async function getReservationsApi() {
  const res = await axios.get<ReservationDto[]>("/api/reservation");
  return res.data;
}

export async function getReservationApi(id: string) {
  const res = await axios.get<ReservationDto>(`/api/reservation/${id}`);
  return res.data;
}

export async function createReservationApi(payload: CreateReservationPayload) {
  const res = await axios.post<ReservationDto>("/api/reservation", payload);
  return res.data;
}

export async function sendReservationOtpApi(payload: CreateReservationPayload) {
  const res = await axios.post<SendReservationOtpResponse>(
    "/api/reservation/otp/send",
    payload,
  );
  return res.data;
}

export async function confirmReservationWithOtpApi(
  payload: CreateReservationPayload & { otpCode: string },
) {
  const res = await axios.post<ReservationDto>(
    "/api/reservation/otp/confirm",
    payload,
  );
  return res.data;
}

export async function getBookedSlotsApi(stationId: string, date: string) {
  const res = await axios.get<{ bookedSlots: string[] }>(
    "/api/reservation",
    {
      params: { stationId, date },
    },
  );

  return res.data.bookedSlots;
}
