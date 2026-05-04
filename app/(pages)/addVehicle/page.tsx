"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CloudUpload,
  TriangleAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ocrVehicle } from "@/services/vehicles/ocrVehicle";
import { createVehicleApi } from "@/services/vehicles/vehicleApi";

interface VehicleFields {
  licensePlate: string;
  vin: string;
  fullName: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
}

type FieldKey = keyof VehicleFields;

const EMPTY_FIELDS: VehicleFields = {
  licensePlate: "",
  vin: "",
  fullName: "",
  make: "",
  model: "",
  year: "",
  fuelType: "",
};

function labelFor(key: FieldKey) {
  switch (key) {
    case "licensePlate":
      return "License Plate";
    case "vin":
      return "VIN (Vehicle Identification Number)";
    case "fullName":
      return "Owner Full Name";
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

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function computeMatch(key: FieldKey, rawValue: string) {
  const value = normalizeSpace(rawValue);
  const nonEmpty = value.length > 0;

  const ok = (percent: number) => ({ percent, variant: "ok" as const });
  const warn = (percent: number) => ({ percent, variant: "warn" as const });
  const bad = (percent: number) => ({ percent, variant: "bad" as const });

  if (!nonEmpty) return bad(0);

  switch (key) {
    case "licensePlate": {
      const arabic = /\b\d{1,5}\s*تونس\s*\d{1,5}\b/.test(value);
      const latin = /\b\d{1,5}\s*(TUN|TN|TUNIS)\s*\d{1,5}\b/i.test(value);
      if (arabic || latin) return ok(95);
      return warn(70);
    }
    case "vin": {
      const vin = /\b[A-HJ-NPR-Z0-9]{17}\b/i.test(value);
      if (vin) return ok(88);
      return warn(60);
    }
    case "year": {
      const year = /\b(19\d{2}|20\d{2})\b/.test(value);
      if (year) return ok(93);
      return warn(60);
    }
    case "fuelType": {
      const v = value.toLowerCase();
      if (
        [
          "diesel",
          "essence",
          "petrol",
          "gasoline",
          "hybrid",
          "electric",
          "electrique",
          "gpl",
        ].includes(v)
      ) {
        return ok(97);
      }
      return warn(70);
    }
    case "fullName": {
      if (value.length >= 6 && /\s/.test(value)) return warn(72);
      return warn(60);
    }
    case "make":
      return ok(91);
    case "model":
      return ok(85);
    default:
      return warn(70);
  }
}

const AddVehiclePage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<VehicleFields>(EMPTY_FIELDS);
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (nextFile?: File) => {
    const f = nextFile ?? file;
    if (!f) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ocrVehicle(f);
      const merged: VehicleFields = {
        ...EMPTY_FIELDS,
        ...data,
      };

      // If nothing extracted, still show the UI so user can fill manually.
      const hasData = Object.values(merged).some(
        (v) => normalizeSpace(v) !== "",
      );
      if (!hasData) {
        setError(
          "Could not extract details. Please fill in the fields manually.",
        );
      }

      setFields(merged);
    } catch (err) {
      setError("OCR failed. Please try again or fill in manually.");
      setFields(EMPTY_FIELDS);
    } finally {
      setLoading(false);
      setExtracted(true);
    }
  };

  const handleFile = (f: File) => {
    setFile(f);
    setFields(EMPTY_FIELDS);
    setError(null);
    setExtracted(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await createVehicleApi(fields);
      router.push("/vehicles");
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as any).response?.data?.error === "string"
          ? (err as any).response.data.error
          : "Failed to save vehicle. Please verify fields and try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/vehicles")}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-semibold text-gray-800">
          Add New Vehicle
        </h1>
      </div>

      <div className="flex-1 p-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 max-w-3xl mx-auto">
          {!file && (
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Upload Registration
              </h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Upload your vehicle registration document (Carte Grise). We'll
                automatically extract the details.
              </p>
            </div>
          )}

          {/* Drop Zone */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all
                ${
                  dragOver
                    ? "border-cyan-400 bg-cyan-50"
                    : "border-gray-200 bg-gray-50 hover:border-cyan-300 hover:bg-cyan-50/30"
                }`}
            >
              <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mb-5">
                <CloudUpload size={24} className="text-cyan-500" />
              </div>
              <p className="text-gray-700 font-semibold text-sm mb-1">
                Click or drag file to this area
              </p>
              <p className="text-gray-400 text-xs">
                Supports JPEG, PNG, PDF up to 10MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleChange}
          />

          {!file && (
            <div className="flex items-start gap-3 mt-6 bg-cyan-50 rounded-xl p-4">
              <TriangleAlert
                size={16}
                className="text-cyan-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-gray-500 text-xs leading-relaxed">
                Your document is encrypted and stored securely. It is only used
                to verify your vehicle details.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}

          {/* Verify UI */}
          {file && !extracted && (
            <div className="mt-2">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Upload & Extract
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Click extract to read your Carte Grise and pre-fill the
                  details.
                </p>
                <div className="mt-3 text-xs text-gray-400">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-cyan-600 hover:text-cyan-700"
                    disabled={loading}
                  >
                    Change document
                  </button>
                  <span className="mx-2">•</span>
                  <span className="text-gray-400">{file.name}</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Extracting details...
                </div>
              ) : (
                <button
                  onClick={() => void handleUpload()}
                  className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm py-3 rounded-xl transition-colors"
                >
                  Extract Details
                </button>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setFields(EMPTY_FIELDS);
                    setError(null);
                    setExtracted(false);
                  }}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm"
                  disabled={loading}
                >
                  Re-upload
                </button>
              </div>
            </div>
          )}

          {file && extracted && (
            <div className="mt-2">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Verify Details
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Please review the extracted information. Fields highlighted in
                  orange need your attention.
                </p>
                <div className="mt-3 text-xs text-gray-400">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-cyan-600 hover:text-cyan-700"
                    disabled={loading}
                  >
                    Change document
                  </button>
                  <span className="mx-2">•</span>
                  <span className="text-gray-400">{file.name}</span>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Loader2 size={16} className="animate-spin" />
                  Extracting details...
                </div>
              )}

              {/* License Plate */}
              {(["licensePlate", "vin", "fullName"] as const).map((k) => {
                const match = computeMatch(k, fields[k]);
                const needsReview = match.variant !== "ok";
                return (
                  <div key={k} className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400">
                        {labelFor(k)}
                      </label>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium
                          ${
                            match.variant === "ok"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                      >
                        {match.variant === "ok" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <TriangleAlert size={12} />
                        )}
                        {match.percent}% Match
                      </span>
                    </div>
                    <input
                      type="text"
                      value={fields[k]}
                      onChange={(e) =>
                        setFields((prev) => ({ ...prev, [k]: e.target.value }))
                      }
                      className={`w-full rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none
                        ${
                          needsReview
                            ? "border border-amber-300 bg-amber-50/40 focus:border-amber-400"
                            : "border border-gray-100 bg-gray-50 focus:border-cyan-400"
                        }`}
                    />
                    {needsReview && (
                      <p className="text-[11px] text-amber-700 mt-2">
                        Please verify this field manually.
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="grid grid-cols-2 gap-4 mt-2">
                {(["make", "model"] as const).map((k) => {
                  const match = computeMatch(k, fields[k]);
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">
                          {labelFor(k)}
                        </label>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={12} />
                          {match.percent}% Match
                        </span>
                      </div>
                      <input
                        type="text"
                        value={fields[k]}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [k]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none border border-gray-100 bg-gray-50 focus:border-cyan-400"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {(["year", "fuelType"] as const).map((k) => {
                  const match = computeMatch(k, fields[k]);
                  const needsReview = match.variant !== "ok";
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">
                          {labelFor(k)}
                        </label>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium
                            ${
                              match.variant === "ok"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {match.variant === "ok" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <TriangleAlert size={12} />
                          )}
                          {match.percent}% Match
                        </span>
                      </div>
                      <input
                        type="text"
                        value={fields[k]}
                        onChange={(e) =>
                          setFields((prev) => ({
                            ...prev,
                            [k]: e.target.value,
                          }))
                        }
                        className={`w-full rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none
                          ${
                            needsReview
                              ? "border border-amber-300 bg-amber-50/40 focus:border-amber-400"
                              : "border border-gray-100 bg-gray-50 focus:border-cyan-400"
                          }`}
                      />
                      {needsReview && (
                        <p className="text-[11px] text-amber-700 mt-2">
                          Please verify this field manually.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    setFile(null);
                    setFields(EMPTY_FIELDS);
                    setError(null);
                    setExtracted(false);
                  }}
                  className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm"
                  disabled={loading}
                >
                  Re-upload
                </button>
                <button
                  onClick={() => void handleUpload()}
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm hover:bg-gray-100"
                  disabled={loading}
                >
                  Re-extract
                </button>
              </div>

              <button
                onClick={handleSave}
                className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-xl text-sm font-medium"
                disabled={loading || saving}
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Vehicle"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddVehiclePage;
