import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import {
  Filter,
  X,
  IdCard,
  Clipboard,
  UserCheck,
  ArrowUp,
  ArrowDown,
  Search,
  Calendar,
  DollarSign,
  Heart,
  Building,
} from "lucide-react";
import { useDisclosure } from "@heroui/modal";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";

import { FilterOptions } from "@/types";
import { EstadoConductor } from "@/context/ConductorContext";

interface FiltersDrawerProps {
  filtros: FilterOptions;
  setFiltros: (filters: FilterOptions) => void;
  sortOptions: { field: string; direction: "asc" | "desc" };
  setSortOptions: (options: {
    field: string;
    direction: "asc" | "desc";
  }) => void;
  contarFiltrosActivos: () => number;
  limpiarFiltros: () => void;
  handleSearch: (termino: string) => void;
  searchTerm?: string;
}

const FiltersDrawer: React.FC<FiltersDrawerProps> = ({
  filtros,
  setFiltros,
  sortOptions,
  setSortOptions,
  contarFiltrosActivos,
  limpiarFiltros,
  handleSearch,
  searchTerm = "",
}) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Estados locales para los filtros (no se aplican hasta confirmar)
  const [localFiltros, setLocalFiltros] = useState<FilterOptions>(filtros);
  const [localSortOptions, setLocalSortOptions] = useState(sortOptions);

  // Opciones basadas en el modelo Conductor
  const sedesOptions = [
    { value: "YOPAL", label: "Yopal" },
    { value: "VILLANUEVA", label: "Villanueva" },
    { value: "TAURAMENA", label: "Tauramena" },
  ];

  const tiposIdentificacionOptions = [
    { value: "CC", label: "Cédula de Ciudadanía" },
    { value: "CE", label: "Cédula de Extranjería" },
    { value: "TI", label: "Tarjeta de Identidad" },
    { value: "PA", label: "Pasaporte" },
    { value: "NIT", label: "NIT" },
  ];

  const estadosOptions = [
    {
      value: EstadoConductor.servicio,
      label: "En Servicio",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: EstadoConductor.disponible,
      label: "Disponible",
      color: "bg-green-100 text-green-800",
    },
    {
      value: EstadoConductor.descanso,
      label: "En Descanso",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: EstadoConductor.vacaciones,
      label: "Vacaciones",
      color: "bg-purple-100 text-purple-800",
    },
    {
      value: EstadoConductor.incapacidad,
      label: "Incapacidad",
      color: "bg-orange-100 text-orange-800",
    },
    {
      value: EstadoConductor.desvinculado,
      label: "Desvinculado",
      color: "bg-red-100 text-red-800",
    },
  ];

  const generosOptions = [
    { value: "M", label: "Masculino" },
    { value: "F", label: "Femenino" },
    { value: "Otro", label: "Otro" },
  ];

  const tiposSangreOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const terminosContratoOptions = [
    "Término fijo",
    "Término indefinido",
    "Por obra o labor",
    "Prestación de servicios",
    "Temporal",
  ];

  const sortFieldOptions = [
    { value: "nombre", label: "Nombre" },
    { value: "apellido", label: "Apellido" },
    { value: "numero_identificacion", label: "Número de Identificación" },
    { value: "email", label: "Correo Electrónico" },
    { value: "telefono", label: "Teléfono" },
    { value: "estado", label: "Estado" },
    { value: "sede_trabajo", label: "Sede de Trabajo" },
    { value: "fecha_ingreso", label: "Fecha de Ingreso" },
    { value: "fecha_nacimiento", label: "Fecha de Nacimiento" },
    { value: "salario_base", label: "Salario Base" },
    { value: "created_at", label: "Fecha de Registro" },
    { value: "updated_at", label: "Última Actualización" },
  ];

  // Sincronizar estados locales cuando se abra el drawer
  React.useEffect(() => {
    if (isOpen) {
      setLocalFiltros(filtros);
      setLocalSortOptions(sortOptions);
      setLocalSearchTerm(searchTerm);
    }
  }, [isOpen, filtros, sortOptions, searchTerm]);

  // Manejar cambios en filtros locales de tipo Set
  const handleLocalSetFilter = (
    filterKey: keyof FilterOptions,
    value: string,
    checked: boolean,
  ) => {
    const newSet = new Set(localFiltros[filterKey]);

    if (checked) {
      newSet.add(value);
    } else {
      newSet.delete(value);
    }

    setLocalFiltros({
      ...localFiltros,
      [filterKey]: newSet,
    });
  };

  // Aplicar todos los filtros al confirmar
  const aplicarFiltros = () => {
    setFiltros(localFiltros);
    setSortOptions(localSortOptions);
    handleSearch(localSearchTerm);
  };

  // Limpiar filtros locales
  const limpiarFiltrosLocales = () => {
    const filtrosVacios: FilterOptions = {
      estados: new Set(),
      sedes: new Set(),
      tiposContrato: new Set(),
      tiposIdentificacion: new Set(),
      generos: new Set(),
      tiposSangre: new Set(),
      terminosContrato: new Set(),
      fechaIngresoDesde: "",
      fechaIngresoHasta: "",
      salarioMinimo: "",
      salarioMaximo: "",
    };

    setLocalFiltros(filtrosVacios);
    setLocalSortOptions({ field: "nombre", direction: "asc" });
    setLocalSearchTerm("");
  };

  // Contar filtros locales activos
  const contarFiltrosLocalesActivos = () => {
    let count = 0;

    // Contar sets no vacíos
    Object.values(localFiltros).forEach((value) => {
      if (value instanceof Set && value.size > 0) {
        count++;
      } else if (typeof value === "string" && value.trim() !== "") {
        count++;
      }
    });

    return count;
  };

  // Manejar la búsqueda local (solo actualiza el estado, no aplica)
  const handleLocalSearchSubmit = () => {
    // Solo actualizar el estado local, no aplicar aún
    console.log("Búsqueda local preparada:", localSearchTerm);
  };

  return (
    <>
      {/* Botón para abrir el drawer */}
      <Badge color="primary" content={contarFiltrosActivos()}>
        <Button
          className="relative"
          color="primary"
          startContent={<Filter className="w-4 h-4" />}
          variant="flat"
          onPress={onOpen}
        >
          Filtros y Búsqueda
        </Button>
      </Badge>

      <Drawer
        hideCloseButton
        isOpen={isOpen}
        size="lg"
        onOpenChange={onOpenChange}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex flex-col gap-1 pb-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Filtros y Búsqueda de Conductores
                  </h2>
                  {(contarFiltrosLocalesActivos() > 0 || localSearchTerm) && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                      {contarFiltrosLocalesActivos()} filtro
                      {contarFiltrosLocalesActivos() !== 1 ? "s" : ""}
                      {localSearchTerm && " + búsqueda"}
                    </span>
                  )}
                </div>
              </DrawerHeader>

              <DrawerBody className="space-y-4">
                <form
                  autoComplete="off"
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLocalSearchSubmit();
                  }}
                >
                  {/* Búsqueda */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <Search className="w-4 h-4" />
                      Búsqueda General
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Buscar por nombre, apellido, identificación, email o teléfono..."
                        size="sm"
                        startContent={
                          <Search className="w-4 h-4 text-gray-400" />
                        }
                        value={localSearchTerm}
                        variant="bordered"
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Estados */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4" />
                      Estados
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {estadosOptions.map((estado) => (
                        <label
                          key={estado.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            checked={
                              localFiltros.estados?.has(estado.value) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "estados",
                                estado.value,
                                e.target.checked,
                              )
                            }
                          />
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${estado.color} font-medium`}
                          >
                            {estado.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sedes de Trabajo */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4" />
                      Sedes de Trabajo
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {sedesOptions.map((sede) => (
                        <label
                          key={sede.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            checked={
                              localFiltros.sedes?.has(sede.value) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "sedes",
                                sede.value,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm text-gray-700 font-medium">
                            {sede.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tipos de Identificación */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <IdCard className="w-4 h-4" />
                      Tipos de Identificación
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {tiposIdentificacionOptions.map((tipo) => (
                        <label
                          key={tipo.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            checked={
                              localFiltros.tiposIdentificacion?.has(
                                tipo.value,
                              ) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "tiposIdentificacion",
                                tipo.value,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm text-gray-700">
                            {tipo.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Géneros */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4" />
                      Géneros
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {generosOptions.map((genero) => (
                        <label
                          key={genero.value}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            checked={
                              localFiltros.generos?.has(genero.value) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "generos",
                                genero.value,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm text-gray-700">
                            {genero.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tipos de Sangre */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4" />
                      Tipos de Sangre
                    </h3>
                    <div className="grid grid-cols-4 gap-1">
                      {tiposSangreOptions.map((tipo) => (
                        <label
                          key={tipo}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                        >
                          <input
                            checked={
                              localFiltros.tiposSangre?.has(tipo) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "tiposSangre",
                                tipo,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm text-gray-700 font-mono">
                            {tipo}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Términos de Contrato */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <Clipboard className="w-4 h-4" />
                      Términos de Contrato
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {terminosContratoOptions.map((tipo) => (
                        <label
                          key={tipo}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                          htmlFor="terminoContrato"
                        >
                          <input
                            checked={
                              localFiltros.terminosContrato?.has(tipo) || false
                            }
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 focus:ring-1 rounded"
                            id="terminoContrato"
                            type="checkbox"
                            onChange={(e) =>
                              handleLocalSetFilter(
                                "terminosContrato",
                                tipo,
                                e.target.checked,
                              )
                            }
                          />
                          <span className="text-sm text-gray-700">{tipo}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Filtros de Rango de Fechas */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      Rangos de Fecha
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="fechaIngresoInicio"
                        >
                          Fecha ingreso desde
                        </label>
                        <Input
                          id="fechaIngresoInicio"
                          size="sm"
                          type="date"
                          value={localFiltros.fechaIngresoDesde || ""}
                          variant="bordered"
                          onChange={(e) =>
                            setLocalFiltros({
                              ...localFiltros,
                              fechaIngresoDesde: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="fechaIngresoFin"
                        >
                          Fecha ingreso hasta
                        </label>
                        <Input
                          id="fechaIngresoFin"
                          size="sm"
                          type="date"
                          value={localFiltros.fechaIngresoHasta || ""}
                          variant="bordered"
                          onChange={(e) =>
                            setLocalFiltros({
                              ...localFiltros,
                              fechaIngresoHasta: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" />
                      Rango de Salario
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="salario"
                        >
                          Salario mínimo
                        </label>
                        <Input
                          id="salario"
                          placeholder="Ej: 1300000"
                          size="sm"
                          startContent={
                            <span className="text-gray-400">$</span>
                          }
                          type="number"
                          value={filtros.salarioMinimo || ""}
                          variant="bordered"
                          onChange={(e) =>
                            setFiltros({
                              ...filtros,
                              salarioMinimo: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="salarioMaximo"
                        >
                          Salario máximo
                        </label>
                        <Input
                          id="salarioMaximo"
                          placeholder="Ej: 3000000"
                          size="sm"
                          startContent={
                            <span className="text-gray-400">$</span>
                          }
                          type="number"
                          value={filtros.salarioMaximo || ""}
                          variant="bordered"
                          onChange={(e) =>
                            setFiltros({
                              ...filtros,
                              salarioMaximo: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ordenación */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 border-b pb-1 text-sm">
                      Ordenación
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="sortBy"
                        >
                          Ordenar por
                        </label>
                        <select
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
                          id="sortBy"
                          value={sortOptions.field}
                          onChange={(e) =>
                            setSortOptions({
                              ...sortOptions,
                              field: e.target.value,
                            })
                          }
                        >
                          {sortFieldOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium text-gray-700 mb-1"
                          htmlFor="direction"
                        >
                          Dirección
                        </label>
                        <Button
                          className="w-full h-10 justify-start"
                          size="sm"
                          startContent={
                            sortOptions.direction === "asc" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          }
                          variant="flat"
                          onPress={() =>
                            setSortOptions({
                              ...sortOptions,
                              direction:
                                sortOptions.direction === "asc"
                                  ? "desc"
                                  : "asc",
                            })
                          }
                        >
                          {sortOptions.direction === "asc"
                            ? "Ascendente"
                            : "Descendente"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </DrawerBody>

              <DrawerFooter className="flex gap-2 pt-2">
                <Button
                  color="danger"
                  isDisabled={
                    contarFiltrosLocalesActivos() === 0 && !localSearchTerm
                  }
                  size="sm"
                  startContent={<X className="w-4 h-4" />}
                  variant="flat"
                  onPress={limpiarFiltrosLocales}
                >
                  Limpiar todo
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  variant="flat"
                  onPress={() => {
                    aplicarFiltros();
                    onOpenChange();
                  }}
                >
                  Aplicar y Cerrar
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default FiltersDrawer;
