"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@heroui/button";
import {
  PlusIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  LayoutGrid,
  ListIcon,
} from "lucide-react";
import { addToast } from "@heroui/toast";

import {
  Conductor,
  useConductor,
  BusquedaParams,
  EstadoConductor,
  CrearConductorRequest,
  ActualizarConductorRequest,
} from "@/context/ConductorContext";
import { SortDescriptor } from "@/components/ui/customTable";
import ModalFormConductor from "@/components/ui/modalForm";
import ModalDetalleConductor from "@/components/ui/modalDetalle";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/config/apiClient";
import ConductorCard from "@/components/ui/conductorCard";
import { FilterOptions } from "@/types";
import FiltersDrawer from "@/components/ui/filterDrawer";

type ViewMode = "grid" | "list";

export default function GestionConductores() {
  const { user } = useAuth();
  const {
    socketConnected,
    conductoresState,
    fetchConductores,
    crearConductor,
    actualizarConductor,
  } = useConductor();

  // Estados principales
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "conductor",
    direction: "ASC",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtros, setFiltros] = useState<FilterOptions>({
    sedes: new Set<string>(),
    tiposIdentificacion: new Set<string>(),
    tiposContrato: new Set<string>(),
    estados: new Set<string>(),
    generos: new Set<string>(),
    tiposSangre: new Set<string>(),
    terminosContrato: new Set<string>(),
    fechaIngresoDesde: "",
    fechaIngresoHasta: "",
    salarioMinimo: "",
    salarioMaximo: "",
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Estados UI
  const [isSelect, setIsSelect] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Estados de modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(
    null,
  );
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] =
    useState<Conductor | null>(null);

  // Funciones de utilidad
  const handleSearch = useCallback((termino: string) => {
    setSearchTerm(termino);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // La búsqueda se ejecuta automáticamente por el useEffect
    }
  };

  const actualizarConductorConIA = async (
    conductorData: Conductor,
  ): Promise<void> => {
    try {
      setLoading(true);
      if (!conductorParaEditar?.id) {
        throw new Error("ID del conductor no encontrado para actualización");
      }
      await actualizarConductorConAI(conductorParaEditar.id, conductorData);
      addToast({
        title: "Procesamiento de actualización iniciado",
        description:
          "El conductor está siendo actualizado con IA. Recibirás notificaciones del progreso.",
        color: "success",
      });
    } catch (error: any) {
      console.error("Error al actualizar conductor con IA:", error);
      addToast({
        title: "Error al procesar actualización con IA",
        description:
          error.message ||
          "Error al iniciar el procesamiento de actualización con IA",
        color: "danger",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIONES DE API (mantenidas del código original pero simplificadas)
  const crearConductorConAI = async (
    conductorData: Conductor,
  ): Promise<void> => {
    const formData = new FormData();

    Object.keys(conductorData).forEach((key) => {
      if (
        key !== "documentos" &&
        conductorData[key as keyof Conductor] !== undefined
      ) {
        formData.append(key, String(conductorData[key as keyof Conductor]));
      }
    });

    if (conductorData.documentos) {
      const categorias: string[] = [];

      Object.entries(conductorData.documentos).forEach(
        ([categoria, documento]) => {
          if ((documento as any)?.file) {
            formData.append("files", (documento as any).file);
            categorias.push(categoria);
          }
        },
      );
      formData.append("categorias", JSON.stringify(categorias));
    }

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

  const actualizarConductorConAI = async (
    conductorId: string,
    conductorData: Conductor,
  ): Promise<void> => {
    const formData = new FormData();

    Object.keys(conductorData).forEach((key) => {
      if (
        key !== "documentos" &&
        key !== "id" &&
        conductorData[key as keyof Conductor] !== undefined
      ) {
        formData.append(key, String(conductorData[key as keyof Conductor]));
      }
    });

    if (conductorData.documentos) {
      const categorias: string[] = [];

      Object.entries(conductorData.documentos).forEach(
        ([categoria, documento]) => {
          if ((documento as any)?.file) {
            formData.append("files", (documento as any).file);
            categorias.push(categoria);
          } else if ((documento as any)?.s3_key) {
            formData.append(
              `documento_existente_${categoria}`,
              (documento as any).s3_key,
            );
          }
        },
      );
      if (categorias.length > 0) {
        formData.append("categorias", JSON.stringify(categorias));
      }
    }

    const response = await apiClient.put(
      `/api/conductores/actualizar-con-ia/${conductorId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "socket-id": `socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      },
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || "Error al procesar actualización con IA",
      );
    }

    return response.data;
  };

  // Cargar datos
  useEffect(() => {
    const params: BusquedaParams = {
      page: 1,
      sort: sortDescriptor.column,
      order: sortDescriptor.direction === "ASC" ? "ASC" : "DESC",
    };

    if (searchTerm) params.search = searchTerm;
    if (filtros.sedes.size > 0) params.sede_trabajo = Array.from(filtros.sedes);
    if (filtros.tiposIdentificacion.size > 0)
      params.tipo_identificacion = Array.from(filtros.tiposIdentificacion);
    if (filtros.tiposContrato.size > 0)
      params.tipo_contrato = Array.from(filtros.tiposContrato);
    if (filtros.estados.size > 0) params.estado = Array.from(filtros.estados);

    setLoading(true);
    fetchConductores(params).finally(() => setLoading(false));
  }, [filtros, searchTerm, sortDescriptor]);

  // Funciones de modal
  const abrirModalDetalle = (id: string) => {
    setSelectedConductorId(id);
    setModalDetalleOpen(true);
  };

  const abrirModalCrear = () => {
    setConductorParaEditar(null);
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

  // Funciones de selección
  const handleSelection = () => {
    setSelectedIds([]);
    setIsSelect(!isSelect);
  };

  const handleSelectItem = (conductor: Conductor) => {
    if (selectedIds.includes(conductor.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== conductor.id));
    } else {
      setSelectedIds([...selectedIds, conductor.id]);
    }
  };

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

      if (currentSearchTerm) params.search = currentSearchTerm;
      if (currentFiltros.sedes.size > 0)
        params.sede_trabajo = Array.from(currentFiltros.sedes);
      if (currentFiltros.tiposIdentificacion.size > 0)
        params.tipo_identificacion = Array.from(
          currentFiltros.tiposIdentificacion,
        );
      if (currentFiltros.tiposContrato.size > 0)
        params.tipo_contrato = Array.from(currentFiltros.tiposContrato);
      if (currentFiltros.estados.size > 0)
        params.estado = Array.from(currentFiltros.estados);

      // ✅ EJECUTAR AMBAS CONSULTAS EN PARALELO
      await Promise.all([fetchConductores(params)]);

      if (searchTermParam !== undefined) setSearchTerm(searchTermParam);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
    } finally {
      setLoading(false);
    }
  };

  const contarFiltrosActivos = () => {
    return Object.values(filtros).filter((set) => set.size > 0).length;
  };

  const limpiarFiltros = () => {
    setFiltros({
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
      generos: new Set<string>(),
      tiposSangre: new Set<string>(),
      terminosContrato: new Set<string>(),
      fechaIngresoDesde: "",
      fechaIngresoHasta: "",
      salarioMinimo: "",
      salarioMaximo: "",
    });
  };

  // Limpiar filtros
  const handleReset = () => {
    const filtrosVacios = {
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
      generos: new Set<string>(),
      tiposSangre: new Set<string>(),
      terminosContrato: new Set<string>(),
      fechaIngresoDesde: "",
      fechaIngresoHasta: "",
      salarioMinimo: "",
      salarioMaximo: "",
    };

    setSearchTerm("");
    setFiltros(filtrosVacios);
  };

  const crearConductorTradicional = async (
    conductorData: CrearConductorRequest,
  ): Promise<void> => {
    try {
      setLoading(true);
      await crearConductor(conductorData);
      cerrarModalForm();
      await cargarConductores(conductoresState.currentPage);
    } catch (error: any) {
      console.error("Error al crear conductor tradicional:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Filtros activos
  const filtrosActivos = useMemo(() => {
    return {
      total:
        Array.from(filtros.estados).length +
        Array.from(filtros.tiposContrato).length +
        Array.from(filtros.sedes).length +
        Array.from(filtros.tiposIdentificacion).length,
      hasSearch: searchTerm.length > 0,
    };
  }, [filtros, searchTerm]);

  // Estadísticas completas y mejoradas
  const estadisticas = useMemo(() => {
    const data = conductoresState.data;
    const total = data.length;

    // Contadores por estado
    const porEstado = {
      servicio: data.filter((c) => c.estado === EstadoConductor.servicio)
        .length,
      disponible: data.filter((c) => c.estado === EstadoConductor.disponible)
        .length,
      descanso: data.filter((c) => c.estado === EstadoConductor.descanso)
        .length,
      vacaciones: data.filter((c) => c.estado === EstadoConductor.vacaciones)
        .length,
      incapacidad: data.filter((c) => c.estado === EstadoConductor.incapacidad)
        .length,
      desvinculado: data.filter(
        (c) => c.estado === EstadoConductor.desvinculado,
      ).length,
    };

    // Agrupaciones principales
    const activos = porEstado.servicio + porEstado.disponible;
    const temporalmenteFuera =
      porEstado.descanso + porEstado.vacaciones + porEstado.incapacidad;
    const inactivos = porEstado.desvinculado;

    // Cálculos de porcentajes
    const porcentajes = {
      activos: total > 0 ? Math.round((activos / total) * 100) : 0,
      temporalmenteFuera:
        total > 0 ? Math.round((temporalmenteFuera / total) * 100) : 0,
      inactivos: total > 0 ? Math.round((inactivos / total) * 100) : 0,
      enServicio:
        total > 0 ? Math.round((porEstado.servicio / total) * 100) : 0,
      disponibles:
        total > 0 ? Math.round((porEstado.disponible / total) * 100) : 0,
    };

    // Estadísticas adicionales
    const estadisticasExtras = {
      // Eficiencia operativa (conductores activamente trabajando vs total)
      eficienciaOperativa:
        total > 0 ? Math.round((porEstado.servicio / total) * 100) : 0,
      // Disponibilidad inmediata
      disponibilidadInmediata:
        total > 0 ? Math.round((porEstado.disponible / total) * 100) : 0,
      // Ratio de utilización (en servicio vs disponibles + en servicio)
      ratioUtilizacion:
        activos > 0 ? Math.round((porEstado.servicio / activos) * 100) : 0,
    };

    return {
      total,
      // Agrupaciones principales
      activos,
      temporalmenteFuera,
      inactivos,
      // Desglose por estado
      porEstado,
      // Porcentajes
      porcentajes,
      // Métricas operativas
      estadisticasExtras,
      // Estados más relevantes para mostrar
      enServicio: porEstado.servicio,
      disponibles: porEstado.disponible,
    };
  }, [conductoresState.data]);

  function sortConductores(
    conductores: Conductor[],
    field: string,
    direction: "asc" | "desc",
  ): Conductor[] {
    return [...conductores].sort((a, b) => {
      // Función para acceder de forma segura a propiedades anidadas
      function getProperty(obj: any, path: string): any {
        return path.split(".").reduce((o, p) => (o ? o[p] : undefined), obj);
      }

      const valueA = getProperty(a, field);
      const valueB = getProperty(b, field);

      // Manejo de valores indefinidos
      if (valueA === undefined && valueB === undefined) return 0;
      if (valueA === undefined) return 1;
      if (valueB === undefined) return -1;

      // Ordenamiento por tipo
      if (typeof valueA === "string" && typeof valueB === "string") {
        return direction === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Fechas
      if (
        valueA instanceof Date ||
        valueB instanceof Date ||
        (typeof valueA === "string" && /^\d{4}-\d{2}-\d{2}/.test(valueA)) ||
        (typeof valueB === "string" && /^\d{4}-\d{2}-\d{2}/.test(valueB))
      ) {
        const dateA =
          valueA instanceof Date ? valueA : new Date(valueA as string);
        const dateB =
          valueB instanceof Date ? valueB : new Date(valueB as string);

        return direction === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Numéricos
      const numA = Number(valueA);
      const numB = Number(valueB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === "asc" ? numA - numB : numB - numA;
      }

      // Fallback para otros tipos
      return direction === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }

  const sortedServices = sortConductores(
    conductoresState.data,
    sortDescriptor.column,
    sortDescriptor.direction.toLowerCase() as "asc" | "desc",
  );

  // Función auxiliar para obtener color y configuración por estado
  const getEstadoConfig = (estado: EstadoConductor) => {
    const configs = {
      [EstadoConductor.servicio]: {
        color: "blue",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        label: "En Servicio",
        icon: "🚗",
        priority: 1,
      },
      [EstadoConductor.disponible]: {
        color: "green",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
        label: "Disponible",
        icon: "✅",
        priority: 2,
      },
      [EstadoConductor.descanso]: {
        color: "yellow",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-200",
        label: "En Descanso",
        icon: "⏸️",
        priority: 3,
      },
      [EstadoConductor.vacaciones]: {
        color: "purple",
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
        label: "Vacaciones",
        icon: "🏖️",
        priority: 4,
      },
      [EstadoConductor.incapacidad]: {
        color: "orange",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
        label: "Incapacidad",
        icon: "🏥",
        priority: 5,
      },
      [EstadoConductor.desvinculado]: {
        color: "red",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        label: "Desvinculado",
        icon: "❌",
        priority: 6,
      },
    };

    return configs[estado];
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header mejorado completo */}
        <header className="mb-8 bg-white border border-gray-200 p-6 backdrop-blur-sm rounded-lg bg-white/95">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Título y Estado de Conexión */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Título y Estado de Conexión */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      {socketConnected ? (
                        <>
                          <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                          <div className="absolute inset-0 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-75" />
                        </>
                      ) : (
                        <div className="w-4 h-4 bg-red-500 rounded-full relative">
                          <div className="absolute inset-1 w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        Gestión de Conductores
                      </h1>
                      <p className="text-sm text-gray-600 mt-1">
                        {socketConnected ? (
                          <span className="flex flex-col xs:flex-row items-start xs:items-center gap-2 text-sm">
                            <span className="text-emerald-600 font-medium whitespace-nowrap">
                              Conectado en tiempo real
                            </span>
                            <span className="hidden xs:block w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                            <span className="text-gray-600 leading-relaxed break-words">
                              {new Date().toLocaleDateString("es-ES", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="text-red-600 font-medium">
                              Desconectado
                            </span>
                            <span className="w-1 h-1 bg-gray-400 rounded-full" />
                            <span>Reintentando conexión...</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Progreso de Conexión (solo cuando está desconectado) */}
              {!socketConnected && (
                <div className="mt-4">
                  <div className="w-full bg-red-100 rounded-full h-1">
                    <div
                      className="bg-red-500 h-1 rounded-full animate-pulse"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Estadísticas Rápidas y Acciones */}
            <div className="flex items-center gap-4">
              {/* Contador de Servicios */}
              <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg border">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {conductoresState?.count}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Progreso de Conexión (solo cuando está desconectado) */}
          {!socketConnected && (
            <div className="mt-4">
              <div className="w-full bg-red-100 rounded-full h-1">
                <div
                  className="bg-red-500 h-1 rounded-full animate-pulse"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}
        </header>

        <div className="flex flex-col gap-6">
          {/* Contenido principal */}
          <main className="flex-1 min-w-0">
            {/* Lista de conductores */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Cargando conductores...</p>
                  </div>
                </div>
              ) : conductoresState.data.length > 0 ? (
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Conductores Encontrados
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({sortedServices.length} resultado
                        {sortedServices.length !== 1 ? "s" : ""})
                      </span>
                    </h2>

                    <div className="flex gap-3">
                      <Button
                        color="success"
                        variant="flat"
                        onPress={abrirModalCrear}
                      >
                        <PlusIcon className="w-4 h-4" />
                        Nuevo conductor
                      </Button>
                      {/* Modo de vista */}
                      <Button
                        isIconOnly
                        color="primary"
                        variant="flat"
                        onPress={() =>
                          setViewMode(viewMode === "grid" ? "list" : "grid")
                        }
                      >
                        {viewMode === "list" ? (
                          <LayoutGrid className="w-5 h-5" />
                        ) : (
                          <ListIcon className="w-5 h-5" />
                        )}
                      </Button>
                      <FiltersDrawer
                        contarFiltrosActivos={contarFiltrosActivos}
                        filtros={filtros}
                        handleSearch={handleSearch}
                        limpiarFiltros={limpiarFiltros}
                        setFiltros={setFiltros}
                        setSortOptions={(options) =>
                          setSortDescriptor({
                            column: options.field,
                            direction: options.direction.toUpperCase() as
                              | "ASC"
                              | "DESC",
                          })
                        }
                        sortOptions={{
                          field: sortDescriptor.column,
                          direction: sortDescriptor.direction.toLowerCase() as
                            | "asc"
                            | "desc",
                        }}
                      />{" "}
                    </div>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {conductoresState.data.map((conductor) => (
                        <ConductorCard
                          key={conductor.id}
                          getPresignedUrl={async (s3Key: string) => {
                            try {
                              const response = await apiClient.get(
                                `/api/documentos/url-firma`,
                                {
                                  params: { key: s3Key },
                                },
                              );

                              return response.data.url;
                            } catch (error) {
                              console.error(
                                "Error al obtener URL firmada:",
                                error,
                              );

                              return null;
                            }
                          }}
                          isSelect={isSelect}
                          item={conductor}
                          selectedIds={selectedIds}
                          viewMode="grid"
                          onPress={abrirModalDetalle}
                          onSelect={(id) => handleSelectItem(conductor)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {conductoresState.data.map((conductor) => (
                        <ConductorCard
                          key={conductor.id}
                          getPresignedUrl={async (s3Key: string) => {
                            try {
                              const response = await apiClient.get(
                                `/api/documentos/url-firma`,
                                {
                                  params: { key: s3Key },
                                },
                              );

                              return response.data.url;
                            } catch (error) {
                              console.error(
                                "Error al obtener URL firmada:",
                                error,
                              );

                              return null;
                            }
                          }}
                          isSelect={isSelect}
                          item={conductor}
                          selectedIds={selectedIds}
                          showDetails={true}
                          viewMode="list"
                          onPress={abrirModalDetalle}
                          onSelect={(id) => handleSelectItem(conductor)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay conductores
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {filtrosActivos.total > 0 || filtrosActivos.hasSearch
                        ? "No se encontraron conductores con los filtros aplicados."
                        : "Aún no tienes conductores registrados."}
                    </p>
                    <div className="flex gap-2 justify-center">
                      {filtrosActivos.total > 0 || filtrosActivos.hasSearch ? (
                        <Button
                          startContent={<XIcon className="w-4 h-4" />}
                          variant="flat"
                          onPress={handleReset}
                        >
                          Limpiar filtros
                        </Button>
                      ) : null}
                      <Button
                        color="primary"
                        startContent={<PlusIcon className="w-4 h-4" />}
                        onPress={abrirModalCrear}
                      >
                        Registrar conductor
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Paginación */}
              {!loading && conductoresState.totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Página {conductoresState.currentPage} de{" "}
                      {conductoresState.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={conductoresState.currentPage === 1}
                        size="sm"
                        startContent={<ChevronLeftIcon className="w-4 h-4" />}
                        variant="flat"
                        onPress={() =>
                          cargarConductores(conductoresState.currentPage - 1)
                        }
                      >
                        Anterior
                      </Button>
                      <Button
                        disabled={
                          conductoresState.currentPage ===
                          conductoresState.totalPages
                        }
                        endContent={<ChevronRightIcon className="w-4 h-4" />}
                        size="sm"
                        variant="flat"
                        onPress={() =>
                          cargarConductores(conductoresState.currentPage + 1)
                        }
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modales */}
      <ModalFormConductor
        conductorEditar={conductorParaEditar}
        isOpen={modalFormOpen}
        titulo={conductorParaEditar ? "Editar Conductor" : "Nuevo Conductor"}
        onClose={cerrarModalForm}
        onSave={async (conductor: Conductor) => {
          if (conductorParaEditar) {
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

            await actualizarConductor(actualizarReq.id!, actualizarReq);
            cerrarModalForm();
            await cargarConductores(conductoresState.currentPage);
            addToast({
              title: "Conductor actualizado",
              description: "El conductor ha sido actualizado exitosamente",
              color: "success",
            });
          } else {
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
        onSaveWithIA={
          conductorParaEditar ? actualizarConductorConIA : crearConductorConAI
        }
      />

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
