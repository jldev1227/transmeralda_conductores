// ✅ COMPONENTE EstadosConductores MEJORADO CON ESTADÍSTICAS EXTERNAS

import React, { useMemo } from "react";

import { EstadoConductor, getEstadoColor } from "@/context/ConductorContext";

const ESTADOS_CONFIG = [
  {
    estado: EstadoConductor.servicio,
    label: "En servicio",
    icono: "🚗",
    descripcion: "Conductores actualmente en ruta",
  },
  {
    estado: EstadoConductor.disponible,
    label: "Disponible",
    icono: "✅",
    descripcion: "Conductores listos para asignar",
  },
  {
    estado: EstadoConductor.descanso,
    label: "En descanso",
    icono: "😴",
    descripcion: "Conductores en periodo de descanso",
  },
  {
    estado: EstadoConductor.vacaciones,
    label: "Vacaciones",
    icono: "🏖️",
    descripcion: "Conductores en vacaciones",
  },
  {
    estado: EstadoConductor.incapacidad,
    label: "En incapacidad",
    icono: "🏥",
    descripcion: "Conductores con incapacidad médica",
  },
  {
    estado: EstadoConductor.desvinculado,
    label: "Desvinculados",
    icono: "❌",
    descripcion: "Conductores desvinculados de la empresa",
  },
] as const;

// ✅ INTERFACE MEJORADA CON ESTADÍSTICAS EXTERNAS
interface EstadosConductoresProps {
  conductores?: any[]; // ✅ Opcional ahora
  onEstadoClick?: (estado: EstadoConductor, cantidad: number) => void;
  showIcons?: boolean;
  showDescriptions?: boolean;
  variant?: "default" | "compact" | "detailed";
  selectedEstados?: Set<string>; // ✅ Cambiar a Set<string>
  allowMultipleSelection?: boolean;
  // ✅ NUEVAS PROPS PARA ESTADÍSTICAS EXTERNAS
  estadisticasExternas?: {
    estadisticas: Array<{ estado: string; cantidad: number }>;
    totalConductores: number;
    totalActivos: number;
  };
  loading?: boolean;
}

