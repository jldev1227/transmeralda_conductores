import React from "react";
import { useMediaQuery } from "react-responsive";
import {
  Edit,
  Eye,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Check,
  AlertCircle,
  XCircle,
} from "lucide-react";
import Image from "next/image";

import { Conductor, EstadoConductor } from "@/context/ConductorContext";
import CustomTable, {
  Column,
  SortDescriptor,
} from "@/components/ui/customTable";

// Definimos todas las posibles columnas como un tipo
export type ConductorColumnKey =
  | "conductor"
  | "numero_identificacion"
  | "telefono"
  | "sede_trabajo"
  | "estado"
  | "acciones";

interface ConductoresTableProps {
  currentItems: Conductor[];
  sortDescriptor: SortDescriptor;
  onSortChange: (descriptor: SortDescriptor) => void;
  selectedIds?: string[];
  onSelectItem?: (conductor: Conductor) => void;
  isLoading?: boolean;
  // Opcional: columnas personalizadas que anulan la configuración responsive
  columnKeys?: ConductorColumnKey[];
  // Paginación
  currentPage: number;
  totalPages: number;
  totalCount: number;
  abrirModalEditar: (conductor: Conductor) => void;
  abrirModalDetalle: (id: string) => void;
  onPageChange: (page: number) => void;
}

