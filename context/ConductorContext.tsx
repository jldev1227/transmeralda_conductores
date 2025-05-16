"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { AxiosError, isAxiosError } from "axios";
import { addToast } from "@heroui/toast";

import { useAuth } from "./AuthContext";

import { apiClient } from "@/config/apiClient";
import LoadingPage from "@/components/ui/loadingPage";
import { SortDescriptor } from "@/components/ui/customTable";
import socketService from "@/services/socketService";

// Enumeraciones
export enum SedeTrabajo {
  YOPAL = "Yopal",
  VILLANUEVA = "Villanueva",
  TAURAMENA = "Tauramena",
}

export enum EstadoConductor {
  ACTIVO = "ACTIVO",
  INACTIVO = "INACTIVO",
  SUSPENDIDO = "SUSPENDIDO",
  RETIRADO = "RETIRADO",
}

// Interfaces
export interface PermisosConductor {
  verViajes: boolean;
  verMantenimientos: boolean;
  verDocumentos: boolean;
  actualizarPerfil: boolean;
}

export interface Conductor {
  // Campos principales e identificación
  id: string;
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;

  // Información de contacto
  email: string;
  telefono: string;
  direccion?: string;

  // Información de seguridad
  password: string;

  // Información personal
  fotoUrl?: string;
  fecha_nacimiento?: string; // Formato: YYYY-MM-DD
  genero?: string;

  // Información laboral
  cargo: string;
  fecha_ingreso: string; // Formato: YYYY-MM-DD
  salario_base: number;
  estado: EstadoConductor;
  tipo_contrato?: string;
  sede_trabajo?: SedeTrabajo;

  // Seguridad social
  eps?: string;
  fondo_pension?: string;
  arl?: string;

  // Documentos de conducción
  licencia_conduccion?: string;
  categoria_licencia?: string;
  vencimiento_licencia?: string; // Formato: YYYY-MM-DD

  // Control de acceso
  ultimo_acceso?: Date;
  permisos: PermisosConductor;

  // Campos de auditoría
  createdAt?: Date;
  updatedAt?: Date;
  creado_por_id?: string;
}

export interface CrearConductorRequest {
  nombre: string;
  apellido: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  email: string;
  telefono: string;
  password: string;
  cargo?: string;
  fecha_ingreso: string;
  salario_base: number;
  estado?: EstadoConductor;
  fotoUrl?: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  eps?: string;
  fondo_pension?: string;
  arl?: string;
  tipo_contrato?: string;
  licencia_conduccion?: string;
  categoria_licencia?: string;
  vencimiento_licencia?: string;
  sede_trabajo?: SedeTrabajo;
  permisos?: Partial<PermisosConductor>;
}

export interface BusquedaParams {
  page?: number;
  limit?: number;
  search?: string; // Para búsqueda general (nombre, apellido, correo, etc.)
  estado?: EstadoConductor | EstadoConductor[];
  sede_trabajo?: SedeTrabajo | SedeTrabajo[];
  tipo_identificacion?: string | string[];
  tipo_contrato?: string | string[];
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface ActualizarConductorRequest
  extends Partial<CrearConductorRequest> {}

export interface ConductorAuthResult {
  conductor: Omit<Conductor, "password">;
  token: string;
}

export interface ConductorFiltros {
  nombre?: string;
  apellido?: string;
  numero_identificacion?: string;
  email?: string;
  estado?: EstadoConductor;
  sede_trabajo?: SedeTrabajo;
  cargo?: string;
  tipo_contrato?: string;
}

export interface ConductorConRelaciones extends Conductor {
  vehiculos?: any[];
  liquidaciones?: any[];
  anticipos?: any[];
  documentos?: any[];
  creadoPor?: any;
}

export interface ValidationError {
  campo: string;
  mensaje: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
  errores?: ValidationError[];
}

export interface ConductoresState {
  data: Conductor[];
  count: number;
  totalPages: number;
  currentPage: number;
}

// Funciones utilitarias
export const getEstadoColor = (estado: EstadoConductor) => {
  switch (estado) {
    case EstadoConductor.ACTIVO:
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
        dot: "bg-green-500",
        badge: "bg-green-100 text-green-800",
        color: "#16a34a",
        lightColor: "#dcfce7",
      };
    case EstadoConductor.INACTIVO:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        dot: "bg-gray-500",
        badge: "bg-gray-100 text-gray-800",
        color: "#71717a",
        lightColor: "#f4f4f5",
      };
    case EstadoConductor.SUSPENDIDO:
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-200",
        dot: "bg-yellow-500",
        badge: "bg-yellow-100 text-yellow-800",
        color: "#ca8a04",
        lightColor: "#fef9c3",
      };
    case EstadoConductor.RETIRADO:
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
        dot: "bg-red-500",
        badge: "bg-red-100 text-red-800",
        color: "#dc2626",
        lightColor: "#fee2e2",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
        dot: "bg-gray-500",
        badge: "bg-gray-100 text-gray-800",
        color: "#71717a",
        lightColor: "#f4f4f5",
      };
  }
};

