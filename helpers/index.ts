// src/helpers/helpers.ts

/**
 * Formatea un valor numérico como moneda (COP - Pesos colombianos)
 *
 * @param value - Valor numérico a formatear
 * @param options - Opciones adicionales de formato
 * @returns String formateado como moneda
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  options: {
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    symbol?: boolean;
  } = {
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    symbol: true,
  },
): string => {
  if (value === null || value === undefined || value === "") {
    return options.symbol ? "$0" : "0";
  }

  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return options.symbol ? "$0" : "0";
  }

  try {
    const formatter = new Intl.NumberFormat("es-CO", {
      style: options.symbol ? "currency" : "decimal",
      currency: options.currency ?? "COP",
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 0,
    });

    return formatter.format(numericValue);
  } catch {
    const formatted = numericValue
      .toFixed(options.maximumFractionDigits ?? 0)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return options.symbol ? `$${formatted}` : formatted;
  }
};

/**
 * Formatea una fecha en formato legible (DD/MM/YYYY)
 *
 * @param dateString - Fecha a formatear (string, Date, o timestamp)
 * @returns String con la fecha formateada
 */
export const formatDate = (dateString?: string) => {
  if (!dateString) return "Nunca";
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Trunca un texto si excede una longitud máxima
 *
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima antes de truncar
 * @returns Texto truncado con puntos suspensivos si es necesario
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength = 50,
): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + "...";
};
