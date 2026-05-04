"use client";
import {
  Settings,
  Plus,
  FileText,
  CarFront,
  Search,
  CalendarClock,
  Gauge,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenteredSpinner } from "@/components/ui/centered-spinner";
import {
  getVehiclesApi,
  type VehicleDto,
} from "@/services/vehicles/vehicleApi";

type Vehicle = VehicleDto;
type FuelFilter = "all" | "electric" | "hybrid" | "other";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function getFuelTone(fuelType: string) {
  const normalized = fuelType.toLowerCase();
  if (normalized.includes("electric") || normalized.includes("electrique")) {
    return "bg-cyan-100 text-cyan-700 border-cyan-200";
  }
  if (normalized.includes("hybrid") || normalized.includes("hybride")) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

const VehicleCard = ({ vehicle }: { vehicle: Vehicle }) => {
  const router = useRouter();
  const meta = useMemo(() => {
    return {
      added: formatDate(vehicle.createdAt),
    };
  }, [vehicle.createdAt]);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/vehicles/${vehicle._id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/vehicles/${vehicle._id}`);
        }
      }}
      className="group bg-white rounded-3xl border border-slate-200 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="relative h-40 overflow-hidden bg-linear-to-br from-slate-100 via-white to-cyan-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.12),transparent_45%)]" />
        <div className="absolute top-3 left-3 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700">
          {vehicle.licensePlate}
        </div>
        <div className="absolute right-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 bg-white/90 border-slate-200">
          {vehicle.year}
        </div>
        <div className="h-full flex items-center justify-center">
          <div className="text-slate-300 text-5xl transition-transform group-hover:scale-105">
            🚗
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-800 leading-tight">
            {vehicle.fullName}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vehicles/${vehicle._id}`);
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="mb-4">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getFuelTone(
              vehicle.fuelType,
            )}`}
          >
            {vehicle.fuelType}
          </span>
        </div>

        <div className="rounded-2xl bg-slate-100 px-3 py-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={13} />
              Added
            </span>
            <span className="font-medium text-slate-700">{meta.added}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-3/4 rounded-full bg-cyan-400" />
          </div>
        </div>
      </div>
    </article>
  );
};

const AddVehicleCard = () => {
  const router = useRouter();

  return (
    <article
      onClick={() => router.push("/addVehicle")}
      className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-8 py-10 cursor-pointer transition-all hover:border-cyan-300 hover:bg-cyan-50/30"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100">
        <Plus size={22} className="text-cyan-600" />
      </div>
      <h3 className="text-center text-base font-semibold text-slate-700 mb-2">
        Add New Vehicle
      </h3>
      <p className="text-center text-sm leading-relaxed text-slate-500">
        Upload your vehicle registration document to auto-fill details via OCR.
      </p>
    </article>
  );
};

const Page = () => {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await getVehiclesApi();
        if (!alive) return;
        setVehicles(data);
      } catch (err: unknown) {
        if (!alive) return;
        const message =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { data?: { error?: unknown } } }).response
            ?.data?.error === "string"
            ? ((err as { response?: { data?: { error?: string } } }).response
                ?.data?.error ?? "Failed to load vehicles")
            : "Failed to load vehicles";
        setError(message);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        query.length === 0 ||
        vehicle.fullName.toLowerCase().includes(query) ||
        vehicle.licensePlate.toLowerCase().includes(query) ||
        vehicle.make.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query);

      const fuel = vehicle.fuelType.toLowerCase();
      const matchesFuel =
        fuelFilter === "all" ||
        (fuelFilter === "electric" &&
          (fuel.includes("electric") || fuel.includes("electrique"))) ||
        (fuelFilter === "hybrid" &&
          (fuel.includes("hybrid") || fuel.includes("hybride"))) ||
        (fuelFilter === "other" &&
          !fuel.includes("electric") &&
          !fuel.includes("electrique") &&
          !fuel.includes("hybrid") &&
          !fuel.includes("hybride"));

      return matchesSearch && matchesFuel;
    });
  }, [fuelFilter, search, vehicles]);

  const stats = useMemo(() => {
    const electric = vehicles.filter((v) => {
      const fuel = v.fuelType.toLowerCase();
      return fuel.includes("electric") || fuel.includes("electrique");
    }).length;

    const hybrid = vehicles.filter((v) => {
      const fuel = v.fuelType.toLowerCase();
      return fuel.includes("hybrid") || fuel.includes("hybride");
    }).length;

    return {
      total: vehicles.length,
      electric,
      hybrid,
    };
  }, [vehicles]);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <CenteredSpinner
            label="Loading vehicles..."
            className="min-h-[70vh]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-cyan-200/70 bg-linear-to-r from-cyan-50 via-white to-cyan-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                Fleet
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-800 sm:text-4xl">
                My Garage
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Manage your vehicles, browse details, and keep your charging
                profile updated.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center sm:min-w-90">
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Electric</p>
                <p className="mt-1 text-xl font-bold text-cyan-700">
                  {stats.electric}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs text-slate-500">Hybrid</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {stats.hybrid}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, plate, make or model"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 text-sm text-slate-500">
              <Filter size={14} />
              Fuel
            </span>
            <button
              type="button"
              onClick={() => setFuelFilter("all")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                fuelFilter === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFuelFilter("electric")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                fuelFilter === "electric"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Electric
            </button>
            <button
              type="button"
              onClick={() => setFuelFilter("hybrid")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                fuelFilter === "hybrid"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Hybrid
            </button>
            <button
              type="button"
              onClick={() => setFuelFilter("other")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                fuelFilter === "other"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Other
            </button>
          </div>
        </div>

        <button
          onClick={() => router.push("/addVehicle")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
        >
          <Plus size={16} />
          Add Vehicle
        </button>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <CarFront size={22} />
              </div>
              <p className="text-xl font-semibold text-slate-700">
                {vehicles.length === 0 ? "No vehicles yet" : "No results"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {vehicles.length === 0
                  ? "Add your first vehicle to start booking charging sessions."
                  : "Try changing search or fuel filter."}
              </p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))
          )}

          <AddVehicleCard />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Activity
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
              <CalendarClock size={14} className="text-cyan-600" />
              Vehicle updates synced
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Health
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
              <Gauge size={14} className="text-cyan-600" />
              Profiles ready for booking
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Quick Tip
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Keep plate and VIN updated for faster station check-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
