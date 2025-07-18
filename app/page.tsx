"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@heroui/button";
import {
  BrushCleaning,
  PlusCircleIcon,
  SearchIcon,
  SquareCheck,
  UserIcon,
  SlidersHorizontal,
  Grid3X3,
  List,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import { CheckboxGroup, Checkbox } from "@heroui/checkbox";
import { addToast } from "@heroui/toast";
import { Chip } from "@heroui/chip";
import { Card, CardBody } from "@heroui/card";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
} from "@heroui/drawer";
import { Input } from "@heroui/input";

import {
  Conductor,
  useConductor,
  BusquedaParams,
  EstadoConductor,
  ActualizarConductorRequest,
  CrearConductorRequest,
} from "@/context/ConductorContext";
import { SortDescriptor } from "@/components/ui/customTable";
import ModalFormConductor from "@/components/ui/modalForm";
import ModalDetalleConductor from "@/components/ui/modalDetalle";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/config/apiClient";
import ConductorCard from "@/components/ui/conductorCard";
import { EstadosConductores } from "@/components/ui/estadosConductores";
import { FilterOptions } from "@/types";

// ✅ TIPOS Y CONSTANTES MEJORADAS
type FilterKey = "estados" | "sedes" | "tiposIdentificacion" | "tiposContrato";
type ViewMode = "grid" | "list";

const FILTROS_CONFIG = {
  tiposContrato: [
    { value: "fijo", label: "Término fijo" },
    { value: "indefinido", label: "Término indefinido" },
    { value: "prestacion", label: "Prestación de servicios" },
  ],
  estados: [
    { value: EstadoConductor.servicio, label: "En servicio" },
    { value: EstadoConductor.disponible, label: "Disponible" },
    { value: EstadoConductor.descanso, label: "En descanso" },
    { value: EstadoConductor.vacaciones, label: "Vacaciones" },
    { value: EstadoConductor.incapacidad, label: "Incapacidad" },
    { value: EstadoConductor.desvinculado, label: "Desvinculado" },
  ],
} as const;

