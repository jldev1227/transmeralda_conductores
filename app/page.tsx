"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import {
  BrushCleaning,
  PlusCircleIcon,
  SearchIcon,
  SquareCheck,
  UserIcon,
  X,
} from "lucide-react";
import { Alert } from "@heroui/alert";
import { useMediaQuery } from "react-responsive";
import { Input } from "@heroui/input";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { Tooltip } from "@heroui/tooltip";
import { Link } from "@heroui/link";
import { addToast } from "@heroui/toast";
import { Chip } from "@heroui/chip";

import {
  Conductor,
  useConductor,
  BusquedaParams,
  getEstadoColor,
  ActualizarConductorRequest,
  CrearConductorRequest,
} from "@/context/ConductorContext";
import { SortDescriptor } from "@/components/ui/customTable";
import ModalFormConductor from "@/components/ui/modalForm"; // Actualizado
import ModalDetalleConductor from "@/components/ui/modalDetalle";
import { FilterOptions } from "@/components/ui/buscadorFiltros";
import { useAuth } from "@/context/AuthContext";
import { LogoutButton } from "@/components/logout";
import { apiClient } from "@/config/apiClient";
import ConductorCard from "@/components/ui/conductorCard";

// Define allowed filter keys for type safety
type FilterKey = "estados" | "sedes" | "tiposIdentificacion" | "tiposContrato";

