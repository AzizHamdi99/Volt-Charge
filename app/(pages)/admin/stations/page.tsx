"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type StationPayload,
  type StationDto,
  createStationApi,
  deleteStationApi,
  getStationsApi,
  updateStationApi,
} from "@/services/stations/stationApi";
import {
  type ConnectorStatus,
  type ConnectorDto,
  createConnectorApi,
  deleteConnectorApi,
  getConnectorsApi,
  updateConnectorApi,
} from "@/services/connectors/connectorApi";
import { CenteredSpinner } from "@/components/ui/centered-spinner";

type StationFormState = {
  name: string;
  address: string;
  lat: string;
  lng: string;
  status: "available" | "partial" | "full" | "offline";
  distance: string;
  rate: string;
  rating: string;
  reviews: string;
};

type ConnectorFormState = {
  type: string;
  speed: string;
  status: ConnectorStatus;
};

const emptyStationForm: StationFormState = {
  name: "",
  address: "",
  lat: "",
  lng: "",
  status: "available",
  distance: "",
  rate: "",
  rating: "",
  reviews: "",
};

const emptyConnectorForm: ConnectorFormState = {
  type: "CCS",
  speed: "",
  status: "available",
};

function toStationPayload(form: StationFormState): StationPayload {
  return {
    name: form.name.trim(),
    address: form.address.trim(),
    lat: Number(form.lat),
    lng: Number(form.lng),
    status: form.status,
    distance: form.distance.trim(),
    rate: Number(form.rate),
    rating: Number(form.rating),
    reviews: Number(form.reviews),
    connectorIds: [],
  };
}

