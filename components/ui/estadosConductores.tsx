import React, { useMemo } from 'react';
import { EstadoConductor, getEstadoColor } from '@/context/ConductorContext';

// ✅ CONFIGURACIÓN MEJORADA DE ESTADOS
const ESTADOS_CONFIG = [
  {
    estado: EstadoConductor.servicio,
    label: "En servicio",
    icono: "🚗",
    descripcion: "Conductores actualmente en ruta"
  },
  {
    estado: EstadoConductor.disponible,
    label: "Disponible",
    icono: "✅",
    descripcion: "Conductores listos para asignar"
  },
  {
    estado: EstadoConductor.descanso,
    label: "En descanso",
    icono: "😴",
    descripcion: "Conductores en periodo de descanso"
  },
  {
    estado: EstadoConductor.vacaciones,
    label: "Vacaciones",
    icono: "🏖️",
    descripcion: "Conductores en vacaciones"
  },
  {
    estado: EstadoConductor.incapacidad,
    label: "En incapacidad",
    icono: "🏥",
    descripcion: "Conductores con incapacidad médica"
  },
  {
    estado: EstadoConductor.desvinculado,
    label: "Desvinculados",
    icono: "❌",
    descripcion: "Conductores desvinculados de la empresa"
  },
] as const;

// ✅ COMPONENTE PRINCIPAL MEJORADO CON SELECCIÓN MÚLTIPLE
interface EstadosConductoresProps {
  conductores: any[]; // Reemplaza con tu tipo de conductor
  onEstadoClick?: (estado: EstadoConductor, cantidad: number) => void;
  showIcons?: boolean;
  showDescriptions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  // ✅ NUEVAS PROPS PARA SELECCIÓN MÚLTIPLE
  selectedEstados?: Set<EstadoConductor>; // Estados actualmente seleccionados
  allowMultipleSelection?: boolean; // Permitir selección múltiple
}