export default function GestionConductores() {
  const { user } = useAuth();
  const {
    socketConnected,
    conductoresState,
    fetchConductores,
    crearConductor,
    actualizarConductor,
  } = useConductor();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "conductor",
    direction: "ASC",
  });

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtros, setFiltros] = useState<FilterOptions>({
    sedes: new Set<string>(),
    tiposIdentificacion: new Set<string>(),
    tiposContrato: new Set<string>(),
    estados: new Set<string>(),
  });
  const [loading, setLoading] = useState<boolean>(false);

  const isMobile = useMediaQuery({ maxWidth: 1024 });

  const [isSelect, setIsSelect] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Estados para los modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(
    null,
  );
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] =
    useState<Conductor | null>(null);

  // ✅ NUEVAS FUNCIONES PARA IA
  const crearConductorConIA = async (
    conductorData: Conductor,
  ): Promise<void> => {
    try {
      setLoading(true);

      // Llamar al servicio de creación con IA
      // Aquí deberías llamar a tu función que usa el endpoint /crear-con-ia
      await crearConductorConAI(conductorData);

      addToast({
        title: "Procesamiento iniciado",
        description:
          "El conductor está siendo procesado con IA. Recibirás notificaciones del progreso.",
        color: "success",
      });
    } catch (error: any) {
      console.error("Error al crear conductor con IA:", error);
      addToast({
        title: "Error al procesar con IA",
        description:
          error.message || "Error al iniciar el procesamiento con IA",
        color: "danger",
      });
      throw error; // Re-lanzar para que el modal maneje el error
    } finally {
      setLoading(false);
    }
  };

  const crearConductorTradicional = async (
    conductorData: CrearConductorRequest,
  ): Promise<void> => {
    try {
      setLoading(true);

      // Usar la función tradicional existente
      await crearConductor(conductorData);

      // Cerrar modal solo si la operación fue exitosa
      cerrarModalForm();

      // Recargar la lista
      await cargarConductores(conductoresState.currentPage);

      addToast({
        title: "Conductor creado",
        description: "El conductor ha sido registrado exitosamente",
        color: "success",
      });
    } catch (error: any) {
      console.error("Error al crear conductor tradicional:", error);
      // No cerrar el modal en caso de error
      throw error; // Re-lanzar para que el modal maneje el error
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN TEMPORAL PARA SIMULAR API DE IA (reemplazar con tu implementación real)
  const crearConductorConAI = async (
    conductorData: Conductor,
  ): Promise<void> => {
    const formData = new FormData();

    // Agregar datos básicos si los hay
    Object.keys(conductorData).forEach((key) => {
      if (
        key !== "documentos" &&
        conductorData[key as keyof Conductor] !== undefined
      ) {
        formData.append(key, String(conductorData[key as keyof Conductor]));
      }
    });

    // ✅ CORRECCIÓN: Usar 'files' como nombre de campo
    if (conductorData.documentos) {
      const categorias: string[] = [];

      Object.entries(conductorData.documentos).forEach(
        ([categoria, documento]) => {
          if ((documento as any)?.file) {
            // ✅ IMPORTANTE: Usar 'files' (no 'documentos')
            formData.append("files", (documento as any).file);
            categorias.push(categoria);
          }
        },
      );

      formData.append("categorias", JSON.stringify(categorias));
    }

    // ✅ DEBUG: Verificar el contenido del FormData
    console.log("📤 Enviando FormData:");
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (value instanceof File) {
        console.log(
          `${key}: File(${value.name}, ${value.size} bytes, ${value.type})`,
        );
      } else {
        console.log(`${key}: ${value}`);
      }
    });

    // Llamar al endpoint de IA
    const response = await apiClient.post(
      "/api/conductores/crear-con-ia",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "socket-id": `socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Error al procesar con IA");
    }

    return response.data;
  };

  // ✅ FUNCIONES EXISTENTES (mantener como están)
  const handleClosePanel = useCallback(() => {
    if (isPanelOpen && isMobile) {
      const panel = document.querySelector(".animate-bottomToTop");

      if (panel) {
        panel.classList.remove("animate-bottomToTop");
        panel.classList.add("animate-topToBottom");
        setTimeout(() => {
          setIsPanelOpen(false);
          panel.classList.remove("animate-topToBottom");
          panel.classList.add("animate-bottomToTop");
        }, 400);
      } else {
        setIsPanelOpen(false);
      }
    } else {
      setIsPanelOpen(true);
    }
  }, [isPanelOpen, isMobile]);

  const handleSelection = () => {
    if (selectedIds) {
      setSelectedIds([]);
    }
    setIsSelect(!isSelect);
  };

  // Inicialización: cargar conductores
  useEffect(() => {
    cargarConductores();
  }, []);

  // Función para cargar conductores con parámetros de búsqueda/filtros
  const cargarConductores = async (
    page: number = 1,
    searchTermParam?: string,
    filtrosParam?: FilterOptions,
  ) => {
    setLoading(true);

    try {
      const currentSearchTerm =
        searchTermParam !== undefined ? searchTermParam : searchTerm;
      const currentFiltros =
        filtrosParam !== undefined ? filtrosParam : filtros;

      const params: BusquedaParams = {
        page,
        sort: sortDescriptor.column,
        order: sortDescriptor.direction === "ASC" ? "ASC" : "DESC",
      };

      if (currentSearchTerm) {
        params.search = currentSearchTerm;
      }

      if (currentFiltros.sedes.size > 0) {
        params.sede_trabajo = currentFiltros.sedes as any;
      }

      if (currentFiltros.tiposIdentificacion.size > 0) {
        params.tipo_identificacion = Array.from(
          currentFiltros.tiposIdentificacion,
        );
      }

      if (currentFiltros.tiposContrato.size > 0) {
        params.tipo_contrato = Array.from(currentFiltros.tiposContrato);
      }

      if (currentFiltros.estados.size > 0) {
        params.estado = currentFiltros.estados as any;
      }

      await fetchConductores(params);

      if (searchTermParam !== undefined) setSearchTerm(searchTermParam);
      if (filtrosParam !== undefined) setFiltros(filtrosParam);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar la búsqueda
  const handleSearch = async (termino: string) => {
    await cargarConductores(1, termino, undefined);
  };

  const aplicarBusqueda = () => {
    handleSearch(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      aplicarBusqueda();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Manejar los filtros
  const handleFilter = async (nuevosFiltros: FilterOptions) => {
    await cargarConductores(1, undefined, nuevosFiltros);
  };

  // Manejar reset de búsqueda y filtros
  const handleReset = async () => {
    const filtrosVacios = {
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
    };

    await cargarConductores(1, "", filtrosVacios);
  };

  // Manejar cambio de página
  const handlePageChange = (page: number) => {
    cargarConductores(page);
  };

  // Manejar cambio de ordenamiento
  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    cargarConductores(1);
  };

  // Manejar la selección de conductores
  const handleSelectItem = (conductor: Conductor) => {
    if (selectedIds.includes(conductor.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== conductor.id));
    } else {
      setSelectedIds([...selectedIds, conductor.id]);
    }
  };

  // Funciones para el modal de detalle
  const abrirModalDetalle = (id: string) => {
    setSelectedConductorId(id);
    setModalDetalleOpen(true);
  };

  // Funciones para el modal de formulario (crear/editar)
  const abrirModalCrear = () => {
    setConductorParaEditar(null);
    setModalFormOpen(true);
  };

  const abrirModalEditar = (conductor: Conductor) => {
    setConductorParaEditar(conductor);
    setModalFormOpen(true);
  };

  const cerrarModalForm = () => {
    setModalFormOpen(false);
    setConductorParaEditar(null);
  };

  const cerrarModalDetalle = () => {
    setModalDetalleOpen(false);
    setSelectedConductorId(null);
  };

  const renderFiltrosSeleccionados = () => {
    const grupos: Record<FilterKey, string[]> = {
      estados: Array.from(filtros.estados),
      tiposIdentificacion: Array.from(filtros.tiposIdentificacion),
      tiposContrato: Array.from(filtros.tiposContrato),
      sedes: Array.from(filtros.sedes),
    };

    const getLabel = (tipo: FilterKey, valor: string) => {
      switch (tipo) {
        case "estados":
          return valor;
        case "tiposIdentificacion":
          return valor;
        case "sedes":
          return valor;
        case "tiposContrato":
          return valor;
        default:
          return valor;
      }
    };

    const getTipoLabel = (tipo: FilterKey) => {
      switch (tipo) {
        case "estados":
          return "Estado";
        case "tiposIdentificacion":
          return "Tipo identifi";
        case "sedes":
          return "Documentos";
        case "tiposContrato":
          return "Estado documentos";
        default:
          return tipo;
      }
    };

    const hayFiltros = Object.values(grupos).some((arr) => arr.length > 0);

    if (!hayFiltros) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(grupos).map(([tipo, valores]) =>
          valores.length > 0 ? (
            <Chip
              key={tipo}
              color="primary"
              variant="flat"
              onClose={() => {
                setFiltros((prev) => ({
                  ...prev,
                  [tipo]: new Set<string>(),
                }));
              }}
            >
              <span>
                {getTipoLabel(tipo as FilterKey)}:{" "}
                {valores.map((valor, idx) => (
                  <span key={valor}>
                    {getLabel(tipo as FilterKey, valor)}
                    {idx < valores.length - 1 && ", "}
                  </span>
                ))}
              </span>
            </Chip>
          ) : null,
        )}
      </div>
    );
  };

  const handleSelectAll = async (selected: boolean) => {
    if (selected) {
      try {
        setLoading(true);
        const response = await apiClient.get("/api/conductores/basicos");

        if (response.status === 200 && Array.isArray(response.data.data)) {
          setSelectedIds(
            response.data.data.map((conductor: Conductor) => conductor.id),
          );
        } else {
          addToast({
            title: "Error al seleccionar todos",
            description: "No se pudieron obtener todos los conductores.",
            color: "danger",
          });
        }
      } catch (error) {
        addToast({
          title: "Error al seleccionar todos",
          description: "No se pudieron obtener todos los conductores.",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedIds([]);
    }
  };

  const limpiarFiltros = () => {
    handleReset();
    const filtrosVacios = {
      estados: [] as string[],
      clases: [] as string[],
      categoriasDocumentos: [] as string[],
      estadosDocumentos: [] as string[],
      ordenamiento: undefined,
    };

    setFiltros({
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
    });
    setSearchTerm("");
  };

  const handleEstadosChange = (values: string[]) => {
    setFiltros((prev) => ({
      ...prev,
      estados: new Set(values),
    }));
  };

  // Función para obtener URL presignada
  const getPresignedUrl = async (s3Key: string) => {
    try {
      const response = await apiClient.get(`/api/documentos/url-firma`, {
        params: { key: s3Key },
      });

      return response.data.url;
    } catch (error) {
      console.error("Error al obtener URL firmada:", error);

      return null;
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA PARA MANEJO DE ACTUALIZACIONES
  const actualizarConductorExistente = async (
    conductorData: ActualizarConductorRequest,
  ): Promise<void> => {
    try {
      setLoading(true);

      if (conductorData.id) {
        await actualizarConductor(conductorData.id, conductorData);

        // Cerrar modal solo si la operación fue exitosa
        cerrarModalForm();

        // Recargar la lista
        await cargarConductores(conductoresState.currentPage);

        addToast({
          title: "Conductor actualizado",
          description: "El conductor ha sido actualizado exitosamente",
          color: "success",
        });
      }
    } catch (error: any) {
      console.error("Error al actualizar conductor:", error);
      // No cerrar el modal en caso de error
      throw error;
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto" />
          <p className="mt-4 text-emerald-700">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen relative overflow-hidden bg-gray-50">
      {/* Sidebar / Panel de filtros */}
      {(isPanelOpen || !isMobile) && (
        <aside
          aria-modal="true"
          className={`
        fixed z-40 top-0 left-0 w-full h-full bg-white shadow-lg transition-transform duration-400
        lg:static lg:w-[28rem] 2xl:w-[30rem] lg:h-auto
        ${isMobile ? (isPanelOpen ? "animate-bottomToTop" : "animate-topToBottom") : ""}
        `}
          role="dialog"
          style={{
            maxWidth: isMobile ? "100vw" : undefined,
            minHeight: isMobile ? "100vh" : undefined,
          }}
        >
          <div className="bg-white p-4 border-b">
            <div className=" flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-lg md:text-xl font-bold">
                Gestión de Conductores
              </h2>

              {isPanelOpen && isMobile && (
                <Button
                  isIconOnly
                  color="danger"
                  size="sm"
                  onPress={handleClosePanel}
                >
                  <X className="w-6 h-6" />
                </Button>
              )}
            </div>

            <div className="mt-4">
              {socketConnected ? (
                <Alert
                  className="py-2"
                  color="success"
                  radius="sm"
                  title="Conectado - Cambios en tiempo real"
                  variant="faded"
                />
              ) : (
                <Alert
                  className="py-2"
                  color="danger"
                  radius="sm"
                  title="Desconectado de conexión en tiempo real"
                  variant="faded"
                />
              )}
            </div>
          </div>

          <div className="bg-white h-[calc(100vh-56px)] flex flex-col overflow-y-auto">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Filtros y Búsqueda</h3>
                <div className="flex justify-between items-center gap-2">
                  <Input
                    placeholder="Busca por nombre, apellido o identificación"
                    radius="sm"
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyPress}
                  />
                  <Button
                    isIconOnly
                    size="md"
                    variant="light"
                    onPress={aplicarBusqueda}
                  >
                    <SearchIcon className="text-primary" />
                  </Button>
                </div>
              </div>
              <div>
                <label
                  className="font-semibold block mb-1"
                  htmlFor="tipo_contrato"
                >
                  Tipo Contrato
                </label>
                <CheckboxGroup
                  className="flex flex-wrap gap-2"
                  color="success"
                  id="tipo_contrato"
                  size="sm"
                  value={Array.from(filtros.estados)}
                  onChange={handleEstadosChange}
                >
                  <Checkbox value="fijo">Termino fijo</Checkbox>
                  <Checkbox value="indefinido">Temrino indefinido</Checkbox>
                  <Checkbox value="prestacion">
                    Prestación de servicios
                  </Checkbox>
                </CheckboxGroup>
              </div>
              <div>
                <label className="font-semibold block mb-1" htmlFor="estados">
                  Estado
                </label>
                <CheckboxGroup
                  className="flex flex-wrap gap-2"
                  color="success"
                  id="tipo_contrato"
                  size="sm"
                  value={Array.from(filtros.estados)}
                  onChange={handleEstadosChange}
                >
                  <Checkbox value="Servicio">En servicio</Checkbox>
                  <Checkbox value="Disponible">Disponible</Checkbox>
                  <Checkbox value="Mantenimiento">Descansando</Checkbox>
                  <Checkbox value="Mantenimiento">Vacaciones</Checkbox>
                  <Checkbox value="Mantenimiento">Incapacidad</Checkbox>
                </CheckboxGroup>
              </div>
              <Button
                className="mt-4 w-full"
                color="primary"
                radius="sm"
                startContent={<BrushCleaning className="w-5 h-5" />}
                variant="flat"
                onPress={limpiarFiltros}
              >
                Limpiar filtros y búsqueda
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 h-full w-full relative py-4 px-2 sm:px-4 md:px-8 lg:px-10 space-y-6 overflow-x-hidden">
        {/* Mobile: Botón para abrir panel de filtros */}
        {!isPanelOpen && isMobile && (
          <div className="fixed bottom-4 left-10 transform -translate-x-1/2 z-50">
            <Button
              isIconOnly
              color="primary"
              radius="full"
              startContent={<SearchIcon />}
              variant="solid"
              onPress={() => setIsPanelOpen(true)}
            />
          </div>
        )}

        <div className="space-y-6">
          {/* Welcome message */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Tooltip color="danger" content="Cerrar sesión" radius="sm">
                <div>
                  <LogoutButton />
                </div>
              </Tooltip>
              <Link
                className="inline-flex items-center gap-2 text-sm font-medium bg-white bg-opacity-90 p-2 rounded-md shadow"
                href={process.env.NEXT_PUBLIC_AUTH_SYSTEM}
              >
                <UserIcon className="w-5 h-5" />
                Bienvenido! {user?.nombre}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isSelect && (
                <p className="text-foreground-500">
                  {selectedIds.length} seleccionados
                </p>
              )}
              <Button
                color="primary"
                radius="sm"
                startContent={<SquareCheck className="w-6 h-6" />}
                variant="flat"
                onPress={handleSelection}
              >
                {isSelect ? "Desactivar selección" : "Activar selección"}
              </Button>

              <Button
                className="relative"
                color="success"
                radius="sm"
                startContent={<PlusCircleIcon className="w-6 h-6" />}
                variant="flat"
                onPress={abrirModalCrear}
              >
                Nuevo conductor
              </Button>
            </div>
          </div>

          {/* Graph de estados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { estado: "servicio", label: "En servicio" },
              { estado: "disponible", label: "Disponible" },
              { estado: "descanso", label: "En descanso" },
              { estado: "vacaciones", label: "Vacaciones" },
              { estado: "incapacidad", label: "En incapacidad" },
              { estado: "desvinculado", label: "Desvinculados" },
            ].map(({ estado, label }) => {
              // Si tienes EstadoConductor enum, usa EstadoConductor[estado]
              const color = getEstadoColor(estado as any);

              return (
                <div
                  key={estado}
                  className={`select-none w-full ${color.bg} p-2.5 rounded-md`}
                >
                  <p
                    className={`items-center justify-center ${color.text} text-center`}
                  >
                    {label} (
                    {
                      conductoresState.data.filter(
                        (conductor) =>
                          conductor.estado?.toLowerCase() === estado,
                      ).length
                    }
                    )
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-foreground-500">
              {(() => {
                const pageSize = 15;
                const { currentPage, count, data } = conductoresState;

                if (count === 0) return "Mostrando 0 de 0 conductores";
                const start = (currentPage - 1) * pageSize + 1;
                const end = start + data.length - 1;

                return `Mostrando ${start} al ${end} de ${count} conductores`;
              })()}
            </p>

            {isSelect && (
              <Button
                color="primary"
                variant="light"
                onPress={() => handleSelectAll(isSelect)}
              >
                <p>Seleccionar todos</p>
                <SquareCheck className="text-primary" />
              </Button>
            )}
          </div>

          {/* Filtros seleccionados */}
          <div>{renderFiltrosSeleccionados()}</div>

          {/* Listado de conductores */}
          {loading ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto" />
                <p className="mt-4 text-emerald-700">Cargando...</p>
              </div>
            </div>
          ) : (
            <div
              className="
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          xl:grid-cols-4
          2xl:grid-cols-5
          gap-5
          "
            >
              {conductoresState.data.length > 0 ? (
                conductoresState.data.map((conductor) => (
                  <ConductorCard
                    key={conductor.id}
                    getPresignedUrl={getPresignedUrl}
                    isSelect={isSelect}
                    item={conductor}
                    selectedIds={selectedIds}
                    onPress={abrirModalDetalle}
                    onSelect={(id) =>
                      handleSelectItem(
                        conductoresState.data.find((c) => c.id === id)!,
                      )
                    }
                  />
                ))
              ) : (
                <p>No hay conductores registrados aún</p>
              )}
            </div>
          )}

          {/* Paginador */}
          {!loading && conductoresState.totalPages > 1 && (
            <div className="flex justify-end py-5">
              <nav
                aria-label="Paginación"
                className="inline-flex items-center gap-1"
              >
                <Button
                  color="default"
                  disabled={conductoresState.currentPage === 1 || loading}
                  radius="sm"
                  variant="flat"
                  onPress={() =>
                    cargarConductores(conductoresState.currentPage - 1)
                  }
                >
                  Anterior
                </Button>
                {Array.from(
                  { length: conductoresState.totalPages },
                  (_, idx) => (
                    <Button
                      key={idx + 1}
                      color={
                        conductoresState.currentPage === idx + 1
                          ? "primary"
                          : "default"
                      }
                      disabled={loading}
                      radius="sm"
                      variant={
                        conductoresState.currentPage === idx + 1
                          ? "flat"
                          : "flat"
                      }
                      onPress={() => cargarConductores(idx + 1)}
                    >
                      {idx + 1}
                    </Button>
                  ),
                )}
                <Button
                  color="default"
                  disabled={
                    conductoresState.currentPage ===
                      conductoresState.totalPages || loading
                  }
                  radius="sm"
                  variant="flat"
                  onPress={() =>
                    cargarConductores(conductoresState.currentPage + 1)
                  }
                >
                  Siguiente
                </Button>
              </nav>
            </div>
          )}
        </div>
      </main>

      {/* ✅ MODAL DE FORMULARIO ACTUALIZADO CON PROPS PARA IA */}
      <ModalFormConductor
        conductorEditar={conductorParaEditar}
        isOpen={modalFormOpen}
        titulo={
          conductorParaEditar ? "Editar Conductor" : "Registrar Nuevo Conductor"
        }
        onClose={cerrarModalForm}
        onSave={async (conductor: Conductor) => {
          if (conductorParaEditar) {
            // Adapt Conductor to ActualizarConductorRequest
            const actualizarReq: ActualizarConductorRequest = {
              ...conductor,
              id: conductorParaEditar.id,
              licencia_conduccion: conductor.licencia_conduccion
                ? JSON.stringify(conductor.licencia_conduccion)
                : undefined,
              documentos: Array.isArray(conductor.documentos)
                ? Object.fromEntries(
                    (conductor.documentos as any[]).map((doc) => [
                      doc.categoria ||
                        doc.tipo ||
                        doc.nombre ||
                        Math.random().toString(36).substr(2, 9),
                      doc,
                    ]),
                  )
                : conductor.documentos,
            };

            await actualizarConductorExistente(actualizarReq);
          } else {
            // Adapt Conductor to CrearConductorRequest
            const crearReq: CrearConductorRequest = {
              ...conductor,
              licencia_conduccion: conductor.licencia_conduccion
                ? JSON.stringify(conductor.licencia_conduccion)
                : undefined,
              documentos: Array.isArray(conductor.documentos)
                ? Object.fromEntries(
                    (conductor.documentos as any[]).map((doc) => [
                      doc.categoria ||
                        doc.tipo ||
                        doc.nombre ||
                        Math.random().toString(36).substr(2, 9),
                      doc,
                    ]),
                  )
                : conductor.documentos,
            };

            await crearConductorTradicional(crearReq);
          }
        }}
        onSaveWithIA={crearConductorConIA}
      />

      {/* Modal de detalle */}
      <ModalDetalleConductor
        conductor={
          conductoresState.data.find(
            (conductor) => conductor.id === selectedConductorId,
          ) || null
        }
        isOpen={modalDetalleOpen}
        onClose={cerrarModalDetalle}
        onEdit={() => {
          setModalDetalleOpen(false);
          setModalFormOpen(true);
          setConductorParaEditar(
            conductoresState.data.find(
              (conductor) => conductor.id === selectedConductorId,
            ) || null,
          );
        }}
      />
    </div>
  );
}