export default function AdminStationsPage() {
  const [loading, setLoading] = useState(true);
  const [savingStation, setSavingStation] = useState(false);
  const [savingConnector, setSavingConnector] = useState(false);

  const [stations, setStations] = useState<StationDto[]>([]);
  const [connectors, setConnectors] = useState<ConnectorDto[]>([]);

  const [stationForm, setStationForm] =
    useState<StationFormState>(emptyStationForm);
  const [connectorForm, setConnectorForm] =
    useState<ConnectorFormState>(emptyConnectorForm);

  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>(
    [],
  );

  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [editingConnectorId, setEditingConnectorId] = useState<string | null>(
    null,
  );

  const [stationError, setStationError] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const [showStationForm, setShowStationForm] = useState(false);

  const totalConnectors = useMemo(() => connectors.length, [connectors.length]);
  const availableConnectors = useMemo(
    () => connectors.filter((item) => item.status === "available").length,
    [connectors],
  );

  const resetStationForm = () => {
    setStationForm(emptyStationForm);
    setSelectedConnectorIds([]);
    setEditingStationId(null);
    setStationError(null);
  };

  const closeStationDialog = () => {
    setShowStationForm(false);
    resetStationForm();
  };

  const resetConnectorForm = () => {
    setConnectorForm(emptyConnectorForm);
    setEditingConnectorId(null);
    setConnectorError(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [stationsRes, connectorsRes] = await Promise.all([
        getStationsApi(),
        getConnectorsApi(),
      ]);
      setStations(stationsRes);
      setConnectors(connectorsRes);
    } catch (error) {
      console.error(error);
      setStationError("Failed to load stations.");
      setConnectorError("Failed to load connectors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onSaveStation = async () => {
    setStationError(null);

    if (!stationForm.name.trim() || !stationForm.address.trim()) {
      setStationError("Name and address are required.");
      return;
    }

    const lat = Number(stationForm.lat);
    const lng = Number(stationForm.lng);
    const rate = Number(stationForm.rate);
    const rating = Number(stationForm.rating);
    const reviews = Number(stationForm.reviews);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setStationError("Latitude and longitude must be valid numbers.");
      return;
    }
    if (!stationForm.distance.trim()) {
      setStationError("Distance is required.");
      return;
    }
    if (
      !Number.isFinite(rate) ||
      !Number.isFinite(rating) ||
      !Number.isFinite(reviews)
    ) {
      setStationError("Rate, rating and reviews must be valid numbers.");
      return;
    }

    setSavingStation(true);
    try {
      const payload = {
        ...toStationPayload(stationForm),
        connectorIds: selectedConnectorIds,
      };

      if (editingStationId) {
        await updateStationApi(editingStationId, payload);
      } else {
        await createStationApi(payload);
      }

      closeStationDialog();
      await loadData();
    } catch (error) {
      console.error(error);
      setStationError("Failed to save station.");
    } finally {
      setSavingStation(false);
    }
  };

  const onEditStation = (station: StationDto) => {
    setEditingStationId(station._id);
    setStationError(null);
    setStationForm({
      name: station.name,
      address: station.address,
      lat: String(station.lat),
      lng: String(station.lng),
      status: station.status,
      distance: station.distance,
      rate: String(station.rate),
      rating:
        typeof station.rating === "number" && Number.isFinite(station.rating)
          ? String(station.rating)
          : "",
      reviews:
        typeof station.reviews === "number" && Number.isFinite(station.reviews)
          ? String(station.reviews)
          : "",
    });

    setSelectedConnectorIds(
      station.connectors.map((connector) => connector._id).filter(Boolean),
    );
    setShowStationForm(true);
  };

  const onDeleteStation = async (stationId: string) => {
    const confirmed = window.confirm("Delete this station?");
    if (!confirmed) return;

    try {
      await deleteStationApi(stationId);
      await loadData();
    } catch (error) {
      console.error(error);
      setStationError("Failed to delete station.");
    }
  };

  const onSaveConnector = async () => {
    setConnectorError(null);

    if (!connectorForm.type.trim() || !connectorForm.speed.trim()) {
      setConnectorError("Connector type and speed are required.");
      return;
    }

    setSavingConnector(true);
    try {
      if (editingConnectorId) {
        await updateConnectorApi(editingConnectorId, connectorForm);
      } else {
        await createConnectorApi(connectorForm);
      }

      resetConnectorForm();
      await loadData();
    } catch (error) {
      console.error(error);
      setConnectorError("Failed to save connector.");
    } finally {
      setSavingConnector(false);
    }
  };

  const onEditConnector = (connector: ConnectorDto) => {
    setEditingConnectorId(connector._id);
    setConnectorError(null);
    setConnectorForm({
      type: connector.type,
      speed: connector.speed,
      status: connector.status,
    });
  };

  const onDeleteConnector = async (connectorId: string) => {
    const confirmed = window.confirm("Delete this connector?");
    if (!confirmed) return;

    try {
      await deleteConnectorApi(connectorId);
      await loadData();
    } catch (error) {
      console.error(error);
      setConnectorError("Failed to delete connector.");
    }
  };

  if (loading) {
    return (
      <CenteredSpinner
        label="Loading stations and connectors..."
        className="min-h-[70vh]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-600">
          Admin panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Stations Management
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Create charging stations, attach connectors, and keep your map data in
          sync.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Stations</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {stations.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Connectors</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {totalConnectors}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Available Connectors</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {availableConnectors}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs text-slate-500">Busy / Down</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {Math.max(totalConnectors - availableConnectors, 0)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Button
            onClick={() => {
              resetStationForm();
              setShowStationForm(true);
            }}
          >
            Add Station
          </Button>
        </div>
      </div>

      <Dialog
        open={showStationForm}
        onOpenChange={(open) => {
          setShowStationForm(open);
          if (!open) resetStationForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStationId ? "Edit Station" : "Create Station"}
            </DialogTitle>
            <DialogDescription>
              Fill in station details and attach any existing connectors.
            </DialogDescription>
          </DialogHeader>

          {stationError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {stationError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="station-name">Station Name</Label>
              <Input
                id="station-name"
                value={stationForm.name}
                onChange={(e) =>
                  setStationForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="BYD Fast Charge Center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-address">Address</Label>
              <Input
                id="station-address"
                value={stationForm.address}
                onChange={(e) =>
                  setStationForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Avenue Mohammed V, Casablanca"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-lat">Latitude</Label>
              <Input
                id="station-lat"
                value={stationForm.lat}
                onChange={(e) =>
                  setStationForm((prev) => ({ ...prev, lat: e.target.value }))
                }
                placeholder="33.5731"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-lng">Longitude</Label>
              <Input
                id="station-lng"
                value={stationForm.lng}
                onChange={(e) =>
                  setStationForm((prev) => ({ ...prev, lng: e.target.value }))
                }
                placeholder="-7.5898"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={stationForm.status}
                onValueChange={(value: StationFormState["status"]) =>
                  setStationForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">available</SelectItem>
                  <SelectItem value="partial">partial</SelectItem>
                  <SelectItem value="full">full</SelectItem>
                  <SelectItem value="offline">offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-distance">Distance</Label>
              <Input
                id="station-distance"
                value={stationForm.distance}
                onChange={(e) =>
                  setStationForm((prev) => ({
                    ...prev,
                    distance: e.target.value,
                  }))
                }
                placeholder="2.4 km"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-rate">Rate</Label>
              <Input
                id="station-rate"
                value={stationForm.rate}
                onChange={(e) =>
                  setStationForm((prev) => ({ ...prev, rate: e.target.value }))
                }
                placeholder="120 kW"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-rating">Rating</Label>
              <Input
                id="station-rating"
                value={stationForm.rating}
                onChange={(e) =>
                  setStationForm((prev) => ({
                    ...prev,
                    rating: e.target.value,
                  }))
                }
                placeholder="4.8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-reviews">Reviews</Label>
              <Input
                id="station-reviews"
                value={stationForm.reviews}
                onChange={(e) =>
                  setStationForm((prev) => ({
                    ...prev,
                    reviews: e.target.value,
                  }))
                }
                placeholder="124"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">
              Attach Connectors
            </p>
            {connectors.length === 0 ? (
              <p className="text-sm text-slate-500">
                No connectors yet. Create one first from the section below.
              </p>
            ) : (
              <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3 md:grid-cols-2">
                {connectors.map((connector) => {
                  const checked = selectedConnectorIds.includes(connector._id);
                  return (
                    <label
                      key={connector._id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setSelectedConnectorIds((prev) =>
                            on
                              ? [...prev, connector._id]
                              : prev.filter((id) => id !== connector._id),
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                      />
                      <span>
                        {connector.type} - {connector.speed} ({connector.status}
                        )
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeStationDialog}
              disabled={savingStation}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void onSaveStation()}
              disabled={savingStation}
            >
              {savingStation
                ? "Saving..."
                : editingStationId
                  ? "Update Station"
                  : "Create Station"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          Connector Library
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Connectors created here can be attached to any station.
        </p>

        {connectorError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {connectorError}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="connector-type">Type</Label>
            <Input
              id="connector-type"
              value={connectorForm.type}
              onChange={(e) =>
                setConnectorForm((prev) => ({ ...prev, type: e.target.value }))
              }
              placeholder="CCS"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="connector-speed">Speed</Label>
            <Input
              id="connector-speed"
              value={connectorForm.speed}
              onChange={(e) =>
                setConnectorForm((prev) => ({ ...prev, speed: e.target.value }))
              }
              placeholder="150 kW"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label>Status</Label>
            <Select
              value={connectorForm.status}
              onValueChange={(value: ConnectorStatus) =>
                setConnectorForm((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select connector status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">available</SelectItem>
                <SelectItem value="occupied">occupied</SelectItem>
                <SelectItem value="fault">fault</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-2">
            <Button
              className="w-full"
              onClick={() => void onSaveConnector()}
              disabled={savingConnector}
            >
              {savingConnector
                ? "Saving..."
                : editingConnectorId
                  ? "Update"
                  : "Create"}
            </Button>
            {editingConnectorId ? (
              <Button
                variant="outline"
                onClick={resetConnectorForm}
                disabled={savingConnector}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>

        {connectors.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No connectors yet.</p>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {connectors.map((connector) => (
              <div
                key={connector._id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
              >
                <p className="text-sm font-medium text-slate-900">
                  {connector.type} - {connector.speed}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Status: {connector.status}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditConnector(connector)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDeleteConnector(connector._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">All Stations</h3>

        {stations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No stations yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {stations.map((station) => (
              <div
                key={station._id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {station.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{station.address}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {station.availableCount}/{station.totalCount} connectors
                  available
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {station.lat}, {station.lng}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStation(station)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void onDeleteStation(station._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
