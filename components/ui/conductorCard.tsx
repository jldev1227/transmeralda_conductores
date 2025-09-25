import { Card, CardBody } from "@heroui/card";
import {
  BanIcon,
  BedIcon,
  CircleCheck,
  HandIcon,
  HeartPulseIcon,
  TreePalmIcon,
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  UserIcon,
  FileTextIcon,
} from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";

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
  viewMode?: ViewMode;
  showDetails?: boolean;
};

// 1. ✅ COMPONENTE SEPARADO PARA LA IMAGEN - MEMO PROFUNDO
const ConductorImage = memo(
  ({
    fotoUrl,
    isLoadingPhoto,
    nombre,
    apellido,
    hasFoto,
  }: {
    fotoUrl: string | null;
    isLoadingPhoto: boolean;
    nombre: string;
    apellido: string;
    hasFoto: boolean;
  }) => {
    // Memoizar las iniciales para evitar recálculos
    const iniciales = useMemo(() => {
      return `${nombre?.charAt(0) || ""}${apellido?.charAt(0) || ""}`;
    }, [nombre, apellido]);

    if (isLoadingPhoto) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      );
    }

    if (hasFoto && fotoUrl) {
      return (
        <div
          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url('${fotoUrl}')`,
            // Optimizaciones de carga
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      );
    }

    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-4xl font-light text-gray-400 tracking-wider">
          {iniciales}
        </div>
      </div>
    );
  },
);

ConductorImage.displayName = "ConductorImage";

// 2. ✅ HOOK PERSONALIZADO PARA CACHE DE IMÁGENES
const useImageCache = () => {
  const [cache, setCache] = useState<Map<string, string>>(new Map());

  const getCachedUrl = useCallback(
    (s3Key: string, getPresignedUrl: (key: string) => Promise<string>) => {
      // Si ya está en cache, devolver inmediatamente
      if (cache.has(s3Key)) {
        return Promise.resolve(cache.get(s3Key)!);
      }

      // Si no está en cache, obtener y cachear
      return getPresignedUrl(s3Key).then((url) => {
        setCache((prev) => new Map(prev).set(s3Key, url));

        return url;
      });
    },
    [cache],
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return { getCachedUrl, clearCache };
};

// 3. ✅ COMPONENTE PRINCIPAL CON OPTIMIZACIONES
const ConductorCard = memo(
  ({
    item,
    onPress,
    isSelect,
    onSelect,
    selectedIds,
    getPresignedUrl,
    viewMode = "grid",
    showDetails = false,
  }: ConductorCardProps) => {
    const { documentosRequeridos } = useConductor();
    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
    const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
    const { getCachedUrl } = useImageCache();

    // 4. ✅ MEMOIZAR CÁLCULOS COSTOSOS
    const fotoPerfil = useMemo(() => {
      return item.documentos?.find((doc) => doc.categoria === "FOTO_PERFIL");
    }, [item.documentos]);

    const isSelected = useMemo(() => {
      return isSelect && selectedIds.includes(item.id);
    }, [isSelect, selectedIds, item.id]);

    const hasFoto = useMemo(() => {
      return fotoUrl && fotoUrl.trim() !== "";
    }, [fotoUrl]);

    // 5. ✅ CARGAR FOTO CON CACHE Y DEBOUNCE
    useEffect(() => {
      let isMounted = true;

      const cargarFotoPerfil = async () => {
        if (!fotoPerfil?.s3_key) {
          setFotoUrl(null);
          setIsLoadingPhoto(false);

          return;
        }

        setIsLoadingPhoto(true);

        try {
          // Usar cache para evitar requests duplicados
          const url = await getCachedUrl(fotoPerfil.s3_key, getPresignedUrl);

          if (isMounted) {
            setFotoUrl(url);
          }
        } catch (error) {
          console.error("Error al cargar foto de perfil:", error);
          if (isMounted) {
            setFotoUrl(null);
          }
        } finally {
          if (isMounted) {
            setIsLoadingPhoto(false);
          }
        }
      };

      cargarFotoPerfil();

      return () => {
        isMounted = false;
      };
    }, [fotoPerfil?.s3_key, getCachedUrl, getPresignedUrl]);

    // 6. ✅ MEMOIZAR ESTADO DE DOCUMENTOS
    const docStatus = useMemo(() => {
      const documentos = item.documentos || [];

      if (documentos.length === 0) {
        const faltaObligatorio = documentosRequeridos.some(
          (req: { id: string; es_obligatorio: boolean }) => req.es_obligatorio,
        );

        return {
          status: faltaObligatorio ? "danger" : "success",
          count: documentos.length,
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
        return { status: "danger", count: documentos.length };
      }

      // Verificar vigencias
      const now = new Date();
      let hasExpired = false;
      let expiresSoon = false;

      documentos.forEach((doc: any) => {
        if (doc.fecha_vigencia) {
          const vigencia = new Date(doc.fecha_vigencia);
          const diff = Math.ceil(
            (vigencia.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
              (1000 * 60 * 60 * 24),
          );

          if (diff < 0) hasExpired = true;
          if (diff <= 30 && diff > 0) expiresSoon = true;
        }
      });

      if (hasExpired) return { status: "danger", count: documentos.length };
      if (expiresSoon) return { status: "warning", count: documentos.length };

      return { status: "success", count: documentos.length };
    }, [item.documentos, documentosRequeridos]);

    // 7. ✅ MEMOIZAR ICONOS DE ESTADO
    const estadoIcon = useMemo(() => {
      const iconProps = {
        size: viewMode === "list" ? 14 : 16,
        strokeWidth: 1.5,
      };

      switch (item.estado) {
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
    }, [item.estado, viewMode]);

    const estadoColor = useMemo(
      () => getEstadoColor(item.estado),
      [item.estado],
    );

    // 8. ✅ CALLBACKS MEMOIZADOS
    const handlePress = useCallback(() => {
      if (isSelect) {
        onSelect(item.id);
      } else {
        onPress(item.id);
      }
    }, [isSelect, onSelect, onPress, item.id]);

    // 9. ✅ VISTA GRID OPTIMIZADA
    if (viewMode === "grid") {
      return (
        <Card
          isPressable
          className={`
          group relative overflow-hidden bg-white
          border border-gray-100 hover:border-gray-200
          transition-all duration-300 ease-out
          hover:shadow-lg hover:shadow-gray-100/50
          ${isSelected ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/30" : ""}
          rounded-2xl h-72
        `}
          onPress={handlePress}
        >
          {/* Imagen de fondo optimizada */}
          <div className="absolute inset-0">
            <ConductorImage
              apellido={item.apellido}
              fotoUrl={fotoUrl}
              hasFoto={!!hasFoto}
              isLoadingPhoto={isLoadingPhoto}
              nombre={item.nombre}
            />

            {/* Overlay sutil */}
            {hasFoto && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            )}
          </div>

          {/* Indicadores superiores */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            {isSelected && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <CircleCheck className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
            )}
            {!isSelected && <div />}

            {/* Estado de documentos */}
            <div className="flex items-center gap-1">
              <div
                className={`
                w-2 h-2 rounded-full
                ${
                  docStatus.status === "success"
                    ? "bg-green-400"
                    : docStatus.status === "warning"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                }
              `}
              />
              <span
                className={`
              text-xs font-medium px-2 py-1 rounded-full
              ${
                hasFoto
                  ? "text-white/90 bg-black/20 backdrop-blur-sm"
                  : "text-gray-700 bg-white/80 border border-gray-200"
              }
            `}
              >
                {docStatus.count}
              </span>
            </div>
          </div>

          {/* Información principal */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div
                  className={`
                  w-6 h-6 rounded-full flex items-center justify-center border
                  ${
                    hasFoto
                      ? "bg-white/20 backdrop-blur-sm border-white/30"
                      : "bg-gray-100 border-gray-200"
                  }
                `}
                >
                  <div className={hasFoto ? "text-white" : "text-gray-600"}>
                    {estadoIcon}
                  </div>
                </div>
                <h3
                  className={`
                font-medium text-md leading-tight text-center
                ${hasFoto ? "text-white" : "text-gray-900"}
              `}
                >
                  {item.nombre} {item.apellido}
                </h3>
              </div>

              <p
                className={`
              text-sm font-light
              ${hasFoto ? "text-white/80" : "text-gray-600"}
            `}
              >
                {item.tipo_identificacion} {item.numero_identificacion}
              </p>

              <div className="pt-1">
                <span
                  className={`
                  inline-block px-3 py-1 rounded-full text-xs font-medium border
                  ${
                    hasFoto
                      ? "bg-white/20 backdrop-blur-sm border-white/30 text-white"
                      : "bg-gray-100 border-gray-200 text-gray-700"
                  }
                `}
                >
                  {item.estado.charAt(0).toUpperCase() + item.estado.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    // 10. ✅ VISTA LISTA OPTIMIZADA
    return (
      <Card
        isPressable
        className={`
        group w-full bg-white border border-gray-100
        hover:border-gray-200 hover:shadow-md hover:shadow-gray-100/50
        transition-all duration-200 ease-out
        ${isSelected ? "ring-2 ring-blue-500/20 border-blue-200 bg-blue-50/30" : ""}
        rounded-xl overflow-hidden
      `}
        onPress={handlePress}
      >
        <CardBody className="p-0">
          <div className="flex h-20">
            {/* Avatar optimizado */}
            <div className="flex-shrink-0 w-20 h-20 relative bg-gray-50">
              <ConductorImage
                apellido={item.apellido}
                fotoUrl={fotoUrl}
                hasFoto={!!hasFoto}
                isLoadingPhoto={isLoadingPhoto}
                nombre={item.nombre}
              />

              {/* Indicador de estado */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                <div
                  className="w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: estadoColor.lightColor }}
                >
                  {estadoIcon}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="flex-1 px-4 py-3 min-w-0">
              <div className="h-full flex flex-col justify-center space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 text-sm truncate pr-2">
                    {item.nombre} {item.apellido}
                  </h3>
                  {isSelected && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <CircleCheck
                        className="w-3 h-3 text-white"
                        strokeWidth={2}
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 truncate">
                  {item.tipo_identificacion}: {item.numero_identificacion}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {item.telefono && (
                    <div className="flex items-center gap-1">
                      <PhoneIcon className="w-3 h-3" strokeWidth={1.5} />
                      <span className="truncate max-w-24">{item.telefono}</span>
                    </div>
                  )}
                  {item.sede_trabajo && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" strokeWidth={1.5} />
                      <span className="truncate max-w-20">
                        {item.sede_trabajo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sección derecha - documentos */}
            <div className="flex-shrink-0 w-16 bg-gray-50/50 flex flex-col items-center justify-center relative">
              <div
                className={`
                w-8 h-8 rounded-lg flex items-center justify-center
                ${
                  docStatus.status === "success"
                    ? "bg-green-100 text-green-600"
                    : docStatus.status === "warning"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-red-100 text-red-600"
                }
              `}
              >
                <FileTextIcon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-gray-600 mt-1">
                {docStatus.count}
              </span>
            </div>
          </div>

          {/* Footer expandible */}
          {showDetails && (
            <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Estado: {item.estado}</span>
                <span>
                  Docs: {docStatus.count}/{documentosRequeridos.length}
                </span>
                {item.fecha_ingreso && (
                  <span>
                    Ingreso:{" "}
                    {new Date(item.fecha_ingreso).toLocaleDateString("es-ES", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Barra de progreso sutil */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
            <div
              className={`
              h-full transition-all duration-300
              ${
                docStatus.status === "success"
                  ? "bg-green-400"
                  : docStatus.status === "warning"
                    ? "bg-yellow-400"
                    : "bg-red-400"
              }
            `}
              style={{
                width: `${Math.min(((item.documentos?.length || 0) / Math.max(documentosRequeridos.length, 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </CardBody>
      </Card>
    );
  },
);

ConductorCard.displayName = "ConductorCard";

export default ConductorCard;