export const getEstadoLabel = (estado: EstadoConductor): string => {
  switch (estado) {
    case EstadoConductor.ACTIVO:
      return "Activo";
    case EstadoConductor.INACTIVO:
      return "Inactivo";
    case EstadoConductor.SUSPENDIDO:
      return "Suspendido";
    case EstadoConductor.RETIRADO:
      return "Retirado";
    default:
      return "Desconocido";
  }
};

export interface SocketEventLog {
  eventName: string;
  data: any;
  timestamp: Date;
}

// Definición del contexto
interface ConductorContextType {
  // Estado
  conductoresState: ConductoresState;
  currentConductor: Conductor | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;

  // Operaciones CRUD
  fetchConductores: (paramsBusqueda: BusquedaParams) => Promise<void>;
  getConductor: (id: string) => Promise<Conductor | null>;
  crearConductor: (data: CrearConductorRequest) => Promise<Conductor | null>;
  actualizarConductor: (
    id: string,
    data: ActualizarConductorRequest,
  ) => Promise<Conductor | null>;
  eliminarConductor: (id: string) => Promise<boolean>;

  // Funciones de utilidad
  handlePageChange: (page: number) => void;
  handleSortChange: (descriptor: SortDescriptor) => void;
  clearError: () => void;
  setCurrentConductor: (conductor: Conductor | null) => void;

  // Propiedades para Socket.IO
  socketConnected: boolean;
  socketEventLogs: SocketEventLog[];
  clearSocketEventLogs: () => void;
  connectSocket?: (userId: string) => void;
  disconnectSocket?: () => void;
}

// Crear el contexto
const ConductorContext = createContext<ConductorContextType | undefined>(
  undefined,
);

