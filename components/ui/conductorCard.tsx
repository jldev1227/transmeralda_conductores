import { Card, CardBody } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Chip } from "@heroui/chip";
import { Badge } from "@heroui/badge";
import {
  BanIcon,
  BedIcon,
  CircleAlertIcon,
  CircleCheck,
  HandIcon,
  HeartPulseIcon,
  ShieldCheckIcon,
  TreePalmIcon,
  TruckIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import {
  Conductor,
  getEstadoColor,
  useConductor,
  EstadoConductor,
} from "@/context/ConductorContext";

type ViewMode = "grid" | "list";

type ConductorCardProps = {
  item: Conductor;
  onPress: (id: string) => void;
  isSelect: boolean;
  onSelect: (id: string) => void;
  selectedIds: string[];
  getPresignedUrl: (s3Key: string) => Promise<string>;
  viewMode?: ViewMode; // ✅ NUEVA PROP PARA MODO DE VISTA
  showDetails?: boolean; // ✅ PROP PARA MOSTRAR MÁS DETALLES EN VISTA LISTA
};

export default function ConductorCard({
  item,
  onPress,
  isSelect,
  onSelect,
  selectedIds,
  getPresignedUrl,
  viewMode = "grid", // ✅ DEFAULT A CUADRÍCULA
  showDetails = false,
}: ConductorCardProps) {
  const { documentosRequeridos } = useConductor();
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  // ✅ CARGAR FOTO DE PERFIL
  useEffect(() => {
    const cargarFotoPerfil = async () => {
      const fotoPerfil = item.documentos?.find(
        (doc) => doc.categoria === "FOTO_PERFIL",
      );
      if (fotoPerfil) {
        setIsLoadingPhoto(true);
        try {
          const url = await getPresignedUrl(fotoPerfil.s3_key);
          setFotoUrl(url);
        } catch (error) {
          console.error("Error al cargar foto de perfil:", error);
          setFotoUrl(null);
        } finally {
          setIsLoadingPhoto(false);
        }
      } else {
        setFotoUrl(null);
        setIsLoadingPhoto(false);
      }
    };
    cargarFotoPerfil();
  }, [item.documentos, getPresignedUrl]);

  // ✅ FUNCIÓN PARA OBTENER ESTADO DE DOCUMENTOS
  const getDocumentStatus = () => {
    const documentos = item.documentos || [];
    
    if (documentos.length === 0) {
      const faltaObligatorio = documentosRequeridos.some(
        (req: { id: string; es_obligatorio: boolean }) => req.es_obligatorio,
      );
      return {
        status: faltaObligatorio ? "danger" : "success",
        icon: faltaObligatorio ? CircleAlertIcon : ShieldCheckIcon,
        color: faltaObligatorio ? "text-red-500" : "text-green-500",
        bgColor: faltaObligatorio ? "bg-red-100" : "bg-green-100",
        message: faltaObligatorio ? "Faltan documentos obligatorios" : "Sin documentos requeridos",
      };
    }

    const documentosPresentes = documentos.map(
      (doc: any) => doc.tipo || doc.categoria || doc.nombre || doc.key,
    );

    const faltaObligatorio = documentosRequeridos.some(
      (req: { id: string; es_obligatorio: boolean }) =>
        req.es_obligatorio && !documentosPresentes.includes(req.id),
    );

    if (faltaObligatorio) {
      return {
        status: "danger",
        icon: CircleAlertIcon,
        color: "text-red-500",
        bgColor: "bg-red-100",
        message: "Faltan documentos obligatorios",
      };
    }

    // Verificar vigencias
    const now = new Date();
    let minDiff = Infinity;
    let hasExpired = false;

    documentos.forEach((doc: any) => {
      if (doc.fecha_vigencia) {
        const vigencia = new Date(doc.fecha_vigencia);
        const diff = Math.ceil(
          (vigencia.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24),
        );
        if (diff < 0) hasExpired = true;
        if (diff < minDiff) minDiff = diff;
      }
    });

    if (hasExpired) {
      return {
        status: "danger",
        icon: CircleAlertIcon,
        color: "text-red-500",
        bgColor: "bg-red-100",
        message: "Documentos vencidos",
      };
    }

    if (minDiff <= 30) {
      return {
        status: "warning",
        icon: CircleAlertIcon,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        message: `Vencen en ${minDiff} días`,
      };
    }

    return {
      status: "success",
      icon: ShieldCheckIcon,
      color: "text-green-500",
      bgColor: "bg-green-100",
      message: "Documentos al día",
    };
  };

  // ✅ FUNCIÓN PARA OBTENER ÍCONO DE ESTADO
  const getEstadoIcon = (estado: EstadoConductor) => {
    const iconProps = { 
      size: viewMode === "list" ? 16 : 20, 
      color: getEstadoColor(estado).color 
    };
    
    switch (estado) {
      case EstadoConductor.servicio:
        return <TruckIcon {...iconProps} />;
      case EstadoConductor.vacaciones:
        return <TreePalmIcon {...iconProps} />;
      case EstadoConductor.incapacidad:
        return <HeartPulseIcon {...iconProps} />;
      case EstadoConductor.desvinculado:
        return <BanIcon {...iconProps} />;
      case EstadoConductor.disponible:
        return <HandIcon {...iconProps} />;
      case EstadoConductor.descanso:
        return <BedIcon {...iconProps} />;
      default:
        return <UserIcon {...iconProps} />;
    }
  };

  const estadoColor = getEstadoColor(item.estado);
  const docStatus = getDocumentStatus();
  const hasFoto = fotoUrl && fotoUrl.trim() !== "";
  const isSelected = isSelect && selectedIds.includes(item.id);

  // ✅ COMPONENTE PARA VISTA DE CUADRÍCULA (ORIGINAL MEJORADO)
  if (viewMode === "grid") {
    return (
      <Card
        isPressable
        className={`${
          isSelected 
            ? "border-2 border-primary-300 !bg-primary-50/20 ring-2 ring-primary-200" 
            : "border border-gray-200 hover:border-gray-300"
        } ${
          hasFoto ? "bg-white" : "bg-gray-50"
        } shadow-sm hover:shadow-md transition-all duration-200 rounded-lg relative select-none overflow-hidden h-72`}
        style={
          hasFoto
            ? {
                backgroundImage: `url('${fotoUrl}')`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
              }
            : {}
        }
        onPress={() => {
          if (isSelect) {
            onSelect(item.id);
          } else {
            onPress(item.id);
          }
        }}
      >
        {/* Iniciales o loading */}
        {(!hasFoto || isLoadingPhoto) && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-700 text-6xl font-bold">
            {isLoadingPhoto ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
            ) : (
              <div className="text-6xl font-bold mb-12">
                {item.nombre?.charAt(0) || ""}
                {item.apellido?.charAt(0) || ""}
              </div>
            )}
          </div>
        )}

        {/* Indicador de selección */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-20">
            <div className="bg-primary-500 rounded-full p-1">
              <CircleCheck className="text-white w-5 h-5" />
            </div>
          </div>
        )}

        {/* Gradiente para mejor legibilidad del texto */}
        {hasFoto && !isLoadingPhoto && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        )}

        {/* Badge de estado de documentos */}
        <div className={`absolute top-2 right-2 w-12 h-12 rounded-full ${docStatus.bgColor} flex items-center justify-center z-10`}>
          <docStatus.icon className={`w-6 h-6 ${docStatus.color}`} />
        </div>

        {/* Badge de estado del conductor */}
        <div 
          className="absolute bottom-2 left-2 z-10 rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: estadoColor.lightColor }}
        >
          {getEstadoIcon(item.estado)}
        </div>

        {/* Información principal */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="space-y-1">
            <h3 className={`font-semibold text-lg ${
              hasFoto && !isLoadingPhoto ? "text-white" : "text-gray-900"
            }`}>
              {item.nombre} {item.apellido}
            </h3>
            <p className={`text-sm ${
              hasFoto && !isLoadingPhoto ? "text-gray-200" : "text-gray-600"
            }`}>
              {item.tipo_identificacion}: {item.numero_identificacion}
            </p>
            <Chip
              size="sm"
              style={{ 
                backgroundColor: estadoColor.lightColor, 
                color: estadoColor.color 
              }}
              variant="flat"
            >
              {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
            </Chip>
          </div>
        </div>
      </Card>
    );
  }

  // ✅ COMPONENTE PARA VISTA DE LISTA (REDISEÑADO COMPLETAMENTE)
  return (
    <Card
      isPressable
      className={`${
        isSelected 
          ? "border-2 border-primary-400 bg-primary-50/80 shadow-lg ring-2 ring-primary-200" 
          : "border border-gray-200 hover:border-primary-300 hover:shadow-md bg-white"
      } transition-all duration-200 w-full group relative overflow-hidden`}
      onPress={() => {
        if (isSelect) {
          onSelect(item.id);
        } else {
          onPress(item.id);
        }
      }}
    >
      <CardBody className="p-0">
        <div className="flex h-24">
          {/* ✅ SECCIÓN IZQUIERDA - AVATAR Y ESTADO */}
          <div className="flex-shrink-0 w-24 h-24 relative bg-gradient-to-br from-emerald-50 to-emerald-100">
            {/* Avatar o foto */}
            {hasFoto && !isLoadingPhoto ? (
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${fotoUrl}')` }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isLoadingPhoto ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
                ) : (
                  <div className="text-2xl font-bold text-emerald-600">
                    {item.nombre?.charAt(0) || ""}{item.apellido?.charAt(0) || ""}
                  </div>
                )}
              </div>
            )}
            
            {/* Overlay con gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            
            {/* Estado del conductor */}
            <div 
              className="absolute bottom-1 left-1 w-6 h-6 rounded-full flex items-center justify-center border border-white/50"
              style={{ backgroundColor: estadoColor.lightColor }}
            >
              {getEstadoIcon(item.estado)}
            </div>

            {/* Indicador de selección */}
            {isSelected && (
              <div className="absolute top-1 right-1">
                <div className="bg-primary-500 rounded-full p-1">
                  <CircleCheck className="text-white w-4 h-4" />
                </div>
              </div>
            )}
          </div>

          {/* ✅ SECCIÓN CENTRAL - INFORMACIÓN PRINCIPAL */}
          <div className="flex-1 p-4 min-w-0">
            <div className="h-full flex flex-col justify-between">
              {/* Información personal */}
              <div className="space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate pr-2">
                    {item.nombre} {item.apellido}
                  </h3>
                  <Chip
                    size="sm"
                    className="ml-2 flex-shrink-0"
                    style={{ 
                      backgroundColor: estadoColor.lightColor, 
                      color: estadoColor.color,
                      fontSize: '10px'
                    }}
                    variant="flat"
                  >
                    {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                  </Chip>
                </div>
                
                <p className="text-xs text-gray-600 truncate">
                  {item.tipo_identificacion}: {item.numero_identificacion}
                </p>
              </div>

              {/* Información de contacto */}
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                {item.telefono && (
                  <div className="flex items-center gap-1 truncate">
                    <PhoneIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.telefono}</span>
                  </div>
                )}
                {item.sede_trabajo && (
                  <div className="flex items-center gap-1 truncate">
                    <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{item.sede_trabajo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ SECCIÓN DERECHA - DOCUMENTOS Y ACCIONES */}
          <div className="flex-shrink-0 w-16 h-24 bg-gray-50 border-l border-gray-100 flex flex-col items-center justify-center relative">
            {/* Estado de documentos */}
            <div className={`w-8 h-8 rounded-full ${docStatus.bgColor} flex items-center justify-center mb-1`}>
              <docStatus.icon className={`w-4 h-4 ${docStatus.color}`} />
            </div>
            
            {/* Cantidad de documentos */}
            <div className="text-xs text-gray-600 text-center">
              <span className="font-medium">{item.documentos?.length || 0}</span>
              <div className="text-[10px] leading-tight">docs</div>
            </div>

            {/* Indicador de hover */}
            <div className="absolute inset-0 bg-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              
            </div>
          </div>
        </div>

        {/* ✅ FOOTER CON INFORMACIÓN ADICIONAL (EXPANDIBLE) */}
        {showDetails && (
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {item.email && (
                <div className="flex items-center gap-1 truncate">
                  <MailIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-gray-600">{item.email}</span>
                </div>
              )}
              {item.fecha_ingreso && (
                <div className="flex items-center gap-1 truncate">
                  <CalendarIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-gray-600">
                    {new Date(item.fecha_ingreso).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 truncate">
                <FileTextIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate text-gray-600">{docStatus.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* ✅ BARRA DE PROGRESO DE DOCUMENTOS */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div 
            className={`h-full transition-all duration-300 ${
              docStatus.status === 'success' ? 'bg-green-500' :
              docStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.min(((item.documentos?.length || 0) / Math.max(documentosRequeridos.length, 1)) * 100, 100)}%` 
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}