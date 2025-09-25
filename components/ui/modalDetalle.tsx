import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Tabs, Tab } from "@heroui/tabs";
import { Chip } from "@heroui/chip";
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  Shield,
  FileText,
  Eye,
  Download,
  Edit3,
} from "lucide-react";
import { Image } from "@heroui/image";

import RegistroModificaciones from "./registroModificaciones";

import {
  Conductor,
  Documento,
  getEstadoColor,
  getEstadoLabel,
} from "@/context/ConductorContext";
import { apiClient } from "@/config/apiClient";

interface ModalDetalleConductorProps {
  isOpen: boolean;
  onClose: () => void;
  conductor: Conductor | null;
  onEdit?: () => void;
}

const ModalDetalleConductor: React.FC<ModalDetalleConductorProps> = ({
  isOpen,
  onClose,
  conductor,
  onEdit,
}) => {
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!conductor) {
      setFotoUrl(null);

      return;
    }

    const cargarFotoPerfil = async () => {
      const fotoPerfil = conductor.documentos?.find(
        (doc) => doc.categoria === "FOTO_PERFIL",
      );

      if (fotoPerfil) {
        try {
          const url = await getPresignedUrl(fotoPerfil.s3_key);

          setFotoUrl(url);
        } catch (error) {
          console.error("Error al cargar foto de perfil:", error);
          setFotoUrl(null);
        }
      } else {
        setFotoUrl(null);
      }
    };

    cargarFotoPerfil();
  }, [conductor]);

  if (!conductor) {
    return null;
  }

  const estadoColor = getEstadoColor(conductor.estado);

  // Función para formatear fecha
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "No especificada";
    const date = new Date(fecha);

    date.setDate(date.getDate() + 1);

    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Función para formatear dinero
  const formatearDinero = (valor?: number) => {
    if (!valor && valor !== 0) return "No especificado";

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor);
  };

  // Función para formatear categoría de documento
  const formatearCategoria = (categoria: string) => {
    const categorias: { [key: string]: string } = {
      CEDULA: "Cédula de Ciudadanía",
      LICENCIA: "Licencia de Conducción",
      FOTO_PERFIL: "Foto de Perfil",
      CERTIFICADO_MEDICO: "Certificado Médico",
      ANTECEDENTES_PENALES: "Antecedentes Penales",
      CARTA_RECOMENDACION: "Carta de Recomendación",
      CERTIFICADO_EXPERIENCIA: "Certificado de Experiencia",
      FOTO: "Fotografía",
      CONTRATO: "Contrato Laboral",
    };

    return categorias[categoria] || categoria;
  };

  // Función para formatear tamaño
  const formatearTamaño = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Función para obtener estado de vigencia
  const obtenerEstadoVigencia = (fecha?: string | Date) => {
    if (!fecha) return { msg: "Sin vigencia", color: "default" as const };

    const hoy = new Date();
    const fechaVencimiento = new Date(fecha);
    const diffMs = fechaVencimiento.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { msg: "Vencido", color: "danger" as const };
    if (diffDias <= 30)
      return { msg: "Próximo a vencer", color: "warning" as const };

    return { msg: "Vigente", color: "success" as const };
  };

  // Agrupar documentos
  const documentosAgrupados =
    conductor.documentos?.reduce(
      (acc, doc) => {
        if (!acc[doc.categoria]) {
          acc[doc.categoria] = [];
        }
        acc[doc.categoria].push(doc);

        return acc;
      },
      {} as { [key: string]: Documento[] },
    ) || {};

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

  // Función para ver documentos
  const handleView = async (documento: Documento) => {
    try {
      const url = await getPresignedUrl(documento.s3_key);

      if (url) {
        window.open(url, "_blank");
      } else {
        console.error("No se pudo obtener la URL del documento");
      }
    } catch (error) {
      console.error("Error al abrir documento:", error);
    }
  };

  // Función para descargar documentos
  const handleDownload = async (documento: Documento) => {
    try {
      const response = await apiClient.get(
        `/api/documentos/descargar/${documento.id}`,
        {
          responseType: "blob",
          timeout: 30000,
        },
      );

      if (!response.data) {
        throw new Error("No se recibieron datos del servidor");
      }

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = documento.nombre_original;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error("❌ Error al descargar documento:", error);
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Error desconocido";

      alert(
        `Error al descargar "${documento.nombre_original}": ${errorMessage}`,
      );
    }
  };

  return (
    <Modal
      classNames={{
        base: "bg-white",
        closeButton: "hover:bg-gray-100 text-gray-500 top-4 right-4 z-50",
      }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="4xl"
      onClose={onClose}
    >
      <ModalContent>
        {() => (
          <>
            {/* Header minimalista */}
            <ModalHeader className="flex flex-col gap-0 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {fotoUrl ? (
                    <Image
                      alt={`${conductor.nombre} ${conductor.apellido}`}
                      className="border-2 border-gray-200"
                      height={100}
                      src={fotoUrl}
                      width={100}
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xl font-medium border-2 border-gray-200">
                      {conductor.nombre.charAt(0)}
                      {conductor.apellido.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info básica */}
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                    {conductor.nombre} {conductor.apellido}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>
                      {conductor.tipo_identificacion}:{" "}
                      {conductor.numero_identificacion}
                    </span>
                  </div>
                </div>

                {/* Estado */}
                <Chip className={`${estadoColor.badge} font-medium`} size="sm">
                  {getEstadoLabel(conductor.estado)}
                </Chip>
              </div>
            </ModalHeader>

            <ModalBody className="p-0">
              <Tabs
                aria-label="Información del Conductor"
                className="w-full"
                classNames={{
                  base: "w-full",
                  tabList:
                    "gap-6 w-full relative rounded-none px-8 border-b border-gray-100",
                  cursor: "w-full bg-blue-600",
                  tab: "max-w-fit px-0 h-12 font-medium",
                  tabContent:
                    "group-data-[selected=true]:text-blue-600 text-gray-500",
                }}
                color="primary"
                variant="underlined"
              >
                <Tab key="general" title="Información General">
                  <div className="px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Información Personal */}
                      <div className="lg:col-span-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Información Personal
                        </h3>
                        <div className="space-y-4">
                          <InfoItem
                            icon={User}
                            label="Nombre"
                            value={`${conductor.nombre} ${conductor.apellido}`}
                          />
                          <InfoItem
                            icon={Phone}
                            label="Teléfono"
                            value={conductor.telefono}
                          />
                          <InfoItem
                            icon={Mail}
                            label="Email"
                            value={conductor.email || "No registrado"}
                          />
                          <InfoItem
                            icon={Calendar}
                            label="Fecha Nacimiento"
                            value={formatearFecha(conductor.fecha_nacimiento)}
                          />
                          <InfoItem
                            icon={MapPin}
                            label="Dirección"
                            value={conductor.direccion || "No registrada"}
                          />
                        </div>
                      </div>

                      {/* Información Laboral */}
                      <div className="lg:col-span-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Información Laboral
                        </h3>
                        <div className="space-y-4">
                          <InfoItem
                            icon={Briefcase}
                            label="Cargo"
                            value={conductor.cargo || "Conductor"}
                          />
                          <InfoItem
                            icon={Calendar}
                            label="Fecha Ingreso"
                            value={formatearFecha(conductor.fecha_ingreso)}
                          />
                          <InfoItem
                            icon={MapPin}
                            label="Sede Trabajo"
                            value={conductor.sede_trabajo || "No asignada"}
                          />
                          <InfoItem
                            icon={Calendar}
                            label="Tipo Contrato"
                            value={
                              conductor.termino_contrato || "No especificado"
                            }
                          />
                          <InfoItem
                            icon={Heart}
                            label="Salario Base"
                            value={formatearDinero(conductor.salario_base)}
                          />
                        </div>
                      </div>

                      {/* Seguridad Social */}
                      <div className="lg:col-span-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Seguridad Social
                        </h3>
                        <div className="space-y-4">
                          <InfoItem
                            icon={Heart}
                            label="EPS"
                            value={conductor.eps || "No registrada"}
                          />
                          <InfoItem
                            icon={Shield}
                            label="Fondo Pensión"
                            value={conductor.fondo_pension || "No registrado"}
                          />
                          <InfoItem
                            icon={Shield}
                            label="ARL"
                            value={conductor.arl || "No registrada"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Licencia de Conducción */}
                    {conductor.licencia_conduccion && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Licencia de Conducción
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="mb-4">
                            <InfoItem
                              icon={Calendar}
                              label="Fecha Expedición"
                              value={formatearFecha(
                                conductor.licencia_conduccion.fecha_expedicion,
                              )}
                            />
                          </div>
                          {conductor.licencia_conduccion.categorias &&
                            conductor.licencia_conduccion.categorias.length >
                              0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-3">
                                  Categorías:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {conductor.licencia_conduccion.categorias.map(
                                    (categoria, index) => {
                                      const vigencia = obtenerEstadoVigencia(
                                        categoria.vigencia_hasta,
                                      );

                                      return (
                                        <div
                                          key={index}
                                          className="bg-white rounded-lg p-3 border border-gray-200 flex-1 min-w-40"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <Chip
                                              color="primary"
                                              size="sm"
                                              variant="flat"
                                            >
                                              {categoria.categoria}
                                            </Chip>
                                            <Chip
                                              color={vigencia.color}
                                              size="sm"
                                              variant="flat"
                                            >
                                              {vigencia.msg}
                                            </Chip>
                                          </div>
                                          <p className="text-xs text-gray-500">
                                            Vigente hasta:{" "}
                                            {formatearFecha(
                                              categoria.vigencia_hasta,
                                            )}
                                          </p>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Registro de Modificaciones */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <RegistroModificaciones conductor={conductor} />
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="documentos"
                  title={`Documentos (${conductor.documentos?.length || 0})`}
                >
                  <div className="px-8 py-6">
                    {Object.keys(documentosAgrupados).length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Sin documentos
                        </h3>
                        <p className="text-gray-500">
                          No hay documentos asociados a este conductor
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(documentosAgrupados).map(
                          ([categoria, docs]) => (
                            <div key={categoria} className="space-y-3">
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                {formatearCategoria(categoria)}
                              </h4>
                              {docs.map((documento) => (
                                <DocumentCard
                                  key={documento.id}
                                  documento={documento}
                                  formatearFecha={formatearFecha}
                                  formatearTamaño={formatearTamaño}
                                  obtenerEstadoVigencia={obtenerEstadoVigencia}
                                  onDownload={handleDownload}
                                  onView={handleView}
                                />
                              ))}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>

            <ModalFooter className="px-8 py-4 border-t border-gray-100">
              <div className="flex justify-end gap-3">
                <Button
                  className="font-medium"
                  color="danger"
                  variant="light"
                  onPress={onClose}
                >
                  Cerrar
                </Button>
                {onEdit && (
                  <Button
                    className="font-medium"
                    color="primary"
                    startContent={<Edit3 className="h-4 w-4" />}
                    onPress={onEdit}
                  >
                    Editar
                  </Button>
                )}
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// Componente para items de información
const InfoItem: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-gray-900 font-medium break-words">{value}</p>
    </div>
  </div>
);

// Componente para tarjetas de documentos
const DocumentCard: React.FC<{
  documento: Documento;
  onView: (doc: Documento) => void;
  onDownload: (doc: Documento) => void;
  formatearFecha: (fecha?: string) => string;
  formatearTamaño: (bytes: number) => string;
  obtenerEstadoVigencia: (fecha?: string | Date) => { msg: string; color: any };
}> = ({
  documento,
  onView,
  onDownload,
  formatearFecha,
  formatearTamaño,
  obtenerEstadoVigencia,
}) => {
  const vigencia = documento.fecha_vigencia
    ? obtenerEstadoVigencia(documento.fecha_vigencia)
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h5 className="font-medium text-gray-900 truncate mb-1">
            {documento.nombre_original}
          </h5>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{formatearTamaño(documento.size)}</span>
            <span>•</span>
            <span>{formatearFecha(documento.upload_date)}</span>
          </div>
        </div>
        <div className="flex gap-1 ml-3">
          <Button
            isIconOnly
            className="text-gray-500 hover:text-blue-600"
            size="sm"
            variant="light"
            onPress={() => onView(documento)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            isIconOnly
            className="text-gray-500 hover:text-green-600"
            size="sm"
            variant="light"
            onPress={() => onDownload(documento)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {vigencia && (
        <Chip
          className="font-medium"
          color={vigencia.color}
          size="sm"
          variant="flat"
        >
          {vigencia.msg}
        </Chip>
      )}
    </div>
  );
};

export default ModalDetalleConductor;