// Proveedor del contexto
export const ConductorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Estados
  const [conductoresState, setConductoresState] = useState<ConductoresState>({
    data: [],
    count: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [currentConductor, setCurrentConductor] = useState<Conductor | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    ValidationError[] | null
  >(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Estado para Socket.IO
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [socketEventLogs, setSocketEventLogs] = useState<SocketEventLog[]>([]);
  const { user } = useAuth();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "nombre",
    direction: "ascending",
  });

  // Función para manejar errores de Axios
  const handleApiError = (err: unknown, defaultMessage: string): string => {
    if (isAxiosError(err)) {
      const axiosError = err as AxiosError<ApiResponse<any>>;

      if (axiosError.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        const statusCode = axiosError.response.status;
        const errorMessage = axiosError.response.data?.message;
        const validationErrors = axiosError.response.data?.errores;

        if (validationErrors) {
          setValidationErrors(validationErrors);
        }

        if (statusCode === 401) {
          return "Sesión expirada o usuario no autenticado";
        } else if (statusCode === 403) {
          return "No tienes permisos para realizar esta acción";
        } else if (statusCode === 404) {
          return "Conductor no encontrado";
        } else {
          return errorMessage || `Error en la petición (${statusCode})`;
        }
      } else if (axiosError.request) {
        // La petición fue hecha pero no se recibió respuesta
        return "No se pudo conectar con el servidor. Verifica tu conexión a internet";
      } else {
        // Error al configurar la petición
        return `Error al configurar la petición: ${axiosError.message}`;
      }
    } else {
      // Error que no es de Axios
      return `${defaultMessage}: ${(err as Error).message}`;
    }
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
    setValidationErrors(null);
  };

  // Operaciones CRUD
  const fetchConductores = async (paramsBusqueda: BusquedaParams = {}) => {
    setLoading(true);
    clearError();

    try {
      // Prepara los parámetros básicos
      const params: any = {
        page: paramsBusqueda.page || conductoresState.currentPage,
        limit: paramsBusqueda.limit || 10,
        sort: paramsBusqueda.sort || sortDescriptor.column,
        order: paramsBusqueda.order || sortDescriptor.direction,
      };

      // Añade el término de búsqueda si existe
      if (paramsBusqueda.search) {
        params.search = paramsBusqueda.search;
      }

      // Añade filtros de estado
      if (paramsBusqueda.estado) {
        if (Array.isArray(paramsBusqueda.estado)) {
          params.estado = paramsBusqueda.estado.join(",");
        } else {
          params.estado = paramsBusqueda.estado;
        }
      }

      // Añade filtros de sede
      if (paramsBusqueda.sede_trabajo) {
        if (Array.isArray(paramsBusqueda.sede_trabajo)) {
          params.sede_trabajo = paramsBusqueda.sede_trabajo.join(",");
        } else {
          params.sede_trabajo = paramsBusqueda.sede_trabajo;
        }
      }

      // Añade filtros de tipo de identificación
      if (paramsBusqueda.tipo_identificacion) {
        if (Array.isArray(paramsBusqueda.tipo_identificacion)) {
          params.tipo_identificacion =
            paramsBusqueda.tipo_identificacion.join(",");
        } else {
          params.tipo_identificacion = paramsBusqueda.tipo_identificacion;
        }
      }

      // Añade filtros de tipo de contrato
      if (paramsBusqueda.tipo_contrato) {
        if (Array.isArray(paramsBusqueda.tipo_contrato)) {
          params.tipo_contrato = paramsBusqueda.tipo_contrato.join(",");
        } else {
          params.tipo_contrato = paramsBusqueda.tipo_contrato;
        }
      }

      const response = await apiClient.get<ApiResponse<Conductor[]>>(
        "/api/conductores",
        {
          params,
        },
      );

      if (response.data && response.data.success) {
        setConductoresState({
          data: response.data.data,
          count: response.data.count || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: parseInt(params.page) || 1,
        });

        return;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener conductores");

      setError(errorMessage);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  const getConductor = async (id: string): Promise<Conductor | null> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.get<ApiResponse<Conductor>>(
        `/api/conductores/${id}`,
      );

      if (response.data && response.data.success) {
        const conductor = response.data.data;

        setCurrentConductor(conductor);

        return conductor;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al obtener el conductor");

      setError(errorMessage);

      return null;
    } finally {
      setLoading(false);
    }
  };

  const crearConductor = async (
    data: CrearConductorRequest,
  ): Promise<Conductor> => {
    // Cambiado el tipo de retorno para no permitir null
    clearError();

    try {
      const response = await apiClient.post<ApiResponse<Conductor>>(
        "/api/conductores",
        data,
      );

      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Error al crear conductor");
      }
    } catch (err: any) {
      // Definir un mensaje de error predeterminado
      let errorTitle = "Error al crear conductor";
      let errorDescription = "Ha ocurrido un error inesperado.";

      // Manejar errores específicos por código de estado
      if (err.response) {
        switch (err.response.status) {
          case 400: // Bad Request
            errorTitle = "Error en los datos enviados";

            // Verificar si tenemos detalles específicos del error en la respuesta
            if (err.response.data && err.response.data.message) {
              errorDescription = err.response.data.message;
            }

            // Verificar si hay errores específicos en formato español (errores)
            if (
              err.response.data &&
              err.response.data.errores &&
              Array.isArray(err.response.data.errores)
            ) {
              // Mapeo de nombres de campos para mensajes más amigables
              const fieldLabels: Record<string, string> = {
                nombre: "Nombre",
                apellido: "Apellido",
                tipo_identificacion: "Tipo de identificación",
                numero_identificacion: "Número de identificación",
                email: "Correo electrónico",
                telefono: "Teléfono",
                password: "Contraseña",
                // Añadir más campos según sea necesario
              };

              // Mostrar cada error de validación como un toast separado
              let errorShown = false;

              err.response.data.errores.forEach(
                (error: { campo: string; mensaje: string }) => {
                  errorShown = true;
                  const fieldLabel = fieldLabels[error.campo] || error.campo;

                  // Personalizar mensajes para errores comunes
                  let customMessage = error.mensaje;

                  if (error.mensaje.includes("must be unique")) {
                    customMessage = `Este ${fieldLabel.toLowerCase()} ya está registrado en el sistema`;
                  }

                  addToast({
                    title: `Error en ${fieldLabel}`,
                    description: customMessage,
                    color: "danger",
                  });
                },
              );

              // IMPORTANTE: Ya no hacemos return null aquí
              // Solo actualizamos el mensaje de error general
              if (errorShown) {
                setError(errorDescription);
                // Arrojamos un nuevo error en lugar de retornar null
                throw new Error("Error de validación en los campos");
              }
            }

            // Verificar errores específicos comunes en el mensaje
            if (
              errorDescription.includes("unique") ||
              errorDescription.includes("duplicado")
            ) {
              // Error genérico de duplicación
              errorTitle = "Datos duplicados";
              errorDescription =
                "Algunos de los datos ingresados ya existen en el sistema.";

              // Intentar ser más específico basado en el mensaje completo
              if (
                errorDescription.toLowerCase().includes("email") ||
                errorDescription.toLowerCase().includes("correo")
              ) {
                errorTitle = "Correo electrónico duplicado";
                errorDescription =
                  "Ya existe un conductor con este correo electrónico.";
              } else if (
                errorDescription.toLowerCase().includes("identificacion") ||
                errorDescription.toLowerCase().includes("identificación")
              ) {
                errorTitle = "Identificación duplicada";
                errorDescription =
                  "Ya existe un conductor con este número de identificación.";
              }
            }
            break;

          // Los demás casos igual que antes...
        }
      } else if (err.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        errorTitle = "Error de conexión";
        errorDescription =
          "No se pudo conectar con el servidor. Verifica tu conexión a internet.";
      } else {
        // Algo sucedió al configurar la solicitud que desencadenó un error
        errorTitle = "Error en la solicitud";
        errorDescription =
          err.message || "Ha ocurrido un error al procesar la solicitud.";
      }

      // Guardar el mensaje de error para referencia en el componente
      setError(errorDescription);

      // Mostrar el toast con el mensaje de error
      addToast({
        title: errorTitle,
        description: errorDescription,
        color: "danger",
      });

      // Registrar el error en la consola para depuración
      console.error("Error detallado:", err);

      // Siempre lanzamos el error, nunca retornamos null
      throw err;
    }
    // Ya no necesitamos un bloque finally aquí, el setLoading lo manejamos en guardarConductor
  };
  
  const actualizarConductor = async (
    id: string,
    data: ActualizarConductorRequest,
  ): Promise<Conductor | null> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.put<ApiResponse<Conductor>>(
        `/api/conductores/${id}`,
        data,
      );

      if (response.data && response.data.success) {
        const conductorActualizado = response.data.data;

        // Actualizar el currentConductor si corresponde al mismo ID
        if (currentConductor && currentConductor.id === id) {
          setCurrentConductor(conductorActualizado);
        }

        const params: BusquedaParams = {
          page: conductoresState.currentPage,
        };

        // Actualizar la lista de conductores
        fetchConductores(params);

        return conductorActualizado;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(
        err,
        "Error al actualizar el conductor",
      );

      setError(errorMessage);

      return null;
    } finally {
      setLoading(false);
    }
  };

  const eliminarConductor = async (id: string): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.delete<ApiResponse<any>>(
        `/api/conductores/${id}`,
      );

      if (response.data && response.data.success) {
        // Si el conductor eliminado es el actual, limpiarlo
        if (currentConductor && currentConductor.id === id) {
          setCurrentConductor(null);
        }

        const params: BusquedaParams = {
          page: conductoresState.currentPage,
        };

        // Refrescar la lista después de eliminar
        fetchConductores(params);

        return true;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(
        err,
        "Error al eliminar el conductor",
      );

      setError(errorMessage);

      return false;
    } finally {
      setLoading(false);
    }
  };

  // Funciones de utilidad
  const handlePageChange = (page: number) => {
    setConductoresState((prevState) => ({
      ...prevState,
      currentPage: page,
    }));
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setConductoresState((prevState) => ({
      ...prevState,
      currentPage: 1,
    }));

    const params: BusquedaParams = {
      page: conductoresState.currentPage,
    };

    fetchConductores(params);
  };

  // Efecto que se ejecuta cuando cambia la página actual
  useEffect(() => {
    const params: BusquedaParams = {
      page: conductoresState.currentPage,
    };

    fetchConductores(params);
  }, [conductoresState.currentPage]);

  // Efecto de inicialización
  useEffect(() => {
    const params: BusquedaParams = {
      page: conductoresState.currentPage,
    };

    fetchConductores(params);

    // Establecer un tiempo máximo para la inicialización
    const timeoutId = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
      }
    }, 5000); // 5 segundos máximo de espera

    return () => clearTimeout(timeoutId);
  }, []);

  // Inicializar Socket.IO cuando el usuario esté autenticado
  useEffect(() => {
    if (user?.id) {
      // Conectar socket
      socketService.connect(user.id);

      // Verificar conexión inicial y configurar manejo de eventos de conexión
      const checkConnection = () => {
        const isConnected = socketService.isConnected();

        setSocketConnected(isConnected);
      };

      // Verificar estado inicial
      checkConnection();

      // Manejar eventos de conexión
      const handleConnect = () => {
        setSocketConnected(true);
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
        addToast({
          title: "Error",
          description: "Desconectado de actualizaciones en tiempo real",
          color: "danger",
        });
      };

      const handleConductorCreado = (data: Conductor) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "conductor:creado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Nuevo Conductor",
          description: `Se ha creado un nuevo conductor: ${data.nombre} ${data.apellido}`,
          color: "success",
        });
      };

      const handleConductorActualizado = (data: Conductor) => {
        setSocketEventLogs((prev) => [
          ...prev,
          {
            eventName: "conductor:actualizado",
            data,
            timestamp: new Date(),
          },
        ]);

        addToast({
          title: "Conductor Actualizado",
          description: `Se ha actualizado la información del conductor: ${data.nombre} ${data.apellido}`,
          color: "primary",
        });
      };

      // Registrar manejadores de eventos de conexión
      socketService.on("connect", handleConnect);
      socketService.on("disconnect", handleDisconnect);

      // Registrar manejadores de eventos de conductores
      socketService.on("conductor:creado", handleConductorCreado);
      socketService.on("conductor:actualizado", handleConductorActualizado);

      return () => {
        // Limpiar al desmontar
        socketService.off("connect");
        socketService.off("disconnect");

        // Limpiar manejadores de eventos de conductores
        socketService.off("conductor:creado");
        socketService.off("conductor:actualizado");
      };
    }
  }, [user?.id]);

  // Función para limpiar el registro de eventos de socket
  const clearSocketEventLogs = useCallback(() => {
    setSocketEventLogs([]);
  }, []);

  // Contexto que será proporcionado
  const conductorContext: ConductorContextType = {
    conductoresState,
    currentConductor,
    loading,
    error,
    validationErrors,

    // Propiedades para Socket.IO
    socketConnected,
    socketEventLogs,
    clearSocketEventLogs,

    fetchConductores,
    getConductor,
    crearConductor,
    actualizarConductor,
    eliminarConductor,

    handlePageChange,
    handleSortChange,
    clearError,
    setCurrentConductor,
  };

  // Mostrar pantalla de carga durante la inicialización
  if (initializing) {
    return <LoadingPage>Cargando Conductores</LoadingPage>;
  }

  return (
    <ConductorContext.Provider value={conductorContext}>
      {children}
    </ConductorContext.Provider>
  );
};

// Hook para usar el contexto
export const useConductor = (): ConductorContextType => {
  const context = useContext(ConductorContext);

  if (!context) {
    throw new Error(
      "useConductor debe ser usado dentro de un ConductorProvider",
    );
  }

  return context;
};

export default ConductorProvider;