export default function GestionConductores() {
  const { user } = useAuth();
  const {
    socketConnected,
    conductoresState,
    fetchConductores,
    crearConductor,
    actualizarConductor,
  } = useConductor();

  // ✅ ESTADOS PRINCIPALES
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor] = useState<SortDescriptor>({
    column: "conductor",
    direction: "ASC",
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtros, setFiltros] = useState<FilterOptions>({
    sedes: new Set<string>(),
    tiposIdentificacion: new Set<string>(),
    tiposContrato: new Set<string>(),
    estados: new Set<string>(),
  });
  const [loading, setLoading] = useState<boolean>(false);

  // ✅ ESTADOS DE UI MEJORADOS
  const isMobile = useMediaQuery({ maxWidth: 1024 });
  const [isSelect, setIsSelect] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // ✅ ESTADOS DE MODALES
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(
    null,
  );
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] =
    useState<Conductor | null>(null);

  // ✅ FUNCIONES DE IA (mantenidas del código original)
  const crearConductorConIA = async (
    conductorData: Conductor,
  ): Promise<void> => {
    try {
      setLoading(true);
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
      throw error;
    } finally {
      setLoading(false);
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

  // 3. ✅ CORREGIR LA FUNCIÓN filtrarPorEstado PARA USAR ESTADÍSTICAS
  const filtrarPorEstado = useCallback(
    (estado: EstadoConductor) => {
      // ✅ CREAR UNA NUEVA COPIA DEL SET DE ESTADOS
      const nuevosEstados = new Set(filtros.estados);

      // ✅ TOGGLE: agregar o quitar el estado
      if (nuevosEstados.has(estado)) {
        nuevosEstados.delete(estado);
      } else {
        nuevosEstados.add(estado);
      }

      // ✅ CREAR NUEVOS FILTROS
      const nuevosFiltros = {
        ...filtros,
        estados: nuevosEstados,
      };

      // ✅ ACTUALIZAR ESTADO INMEDIATAMENTE
      setFiltros(nuevosFiltros);
    },
    [filtros, searchTerm, sortDescriptor, setFiltros, addToast],
  );

  // 4. ✅ CORREGIR EL useEffect PARA RECARGAR CONDUCTORES
  useEffect(() => {
    if (
      filtros.estados.size === 0 &&
      filtros.sedes.size === 0 &&
      filtros.tiposContrato.size === 0 &&
      filtros.tiposIdentificacion.size === 0 &&
      !searchTerm
    ) {
      // ✅ NO HACER NADA SI NO HAY FILTROS (evitar carga inicial duplicada)
      return;
    }

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

  // 5. ✅ CORREGIR EL useEffect INICIAL
  useEffect(() => {
    // ✅ Cargar estadísticas y conductores iniciales
    const cargarDatosIniciales = async () => {
      setLoading(true);
      try {
        await Promise.all([obtenerEstadisticasEstados(), cargarConductores(1)]);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosIniciales();
  }, []); // ✅ Solo ejecutar una vez al montar el componente

  // ✅ NUEVO ESTADO PARA ESTADÍSTICAS
  const [estadisticasEstados, setEstadisticasEstados] = useState({
    estadisticas: [],
    totalConductores: 0,
    totalActivos: 0,
    filtrosAplicados: {},
  });

  // 9. ✅ CORREGIR LA FUNCIÓN quitarFiltroEstado
  const quitarFiltroEstado = useCallback(
    (estado: string) => {
      const nuevosEstados = new Set(filtros.estados);

      nuevosEstados.delete(estado);

      const nuevosFiltros = {
        ...filtros,
        estados: nuevosEstados,
      };

      setFiltros(nuevosFiltros);
    },
    [filtros, addToast],
  );

  // ✅ FUNCIONES DE CARGA Y FILTROS MEJORADAS
  useEffect(() => {
    cargarConductores();
  }, []);

  // ✅ FUNCIONES DE UI MEJORADAS
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

  const handleReset = async () => {
    const filtrosVacios = {
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
    };

    setSearchTerm("");
    setFiltros(filtrosVacios);
    // ✅ NO llamar cargarConductores aquí, el useEffect se encargará
  };

  // ✅ MEMOIZACIÓN PARA OPTIMIZACIÓN
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

  // ✅ FUNCIONES DE MODAL Y SELECCIÓN (mantenidas del original)
  const handleSelection = () => {
    if (selectedIds) {
      setSelectedIds([]);
    }
    setIsSelect(!isSelect);
  };

  const handleSelectItem = (conductor: Conductor) => {
    if (selectedIds.includes(conductor.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== conductor.id));
    } else {
      setSelectedIds([...selectedIds, conductor.id]);
    }
  };

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

  // ✅ FUNCIÓN PARA RENDERIZAR FILTROS ACTIVOS
  const renderFiltrosActivos = () => {
    const grupos: Record<FilterKey, string[]> = {
      estados: Array.from(filtros.estados),
      tiposIdentificacion: Array.from(filtros.tiposIdentificacion),
      tiposContrato: Array.from(filtros.tiposContrato),
      sedes: Array.from(filtros.sedes),
    };

    const getLabel = (tipo: FilterKey, valor: string) => {
      switch (tipo) {
        case "estados":
          return (
            FILTROS_CONFIG.estados.find((e) => e.value === valor)?.label ||
            valor
          );
        case "tiposContrato":
          return (
            FILTROS_CONFIG.tiposContrato.find((t) => t.value === valor)
              ?.label || valor
          );
        default:
          return valor;
      }
    };

    const hayFiltros = Object.values(grupos).some((arr) => arr.length > 0);

    if (!hayFiltros && !searchTerm) return null;

    return (
      <Card className="border-none shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardBody className="p-3">
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Chip
                color="secondary"
                variant="flat"
                onClose={() => {
                  setSearchTerm("");
                  handleSearch("");
                }}
              >
                Búsqueda: ({searchTerm})
              </Chip>
            )}

            {/* ✅ RENDERIZAR CHIPS INDIVIDUALES PARA CADA ESTADO */}
            {grupos.estados.map((estado) => (
              <Chip
                key={`estado-${estado}`}
                color="primary"
                variant="flat"
                onClose={() => quitarFiltroEstado(estado)}
              >
                {getLabel("estados", estado)}
              </Chip>
            ))}

            {/* ✅ RENDERIZAR CHIPS INDIVIDUALES PARA TIPOS DE CONTRATO */}
            {grupos.tiposContrato.map((tipo) => (
              <Chip
                key={`contrato-${tipo}`}
                color="primary"
                variant="flat"
                onClose={() => {
                  const nuevosContratos = new Set(filtros.tiposContrato);

                  nuevosContratos.delete(tipo);
                  const nuevosFiltros = {
                    ...filtros,
                    tiposContrato: nuevosContratos,
                  };

                  setFiltros(nuevosFiltros);
                  cargarConductores(1, searchTerm, nuevosFiltros);
                }}
              >
                {getLabel("tiposContrato", tipo)}
              </Chip>
            ))}

            {/* ✅ RENDERIZAR CHIPS INDIVIDUALES PARA TIPOS DE IDENTIFICACIÓN */}
            {grupos.tiposIdentificacion.map((tipo) => (
              <Chip
                key={`identificacion-${tipo}`}
                color="primary"
                variant="flat"
                onClose={() => {
                  const nuevosTipos = new Set(filtros.tiposIdentificacion);

                  nuevosTipos.delete(tipo);
                  const nuevosFiltros = {
                    ...filtros,
                    tiposIdentificacion: nuevosTipos,
                  };

                  setFiltros(nuevosFiltros);
                  cargarConductores(1, searchTerm, nuevosFiltros);
                }}
              >
                {getLabel("tiposIdentificacion", tipo)}
              </Chip>
            ))}

            {/* ✅ RENDERIZAR CHIPS INDIVIDUALES PARA SEDES */}
            {grupos.sedes.map((sede) => (
              <Chip
                key={`sede-${sede}`}
                color="primary"
                variant="flat"
                onClose={() => {
                  const nuevasSedes = new Set(filtros.sedes);

                  nuevasSedes.delete(sede);
                  const nuevosFiltros = { ...filtros, sedes: nuevasSedes };

                  setFiltros(nuevosFiltros);
                  cargarConductores(1, searchTerm, nuevosFiltros);
                }}
              >
                {sede}
              </Chip>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  };

  const obtenerEstadisticasEstados = async (
    filtrosSinEstado?: Partial<BusquedaParams>,
  ) => {
    try {
      const params = new URLSearchParams();

      // ✅ AGREGAR FILTROS EXCEPTO ESTADO
      if (searchTerm) params.append("search", searchTerm);
      if (filtros.sedes.size > 0) {
        params.append("sede_trabajo", Array.from(filtros.sedes).join(","));
      }
      if (filtros.tiposIdentificacion.size > 0) {
        params.append(
          "tipo_identificacion",
          Array.from(filtros.tiposIdentificacion).join(","),
        );
      }
      if (filtros.tiposContrato.size > 0) {
        params.append(
          "tipo_contrato",
          Array.from(filtros.tiposContrato).join(","),
        );
      }

      // ✅ SOBRESCRIBIR CON FILTROS PERSONALIZADOS SI SE PROPORCIONAN
      if (filtrosSinEstado) {
        Object.entries(filtrosSinEstado).forEach(([key, value]) => {
          if (value !== undefined && key !== "estado") {
            if (Array.isArray(value)) {
              params.set(key, value.join(","));
            } else {
              params.set(key, value.toString());
            }
          }
        });
      }

      // ✅ CORREGIR LA URL - AGREGAR /estadisticas AL FINAL
      const response = await apiClient.get(
        `/api/conductores/estadisticas?${params.toString()}`,
      );

      if (response.data.success) {
        setEstadisticasEstados(response.data.data);
      }

      return response.data.data;
    } catch (error) {
      console.error("Error al obtener estadísticas:", error);

      // ✅ FALLBACK: usar datos actuales si falla la consulta
      return {
        estadisticas: [],
        totalConductores: conductoresState.count,
        totalActivos: 0,
        filtrosAplicados: {},
      };
    }
  };

  // ✅ MODIFICAR LA FUNCIÓN cargarConductores PARA INCLUIR ESTADÍSTICAS
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
      await Promise.all([
        fetchConductores(params),
        obtenerEstadisticasEstados(params), // ✅ Obtener estadísticas con los mismos filtros (excepto estado)
      ]);

      if (searchTermParam !== undefined) setSearchTerm(searchTermParam);
    } catch (error) {
      console.error("Error al cargar conductores:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZAR EL useEffect INICIAL
  useEffect(() => {
    // ✅ Cargar estadísticas al inicio
    obtenerEstadisticasEstados();
    cargarConductores();
  }, []);

  // ✅ ACTUALIZAR ESTADÍSTICAS CUANDO CAMBIEN FILTROS (EXCEPTO ESTADO)
  useEffect(() => {
    // ✅ Solo actualizar estadísticas si cambian filtros que no sean estado
    const filtrosSinEstado = {
      search: searchTerm,
      sede_trabajo: Array.from(filtros.sedes),
      tipo_identificacion: Array.from(filtros.tiposIdentificacion),
      tipo_contrato: Array.from(filtros.tiposContrato),
    };

    obtenerEstadisticasEstados(filtrosSinEstado);
  }, [
    searchTerm,
    filtros.sedes,
    filtros.tiposIdentificacion,
    filtros.tiposContrato,
  ]);

  const limpiarFiltrosDrawer = () => {
    const filtrosVacios = {
      sedes: new Set<string>(),
      tiposIdentificacion: new Set<string>(),
      tiposContrato: new Set<string>(),
      estados: new Set<string>(),
    };

    setFiltrosTemporal(filtrosVacios);
    setFiltros(filtrosVacios);
    setSearchTerm("");
    setIsFiltersOpen(false);
  };

  const aplicarFiltrosDrawer = () => {
    // ✅ Aplicar filtros temporales a los filtros reales
    setFiltros(filtrosTemporal);
    setIsFiltersOpen(false);
  };

  // ✅ 1. CREAR ESTADO TEMPORAL PARA EL DRAWER
  const [filtrosTemporal, setFiltrosTemporal] = useState<FilterOptions>({
    sedes: new Set<string>(),
    tiposIdentificacion: new Set<string>(),
    tiposContrato: new Set<string>(),
    estados: new Set<string>(),
  });

  // ✅ 2. MODIFICAR EL useEffect PARA EVITAR RE-RENDERS INNECESARIOS
  useEffect(() => {
    // ✅ SOLO EJECUTAR SI HAY FILTROS APLICADOS Y EL DRAWER ESTÁ CERRADO
    if (
      !isFiltersOpen &&
      (filtros.estados.size > 0 ||
        filtros.sedes.size > 0 ||
        filtros.tiposContrato.size > 0 ||
        filtros.tiposIdentificacion.size > 0 ||
        searchTerm)
    ) {
      const params: BusquedaParams = {
        page: 1,
        sort: sortDescriptor.column,
        order: sortDescriptor.direction === "ASC" ? "ASC" : "DESC",
      };

      if (searchTerm) params.search = searchTerm;
      if (filtros.sedes.size > 0)
        params.sede_trabajo = Array.from(filtros.sedes);
      if (filtros.tiposIdentificacion.size > 0)
        params.tipo_identificacion = Array.from(filtros.tiposIdentificacion);
      if (filtros.tiposContrato.size > 0)
        params.tipo_contrato = Array.from(filtros.tiposContrato);
      if (filtros.estados.size > 0) params.estado = Array.from(filtros.estados);

      setLoading(true);
      fetchConductores(params).finally(() => setLoading(false));
    }
  }, [filtros, searchTerm, sortDescriptor, isFiltersOpen]);

  // ✅ 3. FUNCIÓN PARA ABRIR EL DRAWER Y SINCRONIZAR FILTROS TEMPORALES
  const abrirDrawerFiltros = () => {
    // ✅ Copiar filtros actuales a temporales
    setFiltrosTemporal({
      sedes: new Set(filtros.sedes),
      tiposIdentificacion: new Set(filtros.tiposIdentificacion),
      tiposContrato: new Set(filtros.tiposContrato),
      estados: new Set(filtros.estados),
    });
    setIsFiltersOpen(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-blue-700 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* ✅ HEADER MÓVIL MEJORADO */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold bg-gradient-to-r text-emerald-600 bg-clip-text">
                Conductores
              </h1>
              {socketConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle selección */}
              <Button
                isIconOnly
                color={isSelect ? "primary" : "default"}
                size="sm"
                variant="flat"
                onPress={handleSelection}
              >
                <SquareCheck className="w-5 h-5" />
              </Button>

              {/* Filtros */}
              <Button
                isIconOnly
                size="sm"
                variant="flat"
                onPress={abrirDrawerFiltros} // ✅ Usar nueva función
              >
                <SlidersHorizontal className="w-5 h-5" />
              </Button>

              {/* Nuevo conductor */}
              <Button
                isIconOnly
                color="primary"
                size="sm"
                onPress={abrirModalCrear}
              >
                <PlusCircleIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* ✅ BARRA DE BÚSQUEDA MÓVIL */}
          <div className="mt-3 flex gap-2">
            <Input
              classNames={{
                input: "bg-white",
                inputWrapper: "shadow-sm",
              }}
              placeholder="Buscar conductores..."
              size="sm"
              startContent={<SearchIcon className="w-4 h-4 text-gray-400" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <Button
              isIconOnly
              color="primary"
              size="sm"
              variant="flat"
              onPress={aplicarBusqueda}
            >
              <SearchIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* ✅ CONTROLES DE VISTA Y SELECCIÓN */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                startContent={
                  viewMode === "grid" ? (
                    <Grid3X3 className="w-4 h-4" />
                  ) : (
                    <List className="w-4 h-4" />
                  )
                }
                variant="flat"
                onPress={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
              >
                {viewMode === "grid" ? "Cuadrícula" : "Lista"}
              </Button>

              {isSelect && (
                <span className="text-sm text-gray-600">
                  {selectedIds.length} seleccionados
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">
              {conductoresState.count} conductores
            </p>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <main className="p-4 space-y-6">
        {/* Estados de conductores */}
        <EstadosConductores
          // ✅ NO PASAR conductores, usar estadísticas externas
          loading={loading}
          selectedEstados={filtros.estados}
          showDescriptions={false}
          showIcons={!isMobile}
          variant={isMobile ? "compact" : "detailed"}
          onEstadoClick={filtrarPorEstado}
          allowMultipleSelection={true}
          // ✅ PASAR ESTADÍSTICAS EXTERNAS
          estadisticasExternas={estadisticasEstados}
        />
        {/* Filtros activos */}
        {renderFiltrosActivos()}

        {/* Grid/Lista de conductores */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-4 text-blue-700">Cargando conductores...</p>
            </div>
          </div>
        ) : (
          <div
            className={`
            ${
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" // ✅ GRID PARA VISTA LISTA
            }
          `}
          >
            {conductoresState.data.length > 0 ? (
              conductoresState.data.map((conductor) => (
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
                      console.error("Error al obtener URL firmada:", error);

                      return null;
                    }
                  }}
                  isSelect={isSelect}
                  item={conductor}
                  selectedIds={selectedIds}
                  showDetails={viewMode === "list"} // ✅ MOSTRAR DETALLES EN VISTA LISTA
                  viewMode={viewMode} // ✅ PASAR EL MODO DE VISTA
                  onPress={abrirModalDetalle}
                  onSelect={(id) =>
                    handleSelectItem(
                      conductoresState.data.find((c) => c.id === id)!,
                    )
                  }
                />
              ))
            ) : (
              <Card className="col-span-full">
                <CardBody className="text-center py-12">
                  <UserIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No hay conductores
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {filtrosActivos.total > 0 || filtrosActivos.hasSearch
                      ? "No se encontraron conductores con los filtros aplicados"
                      : "Aún no tienes conductores registrados"}
                  </p>
                  {filtrosActivos.total > 0 || filtrosActivos.hasSearch ? (
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={handleReset}
                    >
                      Limpiar filtros
                    </Button>
                  ) : (
                    <Button color="primary" onPress={abrirModalCrear}>
                      Registrar primer conductor
                    </Button>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* Paginación */}
        {!loading && conductoresState.totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Button
                disabled={conductoresState.currentPage === 1}
                size="sm"
                variant="flat"
                onPress={() =>
                  cargarConductores(conductoresState.currentPage - 1)
                }
              >
                Anterior
              </Button>

              <span className="text-sm text-gray-600 px-3">
                {conductoresState.currentPage} de {conductoresState.totalPages}
              </span>

              <Button
                disabled={
                  conductoresState.currentPage === conductoresState.totalPages
                }
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
        )}
      </main>

      {/* ✅ DRAWER DE FILTROS MÓVIL */}
      <Drawer
        isOpen={isFiltersOpen}
        placement="right"
        onClose={() => setIsFiltersOpen(false)}
      >
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                Filtros Avanzados
              </DrawerHeader>
              <DrawerBody>
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    htmlFor="tipo_contrato"
                  >
                    Tipo de Contrato
                  </label>
                  <CheckboxGroup
                    color="primary"
                    id="tipo_contrato"
                    size="sm"
                    value={Array.from(filtrosTemporal.tiposContrato)} // ✅ Usar filtros temporales
                    onChange={(values) =>
                      setFiltrosTemporal((prev) => ({
                        ...prev,
                        tiposContrato: new Set(values),
                      }))
                    }
                  >
                    {FILTROS_CONFIG.tiposContrato.map((tipo) => (
                      <Checkbox key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    htmlFor="estado"
                  >
                    Estado
                  </label>
                  <CheckboxGroup
                    color="primary"
                    id="estado"
                    size="sm"
                    value={Array.from(filtrosTemporal.estados)} // ✅ Usar filtros temporales
                    onChange={(values) =>
                      setFiltrosTemporal((prev) => ({
                        ...prev,
                        estados: new Set(values),
                      }))
                    }
                  >
                    {FILTROS_CONFIG.estados.map((estado) => (
                      <Checkbox key={estado.value} value={estado.value}>
                        {estado.label}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    color="primary"
                    onPress={aplicarFiltrosDrawer} // ✅ Usar nueva función
                  >
                    Aplicar filtros
                  </Button>
                  <Button
                    startContent={<BrushCleaning className="w-4 h-4" />}
                    variant="flat"
                    onPress={limpiarFiltrosDrawer} // ✅ Usar nueva función
                  >
                    Limpiar
                  </Button>
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* ✅ MODALES (mantener originales) */}
      <ModalFormConductor
        conductorEditar={conductorParaEditar}
        isOpen={modalFormOpen}
        titulo={
          conductorParaEditar ? "Editar Conductor" : "Registrar Nuevo Conductor"
        }
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
          conductorParaEditar ? actualizarConductorConIA : crearConductorConIA
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