export default function ConductoresTable({
  currentItems,
  sortDescriptor,
  onSortChange,
  selectedIds = [],
  onSelectItem = () => {},
  isLoading = false,
  columnKeys,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  abrirModalEditar,
  abrirModalDetalle,
}: ConductoresTableProps) {
  // Breakpoints responsivos
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });

  // Función para mostrar el estado del conductor con el color adecuado
  const renderEstado = (estado: EstadoConductor) => {
    switch (estado) {
      case EstadoConductor.ACTIVO:
        return (
          <span className="inline-flex items-center px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <Check className="mr-1 h-3 w-3" />
            {estado}
          </span>
        );
      case EstadoConductor.INACTIVO:
        return (
          <span className="inline-flex items-center px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            {estado}
          </span>
        );
      case EstadoConductor.SUSPENDIDO:
        return (
          <span className="inline-flex items-center px-2 text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            {estado}
          </span>
        );
      case EstadoConductor.RETIRADO:
        return (
          <span className="inline-flex items-center px-2 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            {estado}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {estado}
          </span>
        );
    }
  };

  // Definir todas las columnas posibles
  const allColumns: Record<ConductorColumnKey, Column> = {
    conductor: {
      key: "conductor",
      label: "CONDUCTOR",
      allowsSorting: true,
      renderCell: (conductor: Conductor) => (
        <div className="flex items-center">
          {conductor.fotoUrl ? (
            <Image
              alt={`${conductor.nombre} ${conductor.apellido}`}
              className="h-10 w-10 rounded-full mr-3"
              src={conductor.fotoUrl}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <span className="text-emerald-700 font-semibold">
                {conductor.nombre.charAt(0)}
                {conductor.apellido.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {conductor.nombre} {conductor.apellido}
            </div>
            <div className="text-sm text-gray-500">
              {conductor.cargo || "Conductor"}
            </div>
          </div>
        </div>
      ),
    },
    numero_identificacion: {
      key: "numero_identificacion",
      label: "IDENTIFICACIÓN",
      allowsSorting: true,
      renderCell: (conductor: Conductor) => (
        <div>
          <div className="text-sm text-gray-500">
            {conductor.tipo_identificacion}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {conductor.numero_identificacion}
          </div>
        </div>
      ),
    },
    telefono: {
      key: "telefono",
      label: "CONTACTO",
      allowsSorting: true,
      renderCell: (conductor: Conductor) => (
        <div>
          <div className="text-sm text-gray-900 flex items-center">
            <Phone className="h-4 w-4 mr-1 text-gray-500" />
            {conductor.telefono || "No hay teléfono"}
          </div>
          <div className="text-sm text-gray-500 flex items-center truncate">
            <Mail className="h-4 w-4 mr-1 text-gray-500" />
            {conductor.email || "No hay email"}
          </div>
        </div>
      ),
    },
    sede_trabajo: {
      key: "sede_trabajo",
      label: "SEDE",
      allowsSorting: true,
      renderCell: (conductor: Conductor) => (
        <div>
          <div className="flex items-center text-sm text-gray-900">
            <MapPin className="h-4 w-4 mr-1 text-gray-500" />
            {conductor.sede_trabajo || "No asignada"}
          </div>
          <div className="text-sm text-gray-500">
            {conductor.tipo_contrato || "N/A"}
          </div>
        </div>
      ),
    },
    estado: {
      key: "estado",
      label: "ESTADO",
      allowsSorting: true,
      renderCell: (conductor: Conductor) => (
        <div>
          {renderEstado(conductor.estado)}
          <div className="text-xs text-gray-500 mt-1">
            {conductor.ultimo_acceso
              ? `Último acceso: ${new Date(conductor.ultimo_acceso).toLocaleDateString()}`
              : "Nunca ha accedido"}
          </div>
        </div>
      ),
    },
    acciones: {
      key: "acciones",
      label: "ACCIONES",
      renderCell: (conductor: Conductor) => (
        <div className="flex space-x-2">
          <button
            className="text-emerald-600 hover:text-emerald-900 transition-colors"
            title="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              abrirModalDetalle(conductor.id);
            }}
          >
            <Eye className="h-5 w-5" />
          </button>
          <button
            className="text-blue-600 hover:text-blue-900 transition-colors"
            title="Editar"
            onClick={(e) => {
              e.stopPropagation();
              abrirModalEditar(conductor);
            }}
          >
            <Edit className="h-5 w-5" />
          </button>
          <button
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  };

  // Determinar qué columnas mostrar según el tamaño de la pantalla
  // Si se proporcionan columnKeys personalizadas, usarlas en lugar de la configuración responsive
  let displayColumns: ConductorColumnKey[];

  if (columnKeys) {
    // Usar configuración personalizada si se proporciona
    displayColumns = columnKeys;
  } else {
    // Configuración responsive por defecto
    if (isDesktop) {
      // Mostrar todas las columnas en desktop
      displayColumns = [
        "conductor",
        "numero_identificacion",
        "telefono",
        "sede_trabajo",
        "estado",
        "acciones",
      ];
    } else if (isTablet) {
      // Mostrar menos columnas en tablet
      displayColumns = ["conductor", "telefono", "sede_trabajo", "estado", "acciones"];
    } else {
      // Mostrar mínimo de columnas en móvil
      displayColumns = ["conductor", "estado", "acciones"];
    }
  }

  // Filtrar y ordenar las columnas según displayColumns
  const columns = displayColumns.map((key) => allColumns[key]);

  // Componente de paginación
  const Pagination = () => {
    // Generar un array con los números de página a mostrar
    const getPageNumbers = () => {
      let pages = [];

      // Siempre mostrar la primera página
      pages.push(1);

      // Determinar rango de páginas alrededor de la página actual
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Agregar elipsis después de la primera página si hay un salto
      if (startPage > 2) {
        pages.push("...");
      }

      // Agregar páginas del rango
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Agregar elipsis antes de la última página si hay un salto
      if (endPage < totalPages - 1) {
        pages.push("...");
      }

      // Siempre mostrar la última página si hay más de una página
      if (totalPages > 1) {
        pages.push(totalPages);
      }

      return pages;
    };

    // Si solo hay una página, no mostrar paginación
    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
              currentPage === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Anterior
          </button>
          <button
            className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
              currentPage === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando{" "}
              <span className="font-medium">
                {currentItems.length ? (currentPage - 1) * 10 + 1 : 0}
              </span>{" "}
              a{" "}
              <span className="font-medium">
                {Math.min(currentPage * 10, totalCount)}
              </span>{" "}
              de <span className="font-medium">{totalCount}</span> resultados
            </p>
          </div>
          <div>
            <nav
              aria-label="Pagination"
              className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            >
              <button
                className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                  currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                disabled={currentPage === 1}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                <span className="sr-only">Anterior</span>
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                    fillRule="evenodd"
                  />
                </svg>
              </button>

              {pageNumbers.map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      currentPage === page
                        ? "z-10 bg-emerald-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                    }`}
                    onClick={() =>
                      typeof page === "number" && onPageChange(page)
                    }
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                  currentPage === totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                disabled={currentPage === totalPages}
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
              >
                <span className="sr-only">Siguiente</span>
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    fillRule="evenodd"
                  />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <CustomTable
        className="rounded-lg shadow-sm"
        columns={columns}
        data={currentItems}
        emptyContent={
          <div
            className="w-full
 text-center py-10 text-gray-500"
          >
            <div className="flex flex-col items-center justify-center">
              <svg
                className="h-12 w-12 text-gray-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
              <p className="text-lg font-medium">
                No se encontraron conductores
              </p>
              <p className="text-sm mt-1">
                Intenta con otros criterios de búsqueda o agrega un nuevo
                conductor
              </p>
            </div>
          </div>
        }
        getItemId={(item) => item.id}
        isLoading={isLoading}
        loadingContent={
          <div className="flex flex-col items-center gap-4 justify-center py-6 w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            <p className="text-emerald-600">Cargando</p>
          </div>
        }
        selectedItems={currentItems.filter((item) =>
          selectedIds.includes(item.id),
        )}
        sortDescriptor={sortDescriptor}
        onRowClick={(conductor) => abrirModalDetalle(conductor.id)}
        onSelectionChange={onSelectItem}
        onSortChange={onSortChange}
      />

      {/* Componente de paginación */}
      <Pagination />
    </div>
  );
}