export const EstadosConductores: React.FC<EstadosConductoresProps> = ({
  conductores,
  onEstadoClick,
  showIcons = true,
  showDescriptions = false,
  variant = 'default',
  selectedEstados = new Set(), // ✅ Set vacío por defecto
  allowMultipleSelection = true // ✅ Permitir múltiple selección por defecto
}) => {
  // ✅ MEMOIZAR CÁLCULOS DE CONTEO
  const estadisticasEstados = useMemo(() => {
    const conteos = ESTADOS_CONFIG.map(({ estado, label, icono, descripcion }) => {
      const cantidad = conductores.filter(
        (conductor) => conductor.estado === estado
      ).length;

      const porcentaje = conductores.length > 0
        ? ((cantidad / conductores.length) * 100).toFixed(1)
        : '0';

      const isSelected = selectedEstados.has(estado); // ✅ Verificar si está seleccionado

      return {
        estado,
        label,
        icono,
        descripcion,
        cantidad,
        porcentaje: parseFloat(porcentaje),
        color: getEstadoColor(estado),
        isSelected // ✅ Agregar estado de selección
      };
    });

    const totalActivos = conteos
      .filter(item => ![EstadoConductor.desvinculado, EstadoConductor.incapacidad].includes(item.estado))
      .reduce((sum, item) => sum + item.cantidad, 0);

    return { conteos, totalActivos, totalConductores: conductores.length };
  }, [conductores, selectedEstados]); // ✅ Agregar selectedEstados como dependencia

  // ✅ MANEJAR CLICK EN ESTADO
  const handleEstadoClick = (estado: EstadoConductor, cantidad: number) => {
    if (onEstadoClick) { // ✅ PERMITIR CLICKS SIEMPRE, SIN IMPORTAR LA CANTIDAD
      onEstadoClick(estado, cantidad);
    }
  };

  // ✅ RENDERIZADO SEGÚN VARIANTE CON SOPORTE PARA SELECCIÓN
  const renderEstadoCard = (item: typeof estadisticasEstados.conteos[0]) => {
    const isClickable = onEstadoClick; // ✅ SIEMPRE CLICKEABLE SI HAY onEstadoClick

    // ✅ CLASES BASE CON INDICADORES DE SELECCIÓN
    const baseClasses = `
      relative overflow-hidden transition-all duration-200 ease-in-out
      ${item.color.bg} ${item.color.border} border rounded-lg p-3
      ${isClickable ? 'cursor-pointer transform hover:scale-105 hover:shadow-md' : ''}
      ${item.cantidad === 0 ? 'opacity-60 border-dashed' : ''}   
      ${item.isSelected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' : ''} 
    `;

    return (
      <div
        key={item.estado}
        className={baseClasses}
        onClick={() => handleEstadoClick(item.estado, item.cantidad)}
        title={showDescriptions ? item.descripcion : undefined}
      >
        {/* ✅ INDICADOR DE SELECCIÓN */}
        {item.isSelected && (
          <div className="absolute top-2 right-2 z-20">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Gradiente de fondo sutil */}
        <div className={`absolute inset-0 bg-gradient-to-br ${item.color.gradient} opacity-50`} />

        {/* ✅ OVERLAY PARA ESTADOS SELECCIONADOS */}
        {item.isSelected && (
          <div className="absolute inset-0 bg-blue-500 opacity-10" />
        )}

        {/* Contenido */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            {showIcons && (
              <span className="text-lg" role="img" aria-label={item.label}>
                {item.icono}
              </span>
            )}
            <div className={`w-2 h-2 rounded-full ${item.color.dot} ${item.isSelected ? 'opacity-50' : ''}`} />
          </div>

          <div className="space-y-1">
            <p className={`font-medium text-sm ${item.color.text} leading-tight ${item.isSelected ? 'font-bold' : ''}`}>
              {item.label}
              {/* ✅ INDICADOR TEXTUAL DE SELECCIÓN */}
              {item.isSelected && allowMultipleSelection && (
                <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">
                  ✓
                </span>
              )}
            </p>

            <div className="flex items-center justify-between">
              <span className={`font-bold text-lg ${item.color.text}`}>
                {item.cantidad}
              </span>

              {variant === 'detailed' && estadisticasEstados.totalConductores > 0 && (
                <span className={`text-xs ${item.color.text} opacity-75`}>
                  {item.porcentaje}%
                </span>
              )}
            </div>

            {showDescriptions && variant === 'detailed' && (
              <p className={`text-xs ${item.color.text} opacity-75 mt-1`}>
                {item.descripcion}
              </p>
            )}
          </div>
        </div>

        {/* Indicador de clickeable */}
        {isClickable && !item.isSelected && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={`w-1 h-1 rounded-full ${item.color.dot}`} />
          </div>
        )}
      </div>
    );
  };

  // ✅ GRID RESPONSIVO MEJORADO
  const gridClasses = {
    default: "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4",
    compact: "grid grid-cols-3 md:grid-cols-6 gap-2",
    detailed: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
  };

  return (
    <div className="space-y-4">
      {/* ✅ RESUMEN GENERAL CON INFO DE SELECCIÓN */}
      {variant === 'detailed' && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {estadisticasEstados.totalConductores}
              </p>
              <p className="text-sm text-gray-600">Total conductores</p>
            </div>
            <div className="w-px h-12 bg-gray-300" />
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {estadisticasEstados.totalActivos}
              </p>
              <p className="text-sm text-gray-600">Activos</p>
            </div>
            {/* ✅ CONTADOR DE FILTROS SELECCIONADOS */}
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

          {/* ✅ TEXTO EXPLICATIVO PARA SELECCIÓN MÚLTIPLE */}
          {allowMultipleSelection && selectedEstados.size === 0 && (
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

      {/* ✅ AYUDA PARA SELECCIÓN MÚLTIPLE (variantes compact/default) */}
      {allowMultipleSelection && variant !== 'detailed' && selectedEstados.size > 0 && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {selectedEstados.size} estado{selectedEstados.size > 1 ? 's' : ''} seleccionado{selectedEstados.size > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};