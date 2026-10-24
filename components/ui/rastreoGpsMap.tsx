"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  LocateFixed,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Signal,
  SignalLow,
  Truck,
  X,
} from "lucide-react";
import mapboxgl from "mapbox-gl";

const MAPBOX_WARM_STYLE =
  "mapbox://styles/mapbox-map-design/cmclxpx6g007101s2d4kq4ivs";
const REFRESH_INTERVAL_MS = 30_000;
const SIGNAL_FRESH_MS = 10 * 60 * 1000;

type GpsUnit = {
  id: number;
  name: string;
  plate: string;
  driver: string | null;
  longitude: number;
  latitude: number;
  speed: number;
  direction: number;
  timestamp: number | null;
};

type RastreoGpsMapProps = {
  onClose: () => void;
};

type StatusFilter = "all" | "moving" | "stale";

function getSignalStatus(timestamp: number | null, now: number) {
  if (!timestamp) return "stale";
  const age = now - timestamp * 1000;
  return age <= SIGNAL_FRESH_MS ? "active" : "stale";
}

function getAgeLabel(timestamp: number | null, now: number) {
  if (!timestamp) return "Sin fecha de actualización";
  const minutes = Math.max(0, Math.floor((now - timestamp * 1000) / 60_000));

  if (minutes < 1) return "Actualizado hace un momento";
  if (minutes < 60) return `Actualizado hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Actualizado hace ${hours} h`;

  return new Date(timestamp * 1000).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCoordinates(unit: GpsUnit) {
  return `${unit.latitude.toFixed(4)}, ${unit.longitude.toFixed(4)}`;
}

export default function RastreoGpsMap({ onClose }: RastreoGpsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const hasFitInitialBoundsRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [units, setUnits] = useState<GpsUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  const filteredUnits = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");

    return units.filter((unit) => {
      const matchesQuery =
        !normalizedQuery ||
        [unit.driver, unit.plate, unit.name]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("es-CO").includes(normalizedQuery));
      const status = getSignalStatus(unit.timestamp, now);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "moving" && unit.speed > 2) ||
        (statusFilter === "stale" && status === "stale");

      return matchesQuery && matchesStatus;
    });
  }, [now, query, statusFilter, units]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [selectedUnitId, units],
  );

  const activeCount = useMemo(
    () => units.filter((unit) => getSignalStatus(unit.timestamp, now) === "active").length,
    [now, units],
  );
  const movingCount = useMemo(
    () => units.filter((unit) => unit.speed > 2).length,
    [units],
  );

  const refreshUnits = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await fetch("/api/rastreo-gps", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "No se pudo cargar el rastreo GPS.");
      }

      setUnits(Array.isArray(payload.units) ? payload.units : []);
      setUpdatedAt(payload.updatedAt || null);
      setApiError(null);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el rastreo GPS.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setNow(Date.now());
    }
  }, []);

  const focusUnit = useCallback((unit: GpsUnit) => {
    setSelectedUnitId(unit.id);
    setPanelOpen(true);
    mapRef.current?.flyTo({
      center: [unit.longitude, unit.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      pitch: 0,
      bearing: 0,
      duration: 850,
      essential: true,
    });
  }, []);

  const fitVisibleUnits = useCallback(() => {
    const map = mapRef.current;
    if (!map || !filteredUnits.length) return;

    const bounds = new mapboxgl.LngLatBounds();
    filteredUnits.forEach((unit) => bounds.extend([unit.longitude, unit.latitude]));

    map.fitBounds(bounds, {
      padding: {
        top: 72,
        right: 72,
        bottom:
          panelOpen && window.innerWidth < 768
            ? window.innerHeight * 0.44
            : 72,
        left: panelOpen && window.innerWidth >= 768 ? 420 : 72,
      },
      maxZoom: 13,
      duration: 850,
    });
  }, [filteredUnits, panelOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    void refreshUnits(true);
    const refreshId = window.setInterval(
      () => void refreshUnits(false),
      REFRESH_INTERVAL_MS,
    );
    const clockId = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => {
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, [refreshUnits]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!accessToken) {
      setMapError("Configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para mostrar el mapa.");
      return;
    }

    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_WARM_STYLE,
      center: [-72.395, 5.3377],
      zoom: 7,
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      config: { basemap: { show3dObjects: false } },
    });

    mapRef.current = map;
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    map.on("load", () => setMapReady(true));
    map.on("style.load", () => {
      try {
        map.setConfigProperty("basemap", "show3dObjects", false);
      } catch {
        // The gallery style already has a flat presentation when this option is unavailable.
      }
    });
    map.on("error", () => {
      setMapError("No se pudo cargar el mapa de Mapbox.");
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !units.length || hasFitInitialBoundsRef.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    units.forEach((unit) => bounds.extend([unit.longitude, unit.latitude]));
    map.fitBounds(bounds, {
      padding: {
        top: 72,
        right: 72,
        bottom: window.innerWidth < 768 ? window.innerHeight * 0.44 : 72,
        left: window.innerWidth >= 768 ? 420 : 72,
      },
      maxZoom: 11,
      duration: 900,
    });
    hasFitInitialBoundsRef.current = true;
  }, [mapReady, units]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    filteredUnits.forEach((unit) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "rastreo-gps-marker";
      element.setAttribute(
        "aria-label",
        `${unit.plate || unit.name}${unit.driver ? `, ${unit.driver}` : ""}`,
      );
      if (getSignalStatus(unit.timestamp, now) === "stale") {
        element.classList.add("is-stale");
      }
      if (unit.id === selectedUnitId) element.classList.add("is-selected");

      const dot = document.createElement("span");
      dot.className = "rastreo-gps-marker__dot";
      const label = document.createElement("span");
      label.className = "rastreo-gps-marker__label";
      label.textContent = unit.plate || unit.name;
      element.append(dot, label);
      element.addEventListener("click", () => focusUnit(unit));

      const marker = new mapboxgl.Marker({ element, anchor: "bottom" })
        .setLngLat([unit.longitude, unit.latitude])
        .addTo(map);
      markersRef.current.set(unit.id, marker);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
    };
  }, [filteredUnits, focusUnit, mapReady, now, selectedUnitId]);

  const renderUnit = (unit: GpsUnit) => {
    const signalStatus = getSignalStatus(unit.timestamp, now);
    const selected = unit.id === selectedUnitId;

    return (
      <button
        key={unit.id}
        className={`group w-full rounded-2xl border p-3 text-left transition-colors ${
          selected
            ? "border-emerald-700 bg-emerald-50/80 shadow-sm"
            : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50"
        }`}
        onClick={() => focusUnit(unit)}
        type="button"
      >
        <span className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3e9df] text-[#86542f]">
            <Truck className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-stone-900">
                  {unit.driver || unit.plate || unit.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-stone-500">
                  {unit.plate && unit.driver ? unit.plate : unit.name}
                </span>
              </span>
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  signalStatus === "active" ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Signal className="h-3.5 w-3.5" />
                {unit.speed} km/h
              </span>
              <span className="truncate">{getAgeLabel(unit.timestamp, now)}</span>
            </span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] h-[100dvh] w-screen overflow-hidden bg-[#e9e3dc] text-stone-900">
      <div ref={mapContainerRef} className="absolute inset-0" aria-label="Mapa 2D de rastreo GPS" />

      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f1ece6]/90 p-6 text-center">
          <div className="max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-700" />
            <p className="font-semibold">Mapa no disponible</p>
            <p className="mt-2 text-sm text-stone-600">{mapError}</p>
          </div>
        </div>
      )}

      {!panelOpen && (
        <button
          aria-label="Abrir panel de unidades"
          className="absolute left-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-lg transition hover:bg-stone-50"
          onClick={() => setPanelOpen(true)}
          type="button"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      <aside
        className={`absolute left-4 top-4 bottom-4 z-20 flex w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/70 bg-[#fffdfa]/95 shadow-[0_24px_80px_-32px_rgba(40,28,18,0.45)] backdrop-blur-xl transition-transform duration-300 max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0 max-md:h-[42dvh] max-md:w-full max-md:rounded-b-none max-md:rounded-t-[24px] max-md:border-x-0 max-md:border-b-0 ${
          panelOpen ? "translate-x-0 max-md:translate-y-0" : "-translate-x-[110%] max-md:translate-x-0 max-md:translate-y-full"
        }`}
      >
        <div className="border-b border-stone-200/80 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3e9df] text-[#86542f]">
                  <MapPinned className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    Conductores
                  </p>
                  <h1 className="text-lg font-semibold leading-tight text-stone-950">
                    Rastro GPS
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Ocultar panel"
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 md:flex"
                onClick={() => setPanelOpen(false)}
                type="button"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
              <button
                aria-label="Cerrar rastreo GPS"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {activeCount} con señal
            </div>
            <span className="text-xs text-stone-500">
              {movingCount} en movimiento
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 focus-within:border-emerald-700">
              <Search className="h-4 w-4 shrink-0 text-stone-400" />
              <input
                className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar conductor o placa"
                value={query}
              />
            </label>
            <button
              aria-label="Actualizar posiciones"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-60"
              disabled={refreshing}
              onClick={() => void refreshUnits(false)}
              title="Actualizar posiciones"
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1 rounded-xl bg-stone-100 p-1">
            {([
              ["all", "Todos"],
              ["moving", "En movimiento"],
              ["stale", "Sin señal"],
            ] as [StatusFilter, string][]).map(([filter, label]) => (
              <button
                key={filter}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  statusFilter === filter
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                onClick={() => setStatusFilter(filter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {apiError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Unidades GPS
            </p>
            <span className="text-xs text-stone-500">{filteredUnits.length}</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[76px] animate-pulse rounded-2xl border border-stone-200 bg-stone-100"
                />
              ))}
            </div>
          ) : filteredUnits.length ? (
            <div className="space-y-2">{filteredUnits.map(renderUnit)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 px-4 py-8 text-center">
              <SignalLow className="mx-auto mb-2 h-6 w-6 text-stone-400" />
              <p className="text-sm font-medium text-stone-800">
                {units.length ? "No hay unidades con este filtro" : "No hay posiciones GPS disponibles"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                {units.length
                  ? "Ajusta la búsqueda o cambia el filtro para ver otras unidades."
                  : "Las unidades aparecerán cuando Wialon reporte una posición válida."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-stone-200/80 px-4 py-3 text-[11px] text-stone-500">
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            {updatedAt
              ? `Actualizado ${new Date(updatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
              : "Esperando posiciones"}
          </span>
          <button
            className="flex shrink-0 items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950"
            onClick={fitVisibleUnits}
            type="button"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Ajustar mapa
          </button>
        </div>
      </aside>

      {selectedUnit && !panelOpen && (
        <div className="absolute bottom-5 left-5 z-20 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-xl max-md:bottom-[44dvh] max-md:left-3 max-md:right-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3e9df] text-[#86542f]">
              <Truck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {selectedUnit.driver || selectedUnit.plate || selectedUnit.name}
              </p>
              <p className="truncate text-xs text-stone-500">
                {selectedUnit.plate || selectedUnit.name} · {selectedUnit.speed} km/h · {formatCoordinates(selectedUnit)}
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-stone-400" />
          </div>
        </div>
      )}

      {!mapError && !mapReady && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-stone-600 shadow-md backdrop-blur">
          Cargando mapa 2D…
        </div>
      )}
      {!mapError && !apiError && units.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 hidden items-center gap-3 rounded-full bg-white/90 px-3 py-2 text-[11px] text-stone-600 shadow-md backdrop-blur sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Con señal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-stone-400" />
            Sin señal reciente
          </span>
          <span className="flex items-center gap-1.5 border-l border-stone-200 pl-3">
            <Signal className="h-3.5 w-3.5 text-stone-500" />
            Se actualiza cada 30 s
          </span>
        </div>
      )}
    </div>
  );
}
