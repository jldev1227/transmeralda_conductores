import { Card } from "@heroui/card";
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
} from "lucide-react";
import React, { useState, useEffect } from "react";

import {
  Conductor,
  getEstadoColor,
  useConductor,
} from "@/context/ConductorContext";

type ConductorCardProps = {
  item: Conductor;
  onPress: (id: string) => void;
  isSelect: boolean;
  onSelect: (id: string) => void;
  selectedIds: string[];
  getPresignedUrl: (s3Key: string) => Promise<string>; // Función para obtener URL presignada
};

export default function ConductorCard({
  item,
  onPress,
  isSelect,
  onSelect,
  selectedIds,
  getPresignedUrl,
}: ConductorCardProps) {
  const { documentosRequeridos } = useConductor();
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  // Cargar foto de perfil cuando cambian los documentos
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

  // Devuelve el ícono según los documentos requeridos y los del conductor
  const getIconByDocs = (documentos: any[] = []) => {
    // Si no hay documentos del conductor
    if (!documentos || documentos.length === 0) {
      // Si hay algún documento obligatorio requerido, mostrar danger
      const faltaObligatorio = documentosRequeridos.some(
        (req: { id: string; es_obligatorio: boolean }) => req.es_obligatorio,
      );

      if (faltaObligatorio) {
        return <CircleAlertIcon className="text-red-500" />;
      }

      // Si no hay obligatorios, mostrar shield
      return <ShieldCheckIcon className="text-green-500" />;
    }

    // Lista de ids de documentos presentes
    const documentosPresentes = documentos.map(
      (doc: any) => doc.tipo || doc.categoria || doc.nombre || doc.key,
    );

    // Falta algún documento obligatorio
    const faltaObligatorio = documentosRequeridos.some(
      (req: { id: string; es_obligatorio: boolean }) =>
        req.es_obligatorio && !documentosPresentes.includes(req.id),
    );

    if (faltaObligatorio) {
      return <CircleAlertIcon className="text-red-500" />;
    }

    // Falta algún documento NO obligatorio
    const faltaNoObligatorio = documentosRequeridos.some(
      (req: { id: string; es_obligatorio: boolean }) =>
        !req.es_obligatorio && !documentosPresentes.includes(req.id),
    );

    if (faltaNoObligatorio) {
      return <ShieldCheckIcon className="text-green-500" />;
    }

    // Todos los documentos requeridos presentes
    return <ShieldCheckIcon className="text-green-500" />;
  };

  // Determinar si hay foto para mostrar
  const hasFoto = fotoUrl && fotoUrl.trim() !== "";

  return (
    <Card
      isPressable
      className={`${isSelect && selectedIds.includes(item.id) ? "border-2 border-primary-300 !bg-primary-50/20" : ""} ${hasFoto ? "bg-white" : "bg-gray-50"} shadow-sm rounded-md relative select-none overflow-hidden h-72`}
      style={
        hasFoto
          ? {
              backgroundImage: `url('${fotoUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "top",
            }
          : {}
      }
      onPress={() => onPress(item.id)}
    >
      {/* Mostrar iniciales cuando no hay imagen o está cargando */}
      {(!hasFoto || isLoadingPhoto) && (
        <div className="absolute inset-0 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 text-6xl font-bold">
          {isLoadingPhoto ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
          ) : (
            <>
              {item.nombre.charAt(0)}
              {item.apellido.charAt(0)}
            </>
          )}
        </div>
      )}

      {isSelect && selectedIds.includes(item.id) && (
        <div className="absolute p-1 rounded-full z-10 bottom-2 left-2">
          <CircleCheck className="text-primary" />
        </div>
      )}

      {/* Gradiente solo cuando hay imagen */}
      {hasFoto && !isLoadingPhoto && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.4) 10%, rgba(0,0,0,0) 70%)",
            }}
          />
        </div>
      )}

      <div
        className={`absolute w-32 h-32 -top-14 -right-16 rounded-l-full ${(() => {
          // Usa los documentos requeridos del contexto
          const documentosPresentes =
            item.documentos?.map(
              (doc: any) => doc.tipo || doc.categoria || doc.nombre || doc.key,
            ) || [];
          const faltanRequeridos = documentosRequeridos.some(
            (req: { id: string; es_obligatorio: boolean }) =>
              req.es_obligatorio && !documentosPresentes.includes(req.id),
          );

          if (!item.documentos?.length || faltanRequeridos) return "bg-red-100";

          const now = new Date();
          let minDiff = Infinity;

          item.documentos.forEach((doc: any) => {
            if (doc.fecha_vigencia) {
              const vigencia = new Date(doc.fecha_vigencia);
              const diff = Math.ceil(
                (vigencia.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) /
                  (1000 * 60 * 60 * 24),
              );

              if (diff < minDiff) minDiff = diff;
            }
          });
          if (minDiff < 0) return "bg-red-100";
          if (minDiff <= 30) return "bg-yellow-100";

          return "bg-green-100";
        })()}`}
      >
        <div
          className="absolute top-20 right-6 w-20 h-20"
          style={{ transform: "translateX(0px) translateY(-8px)" }}
        >
          {getIconByDocs(item.documentos)}
        </div>
      </div>

      <div
        className="absolute w-32 h-32 -bottom-16 -left-16 rounded-r-full"
        style={{ backgroundColor: getEstadoColor(item.estado).lightColor }}
      >
        <div className="absolute left-12 w-20 h-20 flex items-center justify-center">
          {item.estado === "servicio" ? (
            <TruckIcon color={getEstadoColor(item.estado).color} />
          ) : item.estado === "vacaciones" ? (
            <TreePalmIcon color={getEstadoColor(item.estado).color} />
          ) : item.estado === "incapacidad" ? (
            <HeartPulseIcon color={getEstadoColor(item.estado).color} />
          ) : item.estado === "desvinculado" ? (
            <BanIcon color={getEstadoColor(item.estado).color} />
          ) : item.estado === "disponible" ? (
            <HandIcon color={getEstadoColor(item.estado).color} />
          ) : item.estado === "descanso" ? (
            <BedIcon color={getEstadoColor(item.estado).color} />
          ) : (
            <span className="text-xs text-gray-500">Estado desconocido</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 p-6 h-full justify-end relative z-10">
        <div className="space-y-2">
          <p
            className={`text-right ${hasFoto && !isLoadingPhoto ? "text-white" : "text-gray-800"}`}
          >
            {item.nombre} {item.apellido}
          </p>
          <p
            className={`text-right ${hasFoto && !isLoadingPhoto ? "text-white" : "text-gray-600"}`}
          >
            {item.tipo_identificacion}: {item.numero_identificacion}
          </p>
        </div>
      </div>
    </Card>
  );
}