export const EstadosConductores: React.FC<EstadosConductoresProps> = ({
  conductores = [],
  onEstadoClick,
  showIcons = true,
  showDescriptions = false,
  variant = "default",
  selectedEstados = new Set(),
  allowMultipleSelection = true,
  estadisticasExternas, // ✅ ESTADÍSTICAS EXTERNAS
  loading = false,
}) => {
  // ✅ USAR ESTADÍSTICAS EXTERNAS SI ESTÁN DISPONIBLES
  const estadisticasEstados = useMemo(() => {
    if (estadisticasExternas) {
      // ✅ USAR ESTADÍSTICAS EXTERNAS
      const conteos = ESTADOS_CONFIG.map(
        ({ estado, label, icono, descripcion }) => {
          const estadisticaExterna = estadisticasExternas.estadisticas.find(
            (est) => est.estado === estado,
          );

          const cantidad = estadisticaExterna ? estadisticaExterna.cantidad : 0;
          const porcentaje =
            estadisticasExternas.totalConductores > 0
              ? (
                  (cantidad / estadisticasExternas.totalConductores) *
                  100
                ).toFixed(1)
              : "0";

          const isSelected = selectedEstados.has(estado);

          return {
            estado,
            label,
            icono,
            descripcion,
            cantidad,
            porcentaje: parseFloat(porcentaje),
            color: getEstadoColor(estado),
            isSelected,
          };
        },
      );

      return {
        conteos,
        totalActivos: estadisticasExternas.totalActivos,
        totalConductores: estadisticasExternas.totalConductores,
      };
    } else {
      // ✅ FALLBACK: USAR CONDUCTORES TRADICIONALES
      const conteos = ESTADOS_CONFIG.map(
        ({ estado, label, icono, descripcion }) => {
          const cantidad = conductores.filter(
            (conductor) => conductor.estado === estado,
          ).length;

          const porcentaje =
            conductores.length > 0
              ? ((cantidad / conductores.length) * 100).toFixed(1)
              : "0";

          const isSelected = selectedEstados.has(estado);

          return {
            estado,
            label,
            icono,
            descripcion,
            cantidad,
            porcentaje: parseFloat(porcentaje),
            color: getEstadoColor(estado),
            isSelected,
          };
        },
      );

      const totalActivos = conteos
        .filter(
          (item) =>
            ![
              EstadoConductor.desvinculado,
              EstadoConductor.incapacidad,
              EstadoConductor.vacaciones,
            ].includes(item.estado),
        )
        .reduce((sum, item) => sum + item.cantidad, 0);

      return { conteos, totalActivos, totalConductores: conductores.length };
    }
  }, [conductores, selectedEstados, estadisticasExternas]);

  const handleEstadoClick = (estado: EstadoConductor, cantidad: number) => {
    if (onEstadoClick && !loading) {
      onEstadoClick(estado, cantidad);
    }
  };

  const renderEstadoCard = (item: (typeof estadisticasEstados.conteos)[0]) => {
    const isClickable = onEstadoClick && !loading;

    const baseClasses = `
      relative overflow-hidden transition-all duration-200 ease-in-out
      ${item.color.bg} ${item.color.border} border rounded-lg p-3
      ${isClickable ? "cursor-pointer transform hover:scale-105 hover:shadow-md" : ""}
      ${item.cantidad === 0 ? "opacity-60 border-dashed" : ""}   
      ${item.isSelected ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg" : ""}
      ${loading ? "animate-pulse" : ""}
    `;

    return (
      <div
        key={item.estado}
        className={baseClasses}
        role="button"
        title={showDescriptions ? item.descripcion : undefined}
        onClick={() => handleEstadoClick(item.estado, item.cantidad)}
      >
        {/* ✅ INDICADOR DE SELECCIÓN */}
        {item.isSelected && !loading && (
          <div className="absolute top-2 right-2 z-20">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  fillRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}

        {/* ✅ INDICADOR DE CARGA */}
        {loading && (
          <div className="absolute top-2 right-2 z-20">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Gradiente de fondo sutil */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${item.color.gradient} opacity-50`}
        />

        {/* Overlay para estados seleccionados */}
        {item.isSelected && (
          <div className="absolute inset-0 bg-blue-500 opacity-10" />
        )}

        {/* Contenido */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            {showIcons && (
              <span aria-label={item.label} className="text-lg" role="img">
                {item.icono}
              </span>
            )}
            <div
              className={`w-2 h-2 rounded-full ${item.color.dot} ${item.isSelected ? "opacity-50" : ""}`}
            />
          </div>

          <div className="space-y-1">
            <p
              className={`font-medium text-sm ${item.color.text} leading-tight ${item.isSelected ? "font-bold" : ""}`}
            >
              {item.label}
              {item.isSelected && allowMultipleSelection && (
                <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">
                  ✓
                </span>
              )}
            </p>

            <div className="flex items-center justify-between">
              <span className={`font-bold text-lg ${item.color.text}`}>
                {loading ? "..." : item.cantidad}
              </span>

              {variant === "detailed" &&
                estadisticasEstados.totalConductores > 0 && (
                  <span className={`text-xs ${item.color.text} opacity-75`}>
                    {loading ? "..." : `${item.porcentaje}%`}
                  </span>
                )}
            </div>

            {showDescriptions && variant === "detailed" && (
              <p className={`text-xs ${item.color.text} opacity-75 mt-1`}>
                {item.descripcion}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const gridClasses = {
    default: "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4",
    compact: "grid grid-cols-3 md:grid-cols-6 gap-2",
    detailed:
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4",
  };

  return (
    <div className="space-y-4">
      {/* Resumen general */}
      {variant === "detailed" && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : estadisticasEstados.totalConductores}
              </p>
              <p className="text-sm text-gray-600">Total conductores</p>
            </div>
            <div className="w-px h-12 bg-gray-300" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {loading ? "..." : estadisticasEstados.totalActivos}
              </p>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
            {allowMultipleSelection && selectedEstados.size > 0 && (
              <>
                <div className="w-px h-12 bg-gray-300" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedEstados.size}
                  </p>
                  <p className="text-sm text-gray-600">Filtros activos</p>
                </div>
              </>
            )}
          </div>

          {/* ✅ INDICADOR DE ESTADÍSTICAS EXTERNAS */}
          {estadisticasExternas && (
            <div className="text-right">
              <p className="text-xs text-green-600 font-medium">
                📊 Estadísticas en tiempo real
              </p>
              <p className="text-xs text-gray-500">
                Datos actualizados automáticamente
              </p>
            </div>
          )}

          {allowMultipleSelection &&
            selectedEstados.size === 0 &&
            !estadisticasExternas && (
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Haz clic para filtrar por estado
                </p>
                <p className="text-xs text-gray-400">
                  Puedes seleccionar múltiples estados
                </p>
              </div>
            )}
        </div>
      )}

      {/* Grid de estados */}
      <div className={gridClasses[variant]}>
        {estadisticasEstados.conteos.map(renderEstadoCard)}
      </div>

      {/* Ayuda para selección múltiple */}
      {allowMultipleSelection &&
        variant !== "detailed" &&
        selectedEstados.size > 0 && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {selectedEstados.size} estado{selectedEstados.size > 1 ? "s" : ""}{" "}
              seleccionado{selectedEstados.size > 1 ? "s" : ""}
            </p>
          </div>
        )}
    </div>
  );
};
