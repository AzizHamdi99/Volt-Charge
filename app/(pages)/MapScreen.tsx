"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Filter, Navigation, Star, X, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { CenteredSpinner } from "@/components/ui/centered-spinner";
import {
  getStationsApi,
  type StationDto,
} from "@/services/stations/stationApi";

const createMarkerIcon = (status: string, count: number) => {
  let color = "#22C55E";
  if (status === "partial") color = "#F59E0B";
  if (status === "full") color = "#EF4444";
  if (status === "offline") color = "#94A3B8";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 28 20 28s20-13 20-28C40 8.95 31.05 0 20 0z" fill="${color}"/>
      <circle cx="20" cy="20" r="14" fill="white"/>
      <text x="20" y="26" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="${color}">${count}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "custom-marker",
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
};

export default function MapScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<StationDto[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationDto | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const stationImageFallback = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#f8fafc"/>
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#g)"/>
        <g fill="#64748b" font-family="Arial, sans-serif" font-size="28" font-weight="700">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">Station</text>
        </g>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const stationImageUrl =
    "https://images.unsplash.com/photo-1593941707882-a5bba14938cb?auto=format&fit=crop&q=80&w=800";
  const [stationImageSrc, setStationImageSrc] = useState(stationImageUrl);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (station) =>
        station.name.toLowerCase().includes(q) ||
        station.address.toLowerCase().includes(q),
    );
  }, [stations, searchQuery]);

  const mapCenter = useMemo<[number, number]>(() => {
    const first = filteredStations[0] ?? stations[0];
    if (first) return [first.lat, first.lng];
    return [36.8065, 10.1815];
  }, [filteredStations, stations]);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const data = await getStationsApi();
        if (!alive) return;
        setStations(data);
      } catch {
        if (!alive) return;
        setStations([]);
      } finally {
        if (!alive) return;
        setLoadingStations(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStation(null);
        setIsFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (selectedStation) {
      setStationImageSrc(stationImageUrl);
    }
  }, [selectedStation]);

  return (
    <div className="relative w-full h-screen flex flex-col md:flex-row">
      <div className="flex-1 relative z-0">
        <MapContainer
          center={mapCenter}
          zoom={12}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {filteredStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createMarkerIcon(station.status, station.availableCount)}
              eventHandlers={{ click: () => setSelectedStation(station) }}
            />
          ))}
        </MapContainer>

        <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 z-[400] flex gap-2">
          <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center px-4 py-3">
            <input
              type="text"
              placeholder="Search destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Filter size={20} />
          </button>
        </div>

        <button className="absolute bottom-6 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border border-slate-200 text-teal-600 hover:bg-slate-50 transition-colors">
          <Navigation size={24} />
        </button>

        {loadingStations && (
          <div className="absolute inset-0 z-[450] bg-white/75 backdrop-blur-[1px]">
            <CenteredSpinner
              label="Loading stations..."
              className="h-full min-h-0"
            />
          </div>
        )}
      </div>

      {selectedStation && (
        <div className="absolute md:relative bottom-0 left-0 right-0 md:w-96 md:h-full bg-white shadow-2xl md:shadow-[-4px_0_24px_rgba(0,0,0,0.05)] z-[500] flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right rounded-t-3xl md:rounded-none border-t md:border-t-0 md:border-l border-slate-200 max-h-[85vh] md:max-h-full">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-2 md:hidden" />

          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold truncate pr-4">
              {selectedStation.name}
            </h2>
            <button
              onClick={() => setSelectedStation(null)}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden relative">
              <img
                src={stationImageSrc}
                alt="Station"
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setStationImageSrc(stationImageFallback)}
              />
              <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <span>{selectedStation.rating}</span>
                <span className="text-slate-500 font-normal">
                  ({selectedStation.reviews})
                </span>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  {selectedStation.address}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
                  <Navigation size={14} />
                </div>{" "}
                <span>{selectedStation.distance} away</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedStation.rate.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 uppercase font-semibold">
                  TND / min
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Connectors</h3>
                <span className="text-sm text-slate-500">
                  {selectedStation.availableCount} of{" "}
                  {selectedStation.totalCount} available
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {selectedStation.connectors.map((connector, idx: number) => (
                  <div
                    key={connector._id ?? idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${connector.status === "available" ? "bg-emerald-500" : connector.status === "occupied" ? "bg-orange-500" : "bg-rose-500"}`}
                      />
                      <div>
                        <p className="font-medium text-sm">{connector.type}</p>
                        <p className="text-xs text-slate-500">
                          {connector.speed}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${connector.status === "available" ? "bg-emerald-100 text-emerald-700" : connector.status === "occupied" ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"}`}
                    >
                      {connector.status.charAt(0).toUpperCase() +
                        connector.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedStation.status === "offline" && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-rose-700">
                  This station is currently out of service for maintenance.
                  Please find an alternative station.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <button
              onClick={() =>
                router.push(`/reservations/new/${selectedStation.id}`)
              }
              disabled={
                selectedStation.status === "offline" ||
                selectedStation.availableCount === 0
              }
              className="w-full py-4 text-base font-semibold rounded-2xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-500 transition-colors"
            >
              {selectedStation.status === "offline"
                ? "Out of Service"
                : selectedStation.availableCount === 0
                  ? "Station Full"
                  : "Reserve a Slot"}
            </button>
          </div>
        </div>
      )}

      {isFilterOpen && (
        <div className="fixed inset-0 z-[600] flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
                  Connector Type
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {["CCS", "CHAdeMO", "Type 2", "Tesla"].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        defaultChecked={type === "CCS" || type === "Type 2"}
                      />
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
                  Charging Speed
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Slow (< 22kW)",
                      desc: "Best for overnight charging",
                    },
                    {
                      label: "Fast (22–100kW)",
                      desc: "1-2 hours for full charge",
                    },
                    {
                      label: "Ultra-fast (> 100kW)",
                      desc: "15-30 mins for 80%",
                    },
                  ].map((speed) => (
                    <label
                      key={speed.label}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                        defaultChecked={speed.label.includes("Fast")}
                      />
                      <div>
                        <p className="text-sm font-medium">{speed.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {speed.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-500">
                  Availability
                </h3>
                <div className="flex gap-3">
                  <button className="flex-1 py-2 px-4 rounded-xl border-2 border-primary bg-primary/10 text-primary font-medium text-sm">
                    Available Now
                  </button>
                  <button className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50">
                    Within 1 hour
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                Reset
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-[2] py-3 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
