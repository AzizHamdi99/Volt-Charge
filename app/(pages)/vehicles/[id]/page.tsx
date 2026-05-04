"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  FileText,
  Lock,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  deleteVehicleApi,
  getVehicleApi,
  type VehicleDto,
  updateVehicleApi,
} from "@/services/vehicles/vehicleApi";
import { CenteredSpinner } from "@/components/ui/centered-spinner";

type FormState = {
  licensePlate: string;
  vin: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
};

const EMPTY: FormState = {
  licensePlate: "",
  vin: "",
  fullName: "",
  make: "",
  model: "",
  year: "",
  fuelType: "",
};

function apiErrorMessage(err: unknown, fallback: string) {
  const maybe = err as { response?: { data?: { error?: unknown } } };
  const fromApi = maybe?.response?.data?.error;
  return typeof fromApi === "string" ? fromApi : fallback;
}

function fieldLabel(key: keyof FormState) {
  switch (key) {
    case "licensePlate":
      return "License Plate";
    case "vin":
      return "VIN";
    case "fullName":
      return "Owner Name";
    case "make":
      return "Make";
    case "model":
      return "Model";
    case "year":
      return "Year";
    case "fuelType":
      return "Fuel Type";
    default:
      return key;
  }
}

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vehicleId = params?.id;

  const [vehicle, setVehicle] = useState<VehicleDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    if (!vehicleId) return;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // Only the car id is sent. OwnerId is derived from the server session.
        const data = await getVehicleApi(vehicleId);
        if (!alive) return;
        setVehicle(data);
        setForm({
          licensePlate: data.licensePlate ?? "",
          vin: data.vin ?? "",
          fullName: data.fullName ?? "",
          make: data.make ?? "",
          model: data.model ?? "",
          year: data.year ?? "",
          fuelType: data.fuelType ?? "",
        });
      } catch (err: unknown) {
        if (!alive) return;
        const message = apiErrorMessage(err, "Failed to load vehicle");
        setError(message);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [vehicleId]);

  const hero = useMemo(() => {
    const title = vehicle?.fullName || "Vehicle";
    const subtitleParts = [vehicle?.year, vehicle?.fuelType].filter(Boolean);
    return {
      title,
      subtitle: subtitleParts.join(" • "),
      plate: vehicle?.licensePlate || "—",
    };
  }, [vehicle]);

  const saveChanges = async () => {
    if (!vehicleId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateVehicleApi(vehicleId, {
        licensePlate: form.licensePlate,
        vin: form.vin,
        fullName: form.fullName,
        make: form.make,
        model: form.model,
        year: form.year,
        fuelType: form.fuelType,
      });
      setVehicle(updated);
      setEditMode(false);
    } catch (err: unknown) {
      const message = apiErrorMessage(err, "Failed to update vehicle");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async () => {
    if (!vehicleId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteVehicleApi(vehicleId);
      router.push("/vehicles");
    } catch (err: unknown) {
      const message = apiErrorMessage(err, "Failed to delete vehicle");
      setError(message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-gray-50 min-h-screen">
        <CenteredSpinner label="Loading vehicle..." className="min-h-[70vh]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/vehicles")}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-800">
            Vehicle Details
          </h1>
        </div>

        <button
          onClick={() => {
            if (!vehicle) return;
            setEditMode((v) => !v);
            setError(null);
            if (!editMode) {
              setForm({
                licensePlate: vehicle.licensePlate ?? "",
                vin: vehicle.vin ?? "",
                fullName: vehicle.fullName ?? "",
                make: vehicle.make ?? "",
                model: vehicle.model ?? "",
                year: vehicle.year ?? "",
                fuelType: vehicle.fuelType ?? "",
              });
            }
          }}
          className="text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-2"
          disabled={!vehicle}
          aria-label="Edit"
          title="Edit"
        >
          <Pencil size={18} />
          <span className="text-sm font-medium">Edit</span>
        </button>
      </div>

      <div className="flex-1 p-8">
        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {!vehicle ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-4xl mx-auto">
            <p className="text-gray-500 text-sm">Vehicle not found.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-3xl overflow-hidden border border-gray-100 bg-black relative">
              <div className="h-56 sm:h-64 bg-linear-to-br from-black via-black to-gray-900" />
              <div className="absolute inset-0 flex items-end justify-between p-8">
                <div>
                  <h2 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
                    {hero.title}
                  </h2>
                  <p className="text-gray-200 text-sm mt-2">{hero.subtitle}</p>
                </div>
                <div className="bg-white/15 backdrop-blur rounded-xl px-5 py-3">
                  <span className="text-white text-sm font-semibold">
                    {hero.plate}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <FileText size={18} className="text-cyan-600" />
                  </div>
                  <h3 className="text-gray-800 font-semibold">
                    Registration Details
                  </h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5">
                  Verified
                </span>
              </div>

              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {(Object.keys(EMPTY) as Array<keyof FormState>).map((k) => (
                    <div key={k}>
                      <label className="text-xs text-gray-400 block mb-2">
                        {fieldLabel(k)}
                      </label>
                      <input
                        value={form[k]}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, [k]: e.target.value }))
                        }
                        className="w-full rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none border border-gray-100 bg-gray-50 focus:border-cyan-400"
                      />
                    </div>
                  ))}

                  <div className="sm:col-span-2 flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setError(null);
                      }}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void saveChanges()}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-10">
                  <div>
                    <p className="text-xs text-gray-400">License Plate</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.licensePlate}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">VIN</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.vin}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Owner Name</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.fullName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Make</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.make}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Model</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.model}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Year</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.year}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Fuel Type</p>
                    <p className="text-sm text-gray-800 font-semibold mt-2">
                      {vehicle.fuelType}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Lock size={18} className="text-gray-600" />
                </div>
                <h3 className="text-gray-800 font-semibold">
                  Encrypted Document
                </h3>
              </div>

              <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-200 relative">
                <div className="h-44 sm:h-52 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center mb-4">
                    <Lock size={18} className="text-gray-700" />
                  </div>
                  <p className="text-gray-700 text-sm font-medium">
                    Document is encrypted and stored securely
                  </p>
                  <button
                    className="mt-3 text-sm text-gray-600 hover:text-gray-800"
                    type="button"
                  >
                    Update Document
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={() => void deleteVehicle()}
                disabled={deleting}
                className="inline-flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Delete Vehicle"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
