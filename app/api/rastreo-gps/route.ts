import { NextRequest, NextResponse } from "next/server";

const WIALON_ENDPOINT = "https://hst-api.wialon.com/wialon/ajax.html";
const EXPIRED_SESSION_ERRORS = new Set([1, 4, 8]);

let cachedWialonSid: string | null = null;
let wialonLoginPromise: Promise<string> | null = null;

type BackendService = {
  vehiculo?: { placa?: string | null } | null;
  conductor?: { nombre?: string | null; apellido?: string | null } | null;
};

type WialonUnit = {
  id: number;
  nm: string;
  pos?: {
    x?: number;
    y?: number;
    s?: number;
    c?: number;
    t?: number;
  } | null;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function normalizePlate(value: string | null | undefined) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function validateAccess(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = request.cookies.get("token")?.value || bearer;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;

  if (!token || !apiBaseUrl) {
    return { ok: false as const, status: 401, message: "Inicia sesión para consultar el rastreo GPS." };
  }

  try {
    const response = await fetch(new URL("/api/usuarios/perfil", apiBaseUrl), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false as const, status: response.status === 403 ? 403 : 401, message: "Tu sesión no permite consultar el rastreo GPS." };
    }

    const payload = await response.json();
    const user = payload?.data;
    const permissions = user?.permisos || {};
    const canTrack =
      user?.role === "admin" ||
      user?.role === "gestor_flota" ||
      permissions.admin === true ||
      permissions.flota === true;

    if (!canTrack) {
      return { ok: false as const, status: 403, message: "No tienes permisos para consultar el rastreo GPS." };
    }

    return { ok: true as const, token, apiBaseUrl };
  } catch {
    return { ok: false as const, status: 503, message: "No se pudo validar la sesión con el servidor." };
  }
}

async function loginToWialon() {
  if (wialonLoginPromise) return wialonLoginPromise;

  wialonLoginPromise = (async () => {
    const token = process.env.WIALON_TOKEN;

    if (!token) {
      throw new Error("WIALON_TOKEN is not configured");
    }

    const response = await fetch(WIALON_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        svc: "token/login",
        params: JSON.stringify({ token }),
      }),
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok || !payload?.eid || payload?.error) {
      throw new Error("Wialon login failed");
    }

    cachedWialonSid = payload.eid;
    return payload.eid as string;
  })();

  try {
    return await wialonLoginPromise;
  } finally {
    wialonLoginPromise = null;
  }
}

async function callWialon(service: string, params: Record<string, unknown>, retry = true) {
  const sid = cachedWialonSid || (await loginToWialon());
  const response = await fetch(WIALON_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      svc: service,
      params: JSON.stringify(params),
      sid,
    }),
    cache: "no-store",
  });
  const payload = await response.json();

  if (EXPIRED_SESSION_ERRORS.has(payload?.error) && retry) {
    cachedWialonSid = null;
    await loginToWialon();
    return callWialon(service, params, false);
  }

  if (!response.ok || payload?.error) {
    throw new Error("Wialon request failed");
  }

  return payload;
}

async function getActiveServices(apiBaseUrl: string, token: string) {
  try {
    const url = new URL("/api/servicios?estado=en_curso&page=1&limit=100", apiBaseUrl);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return [] as BackendService[];
    const payload = await response.json();
    return (Array.isArray(payload?.data) ? payload.data : []) as BackendService[];
  } catch {
    return [] as BackendService[];
  }
}

function extractPlate(unitName: string) {
  const match = unitName.match(/[A-Z]{3}[-\s]?\d{3}/i);
  return match?.[0]?.replace(/\s/g, "-").toUpperCase() || "";
}

export async function GET(request: NextRequest) {
  const access = await validateAccess(request);

  if (!access.ok) {
    return json({ message: access.message }, access.status);
  }

  if (!process.env.WIALON_TOKEN) {
    return json(
      { message: "Configura WIALON_TOKEN en el entorno del módulo de Conductores." },
      503,
    );
  }

  try {
    const [vehiclesData, activeServices] = await Promise.all([
      callWialon("core/search_items", {
        spec: {
          itemsType: "avl_unit",
          propName: "sys_name",
          propValueMask: "*",
          sortType: "sys_name",
        },
        force: 1,
        flags: 1025,
        from: 0,
        to: 1000,
      }),
      getActiveServices(access.apiBaseUrl, access.token),
    ]);

    const servicesByPlate = new Map<string, BackendService>();

    for (const service of activeServices) {
      const plate = normalizePlate(service.vehiculo?.placa);
      if (plate) servicesByPlate.set(plate, service);
    }

    const units = ((vehiclesData?.items || []) as WialonUnit[])
      .filter((unit) => {
        if (unit.pos?.x == null || unit.pos?.y == null) return false;

        const longitude = Number(unit.pos.x);
        const latitude = Number(unit.pos.y);
        return (
          Number.isFinite(longitude) &&
          Number.isFinite(latitude) &&
          longitude >= -180 &&
          longitude <= 180 &&
          latitude >= -90 &&
          latitude <= 90
        );
      })
      .map((unit) => {
        const unitName = String(unit.nm || "Unidad GPS");
        const normalizedName = normalizePlate(unitName);
        const activeService = Array.from(servicesByPlate.entries()).find(([plate]) =>
          normalizedName.includes(plate),
        )?.[1];
        const conductor = activeService?.conductor;
        const nombreConductor = [conductor?.nombre, conductor?.apellido]
          .filter(Boolean)
          .join(" ");

        return {
          id: unit.id,
          name: unitName,
          plate: activeService?.vehiculo?.placa || extractPlate(unitName),
          driver: nombreConductor || null,
          longitude: Number(unit.pos?.x),
          latitude: Number(unit.pos?.y),
          speed: Math.max(0, Math.round(Number(unit.pos?.s) || 0)),
          direction: Number(unit.pos?.c) || 0,
          timestamp: Number(unit.pos?.t) || null,
        };
      });

    return json({ units, updatedAt: new Date().toISOString() });
  } catch {
    return json(
      { message: "No se pudo conectar con el sistema de rastreo GPS." },
      502,
    );
  }
}
