"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AxiosError, isAxiosError } from "axios";
import { apiClient } from "@/config/apiClient";
import LoadingPage from "@/components/ui/loadingPage";
import { SortDescriptor } from "@/components/ui/customTable";

// Enumeraciones
export enum SedeTrabajo {
  YOPAL = 'Yopal',
  VILLANUEVA = 'Villanueva',
  TAURAMENA = 'Tauramena'
}

export enum EstadoConductor {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  RETIRADO = 'RETIRADO'
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

export interface ActualizarConductorRequest extends Partial<CrearConductorRequest> {}

export interface ConductorAuthResult {
  conductor: Omit<Conductor, 'password'>;
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
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        dot: 'bg-green-500',
        badge: 'bg-green-100 text-green-800',
        color: '#16a34a',
        lightColor: '#dcfce7'
      };
    case EstadoConductor.INACTIVO:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        dot: 'bg-gray-500',
        badge: 'bg-gray-100 text-gray-800',
        color: '#71717a',
        lightColor: '#f4f4f5'
      };
    case EstadoConductor.SUSPENDIDO:
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500',
        badge: 'bg-yellow-100 text-yellow-800',
        color: '#ca8a04',
        lightColor: '#fef9c3'
      };
    case EstadoConductor.RETIRADO:
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        dot: 'bg-red-500',
        badge: 'bg-red-100 text-red-800',
        color: '#dc2626',
        lightColor: '#fee2e2'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        dot: 'bg-gray-500',
        badge: 'bg-gray-100 text-gray-800',
        color: '#71717a',
        lightColor: '#f4f4f5'
      };
  }
};

export const getEstadoLabel = (estado: EstadoConductor): string => {
  switch (estado) {
    case EstadoConductor.ACTIVO:
      return 'Activo';
    case EstadoConductor.INACTIVO:
      return 'Inactivo';
    case EstadoConductor.SUSPENDIDO:
      return 'Suspendido';
    case EstadoConductor.RETIRADO:
      return 'Retirado';
    default:
      return 'Desconocido';
  }
};

// Definición del contexto
interface ConductorContextType {
  // Estado
  conductoresState: ConductoresState;
  currentConductor: Conductor | null;
  loading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;
  
  // Operaciones CRUD
  fetchConductores: (page?: number) => Promise<void>;
  getConductor: (id: string) => Promise<Conductor | null>;
  crearConductor: (data: CrearConductorRequest) => Promise<Conductor | null>;
  actualizarConductor: (id: string, data: ActualizarConductorRequest) => Promise<Conductor | null>;
  eliminarConductor: (id: string) => Promise<boolean>;
  
  // Funciones de utilidad
  handlePageChange: (page: number) => void;
  handleSortChange: (descriptor: SortDescriptor) => void;
  clearError: () => void;
  setCurrentConductor: (conductor: Conductor | null) => void;
}

// Valor predeterminado para el contexto
const defaultConductorContext: ConductorContextType = {
  conductoresState: {
    data: [],
    count: 0,
    totalPages: 1,
    currentPage: 1
  },
  currentConductor: null,
  loading: false,
  error: null,
  validationErrors: null,

  fetchConductores: async () => {},
  getConductor: async () => null,
  crearConductor: async () => null,
  actualizarConductor: async () => null,
  eliminarConductor: async () => false,
  
  handlePageChange: () => {},
  handleSortChange: () => {},
  clearError: () => {},
  setCurrentConductor: () => {},
};

// Crear el contexto
const ConductorContext = createContext<ConductorContextType>(defaultConductorContext);

// Proveedor del contexto
export const ConductorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estados
  const [conductoresState, setConductoresState] = useState<ConductoresState>({
    data: [],
    count: 0,
    totalPages: 1,
    currentPage: 1
  });
  const [currentConductor, setCurrentConductor] = useState<Conductor | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[] | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
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
  const fetchConductores = async (page: number = conductoresState.currentPage) => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.get<ApiResponse<Conductor[]>>("/api/conductores", {
        params: {
          page,
          sort: sortDescriptor.column,
          order: sortDescriptor.direction
        }
      });

      if (response.data && response.data.success) {
        setConductoresState({
          data: response.data.data,
          count: response.data.count || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1
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
      const response = await apiClient.get<ApiResponse<Conductor>>(`/api/conductores/${id}`);
      
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

  const crearConductor = async (data: CrearConductorRequest): Promise<Conductor | null> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.post<ApiResponse<Conductor>>("/api/conductores", data);
      
      if (response.data && response.data.success) {
        // Actualizar la lista de conductores después de crear uno nuevo
        fetchConductores(1);
        return response.data.data;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al crear el conductor");
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const actualizarConductor = async (id: string, data: ActualizarConductorRequest): Promise<Conductor | null> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiClient.put<ApiResponse<Conductor>>(`/api/conductores/${id}`, data);
      
      if (response.data && response.data.success) {
        const conductorActualizado = response.data.data;
        
        // Actualizar el currentConductor si corresponde al mismo ID
        if (currentConductor && currentConductor.id === id) {
          setCurrentConductor(conductorActualizado);
        }
        
        // Actualizar la lista de conductores
        fetchConductores(conductoresState.currentPage);
        
        return conductorActualizado;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al actualizar el conductor");
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
      const response = await apiClient.delete<ApiResponse<any>>(`/api/conductores/${id}`);
      
      if (response.data && response.data.success) {
        // Si el conductor eliminado es el actual, limpiarlo
        if (currentConductor && currentConductor.id === id) {
          setCurrentConductor(null);
        }
        
        // Refrescar la lista después de eliminar
        fetchConductores(conductoresState.currentPage);
        
        return true;
      } else {
        throw new Error("Respuesta no exitosa del servidor");
      }
    } catch (err) {
      const errorMessage = handleApiError(err, "Error al eliminar el conductor");
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Funciones de utilidad
  const handlePageChange = (page: number) => {
    setConductoresState(prevState => ({
      ...prevState,
      currentPage: page
    }));
  };

  const handleSortChange = (descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
    setConductoresState(prevState => ({
      ...prevState,
      currentPage: 1
    }));
    fetchConductores(1);
  };

  // Efectos
  // Efecto que se ejecuta cuando cambia la página actual
  useEffect(() => {
    fetchConductores(conductoresState.currentPage);
  }, [conductoresState.currentPage]);

  // Efecto de inicialización
  useEffect(() => {
    fetchConductores(1);

    // Establecer un tiempo máximo para la inicialización
    const timeoutId = setTimeout(() => {
      if (initializing) {
        setInitializing(false);
      }
    }, 5000); // 5 segundos máximo de espera

    return () => clearTimeout(timeoutId);
  }, []);

  // Contexto que será proporcionado
  const conductorContext: ConductorContextType = {
    conductoresState,
    currentConductor,
    loading,
    error,
    validationErrors,

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
    throw new Error("useConductor debe ser usado dentro de un ConductorProvider");
  }

  return context;
};

export default ConductorProvider;