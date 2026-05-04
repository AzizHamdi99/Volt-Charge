"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { getStationApi, type StationDto } from "@/services/stations/stationApi";
import {
  getVehiclesApi,
  type VehicleDto,
} from "@/services/vehicles/vehicleApi";
import {
  confirmReservationWithOtpApi,
  getBookedSlotsApi,
  sendReservationOtpApi,
} from "@/services/reservations/reservationApi";
import { CenteredSpinner } from "@/components/ui/centered-spinner";

type Step = 1 | 2 | 3;

type TimeSlot = {
  label: string;
  start: string;
  end: string;
};

function parseStep(raw: string | null): Step {
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  return 1;
}

function formatHumanDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayLabel(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { week: "", day: "" };

  return {
    week: date.toLocaleDateString(undefined, { weekday: "short" }),
    day: String(date.getDate()),
  };
}

function buildSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 18; hour += 1) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
    slots.push({
      start,
      end,
      label: `${start} - ${end}`,
    });
  }
  return slots;
}

function buildDateOptions(): string[] {
  const list: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    list.push(`${year}-${month}-${day}`);
  }
  return list;
}

function StepIndicator({ step }: { step: Step }) {
  const items = [1, 2, 3] as const;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {items.map((item, idx) => {
        const done = item < step;
        const active = item === step;

        return (
          <div key={item} className="flex items-center gap-2 sm:gap-3">
            <div
              className={`h-9 w-9 rounded-full border text-sm font-semibold flex items-center justify-center ${
                done
                  ? "bg-cyan-100 border-cyan-200 text-cyan-600"
                  : active
                    ? "bg-cyan-500 border-cyan-500 text-white"
                    : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
            >
              {done ? <Check size={16} /> : item}
            </div>
            {idx < items.length - 1 && (
              <div
                className={`h-1 w-8 sm:w-12 rounded-full ${
                  item < step ? "bg-cyan-300" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewReservationPage() {
  const params = useParams<{ stationId: string }>();
  const stationId =
    typeof params.stationId === "string" ? params.stationId : "";

  const router = useRouter();
  const searchParams = useSearchParams();

  const dateOptions = useMemo(buildDateOptions, []);
  const timeSlots = useMemo(buildSlots, []);

  const [step, setStep] = useState<Step>(parseStep(searchParams.get("step")));
  const [station, setStation] = useState<StationDto | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") ?? dateOptions[0],
  );
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>(
    searchParams.get("slot") ?? "",
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    searchParams.get("vehicleId") ?? "",
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle._id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const selectedSlot = useMemo(
    () => timeSlots.find((slot) => slot.label === selectedSlotLabel) ?? null,
    [selectedSlotLabel, timeSlots],
  );

  useEffect(() => {
    setStep(parseStep(searchParams.get("step")));
  }, [searchParams]);

  useEffect(() => {
    if (!stationId) return;

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [stationData, vehicleData] = await Promise.all([
          getStationApi(stationId),
          getVehiclesApi(),
        ]);

        if (!active) return;

        setStation(stationData);
        setVehicles(vehicleData);

        if (!selectedVehicleId && vehicleData.length > 0) {
          setSelectedVehicleId(vehicleData[0]._id);
        }
      } catch (err: any) {
        if (!active) return;
        const message =
          typeof err?.response?.data?.error === "string"
            ? err.response.data.error
            : "Failed to load reservation data";
        setError(message);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [stationId]);

  useEffect(() => {
    if (!stationId || !selectedDate) return;

    let active = true;

    void (async () => {
      try {
        const slots = await getBookedSlotsApi(stationId, selectedDate);
        if (!active) return;
        setBookedSlots(slots);
      } catch {
        if (!active) return;
        setBookedSlots([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [stationId, selectedDate]);

  useEffect(() => {
    if (selectedSlotLabel && bookedSlots.includes(selectedSlotLabel)) {
      setSelectedSlotLabel("");
    }
  }, [bookedSlots, selectedSlotLabel]);

  function updateUrl(next: {
    step?: Step;
    date?: string;
    slot?: string;
    vehicleId?: string;
  }) {
    const query = new URLSearchParams(searchParams.toString());

    const newStep = next.step ?? step;
    const newDate = next.date ?? selectedDate;
    const newSlot = next.slot ?? selectedSlotLabel;
    const newVehicleId = next.vehicleId ?? selectedVehicleId;

    query.set("step", String(newStep));
    if (newDate) query.set("date", newDate);
    if (newSlot) query.set("slot", newSlot);
    else query.delete("slot");

    if (newVehicleId) query.set("vehicleId", newVehicleId);
    else query.delete("vehicleId");

    router.replace(`/reservations/new/${stationId}?${query.toString()}`);
  }

  function goToStep(nextStep: Step) {
    setStep(nextStep);
    updateUrl({ step: nextStep });
  }

  function handleNextFromStep1() {
    if (!selectedDate || !selectedSlot) {
      setError("Please select a date and slot to continue");
      return;
    }
    setError(null);
    goToStep(2);
  }

  function handleNextFromStep2() {
    if (!selectedVehicleId) {
      setError("Please select a vehicle to continue");
      return;
    }
    setError(null);
    goToStep(3);
  }

  async function handleConfirmReservation() {
    if (!station || !selectedSlot || !selectedVehicleId || !selectedDate) {
      setError("Missing reservation information");
      return;
    }

    if (!otpSent) {
      setError("Please request an OTP code first");
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setError("Please enter the 6-digit OTP code sent to your email");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await confirmReservationWithOtpApi({
        stationId: station._id,
        vehicleId: selectedVehicleId,
        date: selectedDate,
        slotLabel: selectedSlot.label,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        rate: station.rate,
        durationMinutes: 60,
        otpCode,
      });

      router.push("/bookings");
    } catch (err: any) {
      const message =
        typeof err?.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not confirm this reservation";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendOtp() {
    if (!station || !selectedSlot || !selectedVehicleId || !selectedDate) {
      setError("Missing reservation information");
      return;
    }

    setSendingOtp(true);
    setError(null);
    setOtpMessage(null);

    try {
      const response = await sendReservationOtpApi({
        stationId: station._id,
        vehicleId: selectedVehicleId,
        date: selectedDate,
        slotLabel: selectedSlot.label,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        rate: station.rate,
        durationMinutes: 60,
      });

      setOtpSent(true);
      setOtpMessage(
        `OTP sent to ${response.email}. The code expires in ${Math.floor(response.expiresInSeconds / 60)} minutes.`,
      );
    } catch (err: any) {
      const message =
        typeof err?.response?.data?.error === "string"
          ? err.response.data.error
          : "Could not send OTP code";
      setError(message);
      setOtpSent(false);
    } finally {
      setSendingOtp(false);
    }
  }

  const headerAddress = station?.address ?? "";

  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-3 sm:p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6 md:px-8">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-1 rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-slate-800">
                {station?.name ?? "Charging Station"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{headerAddress}</p>
            </div>

            <div className="w-9" />
          </div>

          <div className="flex items-center justify-center">
            <StepIndicator step={step} />
          </div>
        </div>

        <div className="bg-slate-100 p-4 sm:p-6 md:p-8">
          {loading ? (
            <div className="rounded-2xl bg-white p-8">
              <CenteredSpinner
                label="Loading reservation flow..."
                className="min-h-[40vh]"
              />
            </div>
          ) : !station ? (
            <div className="rounded-2xl bg-white p-8 text-sm text-rose-500">
              Station not found.
            </div>
          ) : (
            <div className="space-y-5">
              {step === 1 && (
                <section className="rounded-2xl bg-white p-5 sm:p-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Select Date & Time
                  </h2>

                  <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-7 sm:gap-3">
                    {dateOptions.map((iso) => {
                      const isActive = selectedDate === iso;
                      const label = getDayLabel(iso);
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            setSelectedDate(iso);
                            updateUrl({ date: iso, slot: "" });
                            setSelectedSlotLabel("");
                          }}
                          className={`rounded-2xl px-2 py-3 text-center border transition-all ${
                            isActive
                              ? "bg-cyan-500 text-white border-cyan-500 shadow-md"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <p className="text-xs font-medium">{label.week}</p>
                          <p className="mt-1 text-2xl font-bold leading-none">
                            {label.day}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-800">
                      Available Slots
                    </h3>
                    <p className="text-cyan-600 font-semibold">
                      {station.rate.toFixed(2)} TND/min
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {timeSlots.map((slot) => {
                      const isActive = selectedSlotLabel === slot.label;
                      const isBooked = bookedSlots.includes(slot.label);

                      return (
                        <button
                          key={slot.label}
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setSelectedSlotLabel(slot.label);
                            updateUrl({ slot: slot.label });
                          }}
                          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            isBooked
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              : isActive
                                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Clock size={16} />
                          <span>{slot.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="rounded-2xl bg-white p-5 sm:p-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Confirm Vehicle
                  </h2>

                  <div className="mt-5 space-y-4">
                    {vehicles.map((vehicle) => {
                      const active = selectedVehicleId === vehicle._id;
                      return (
                        <button
                          key={vehicle._id}
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId(vehicle._id);
                            updateUrl({ vehicleId: vehicle._id });
                          }}
                          className={`w-full rounded-2xl border p-4 sm:p-5 transition-all ${
                            active
                              ? "border-cyan-400 bg-cyan-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 text-2xl">
                                🚗
                              </div>
                              <div className="text-left">
                                <p className="text-xl font-semibold text-slate-800">
                                  {vehicle.fullName}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {vehicle.year} • {vehicle.licensePlate}
                                </p>
                              </div>
                            </div>
                            <div
                              className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${
                                active
                                  ? "border-cyan-500 bg-cyan-500 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {active ? <Check size={14} /> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    <Link
                      href="/addVehicle"
                      className="w-full rounded-2xl border border-dashed border-slate-300 p-5 text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50"
                    >
                      <Car size={18} />
                      <span className="font-semibold">Add New Vehicle</span>
                    </Link>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className="rounded-2xl bg-white p-5 sm:p-6">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Booking Summary
                  </h2>

                  <div className="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5 space-y-4 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-slate-800">
                            {station.name}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            {station.address}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-100 px-4 py-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase">
                            Date
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar size={16} className="text-cyan-500" />
                            {formatHumanDate(selectedDate)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-100 px-4 py-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase">
                            Time
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 flex items-center gap-2">
                            <Clock size={16} className="text-cyan-500" />
                            {selectedSlot?.label ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                        <div className="h-16 w-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 text-2xl">
                          🚗
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase">
                            Vehicle
                          </p>
                          <p className="text-xl font-semibold text-slate-800 mt-1">
                            {selectedVehicle?.fullName ?? "No vehicle selected"}
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            {selectedVehicle?.licensePlate ?? ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-100 border-t border-slate-200 p-5 space-y-2">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Rate</span>
                        <span className="font-semibold text-slate-800">
                          {station.rate.toFixed(2)} TND / min
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Duration</span>
                        <span className="font-semibold text-slate-800">
                          60 mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <p className="text-sm font-semibold text-slate-800">
                      Email Verification (OTP)
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Before confirming, we will send a one-time code to your
                      account email.
                    </p>

                    {otpMessage && (
                      <p className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700">
                        {otpMessage}
                      </p>
                    )}

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || submitting}
                        className="sm:w-56 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {sendingOtp
                          ? "Sending OTP..."
                          : otpSent
                            ? "Resend OTP"
                            : "Send OTP"}
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </section>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => goToStep((step - 1) as Step)}
                    className="sm:w-44 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                )}

                {step < 3 && (
                  <button
                    type="button"
                    onClick={
                      step === 1 ? handleNextFromStep1 : handleNextFromStep2
                    }
                    className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-600 flex items-center justify-center gap-2"
                  >
                    <span>Next Step</span>
                    <ChevronRight size={16} />
                  </button>
                )}

                {step === 3 && (
                  <button
                    type="button"
                    disabled={submitting || sendingOtp}
                    onClick={handleConfirmReservation}
                    className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
                  >
                    {submitting ? "Confirming..." : "Confirm Reservation"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
