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
  options = {
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    symbol: true,
  },
): string => {
  // Si el valor es null, undefined o una cadena vacía, devolver $0
  if (value === null || value === undefined || value === "") {
    return options.symbol ? "$0" : "0";
  }

  // Convertir a número si es string
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  // Si no es un número válido, devolver $0
  if (isNaN(numericValue)) {
    return options.symbol ? "$0" : "0";
  }

  try {
    // Usar el API de Intl para formatear como moneda
    const formatter = new Intl.NumberFormat("es-CO", {
      style: options.symbol ? "currency" : "decimal",
      currency: options.currency,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
    });

    return formatter.format(numericValue);
  } catch (error) {
    // Fallback por si el navegador no soporta Intl
    const formatted = numericValue
      .toFixed(options.maximumFractionDigits)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return options.symbol ? `$${formatted}` : formatted;
  }
};

/**
 * Formatea una fecha en formato legible (DD/MM/YYYY)
 *
 * @param date - Fecha a formatear (string, Date, o timestamp)
 * @param format - Formato deseado ('short', 'medium', 'long')
 * @returns String con la fecha formateada
 */
export const formatDate = (
  date: string | Date | number | null | undefined,
  format: "short" | "medium" | "long" = "short",
): string => {
  if (!date) return "N/A";

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      return "Fecha inválida";
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "America/Bogota",
    };

    switch (format) {
      case "short":
        options.day = "2-digit";
        options.month = "2-digit";
        options.year = "numeric";
        break;
      case "medium":
        options.day = "2-digit";
        options.month = "short";
        options.year = "numeric";
        break;
      case "long":
        options.day = "2-digit";
        options.month = "long";
        options.year = "numeric";
        options.weekday = "long";
        break;
    }

    return new Intl.DateTimeFormat("es-CO", options).format(dateObj);
  } catch (error) {
    console.error("Error al formatear fecha:", error);

    return "Error de formato";
  }
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
