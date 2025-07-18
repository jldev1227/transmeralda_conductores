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
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  UserIcon,
  Phone,
  Mail,
  Calendar,
  Truck,
  Heart,
  IdCard,
  ShieldCheck,
  Edit,
  Download,
  Clock,
  FileText,
  Eye,
  User,
  Briefcase,
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
  // ✅ HOOKS PRIMERO - SIEMPRE en el mismo orden
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Verificar conductor dentro del useEffect
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

  // ✅ EARLY RETURN DESPUÉS de los hooks
  if (!conductor) {
    return null;
  }

  // En el JSX del Card, usar fotoUrl en lugar de item.fotoUrl

  const estadoColor = getEstadoColor(conductor.estado);
  const esPlanta = !!(
    conductor.cargo &&
    conductor.fecha_ingreso &&
    conductor.salario_base
  );

  // Función para formatear fecha YYYY-MM-DD a formato legible
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

  // Función para formatear valores monetarios
  const formatearDinero = (valor?: number) => {
    if (!valor && valor !== 0) return "No especificado";

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor);
  };

  // Función para obtener icono según categoría de documento
  const getDocumentIcon = (categoria: string) => {
    switch (categoria) {
      case "CEDULA":
        return <IdCard className="h-4 w-4 text-blue-600" />;
      case "LICENCIA":
        return <Truck className="h-4 w-4 text-green-600" />;
      case "CERTIFICADO_MEDICO":
        return <Heart className="h-4 w-4 text-red-600" />;
      case "ANTECEDENTES_PENALES":
        return <ShieldCheck className="h-4 w-4 text-purple-600" />;
      case "CARTA_RECOMENDACION":
        return <Mail className="h-4 w-4 text-orange-600" />;
      case "CERTIFICADO_EXPERIENCIA":
        return <Briefcase className="h-4 w-4 text-indigo-600" />;
      case "FOTO":
        return <User className="h-4 w-4 text-pink-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  // Función para formatear categoría
  const formatearCategoria = (categoria: string) => {
    const categorias: { [key: string]: string } = {
      CEDULA: "Cédula de Ciudadanía",
      LICENCIA: "Licencia de Conducción",
      FOTO_PERFIL: "Foto  de Perfil",
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
  const obtenerEstadoVigencia = (
    fecha?: string | Date,
  ): {
    msg: string;
    color:
      | "default"
      | "danger"
      | "warning"
      | "success"
      | "primary"
      | "secondary"
      | undefined;
  } => {
    if (!fecha) {
      return { msg: "Sin vigencia", color: "default" };
    }
    const hoy = new Date();
    const fechaVencimiento = new Date(fecha);
    const diffMs = fechaVencimiento.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    switch (true) {
      case diffDias < 0:
        return { msg: "Vencido", color: "danger" };
      case diffDias <= 30:
        return { msg: "Próximo a vencer", color: "warning" };
      default:
        return { msg: "Vigente", color: "success" };
    }
  };

  // Orden de prioridad de las categorías
  const ordenPrioridad = [
    "CEDULA",
    "LICENCIA",
    "CONTRATO",
    "CERTIFICADO_MEDICO",
    "ANTECEDENTES_PENALES",
    "CARTA_RECOMENDACION",
    "CERTIFICADO_EXPERIENCIA",
    "FOTO",
  ];

  // Agrupar y ordenar documentos por categoría según prioridad
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

  // Ordenar las entradas del objeto agrupado según la prioridad
  const documentosAgrupadosOrdenados = Object.fromEntries(
    Object.entries(documentosAgrupados).sort(
      ([a], [b]) =>
        (ordenPrioridad.indexOf(a) === -1 ? 999 : ordenPrioridad.indexOf(a)) -
        (ordenPrioridad.indexOf(b) === -1 ? 999 : ordenPrioridad.indexOf(b)),
    ),
  );

  // Función para obtener URL presignada (mantén la que ya tienes)
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

  // Función mejorada para ver documentos
  const handleView = async (documento: Documento) => {
    try {
      const url = await getPresignedUrl(documento.s3_key);

      if (url) {
        window.open(url, "_blank");
      } else {
        // Mostrar notificación de error
        console.error("No se pudo obtener la URL del documento");
      }
    } catch (error) {
      console.error("Error al abrir documento:", error);
    }
  };

  // OPCIÓN 3: Descarga con fetch a través del backend
  const handleDownload = async (documento: Documento) => {
    try {
      const response = await apiClient.get(
        `/api/documentos/descargar/${documento.id}`,
        {
          responseType: "blob",
          timeout: 30000, // 30 segundos
        },
      );

      if (!response.data) {
        throw new Error("No se recibieron datos del servidor");
      }

      // Crear blob y descargar
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
    <Modal isOpen={isOpen} scrollBehavior="inside" size="5xl" onClose={onClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <UserIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Detalle del Conductor
                  </h3>
                  <p className="text-sm text-gray-500">
                    {conductor.tipo_identificacion}:{" "}
                    {conductor.numero_identificacion}
                  </p>
                </div>
              </div>
              <Chip className={`${estadoColor.badge} px-4 py-2 font-medium`}>
                {getEstadoLabel(conductor.estado)}
              </Chip>
            </ModalHeader>

            <ModalBody className="p-0">
              {/* Encabezado horizontal */}
              <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 p-4 md:p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                {/* Imagen/Avatar grande */}
                <div className="flex-shrink-0 flex justify-center md:block w-full md:w-auto mb-4 md:mb-0">
                  <div className="relative mx-auto md:mx-0">
                    {fotoUrl ? (
                      <Image
                        alt={`${conductor.nombre} ${conductor.apellido}`}
                        className="h-28 w-48 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-2xl object-cover object-top shadow-lg border-4 border-white"
                        height={160}
                        src={fotoUrl}
                        width={160}
                      />
                    ) : (
                      <div className="h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 text-3xl sm:text-4xl md:text-5xl font-bold shadow-lg border-4 border-white">
                        {conductor.nombre.charAt(0)}
                        {conductor.apellido.charAt(0)}
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg z-10">
                      <UserIcon className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                </div>

                {/* Información principal */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">
                      {conductor.nombre} {conductor.apellido}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-3">
                      <span className="bg-gray-100 px-2 md:px-3 py-1 rounded-full font-medium">
                        {conductor.cargo || "Conductor"}
                      </span>
                      {esPlanta && (
                        <span className="bg-emerald-100 text-emerald-800 px-2 md:px-3 py-1 rounded-full font-medium">
                          Conductor de Planta
                        </span>
                      )}
                      {conductor.sede_trabajo && (
                        <span className="bg-purple-100 text-purple-800 px-2 md:px-3 py-1 rounded-full font-medium">
                          {conductor.sede_trabajo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grid de información clave */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center mb-1 md:mb-2">
                        <Phone className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teléfono
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 break-all">
                        {conductor.telefono}
                      </p>
                    </div>

                    <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center mb-1 md:mb-2">
                        <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ingreso
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatearFecha(conductor.fecha_ingreso)}
                      </p>
                    </div>

                    <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center mb-1 md:mb-2">
                        <Mail className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </span>
                      </div>
                      <p
                        className="text-sm font-semibold text-gray-900 truncate lowercase"
                        title={conductor.email || "No registrado"}
                      >
                        {conductor.email || "No registrado"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6">
                <Tabs
                  aria-label="Información del Conductor"
                  className="w-full"
                  color="primary"
                  variant="underlined"
                >
                  <Tab key="general" title="Información General">
                    <div className="py-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Columna izquierda */}
                        <div className="space-y-6">
                          {/* Información personal */}
                          <Card className="shadow-sm">
                            <CardBody className="p-5">
                              <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                Información Personal
                              </h4>
                              <div className="space-y-3">
                                {[
                                  {
                                    label: "Nombre completo",
                                    value: `${conductor.nombre} ${conductor.apellido}`,
                                  },
                                  {
                                    label: "Identificación",
                                    value: `${conductor.tipo_identificacion} ${conductor.numero_identificacion}`,
                                  },
                                  {
                                    label: "Fecha nacimiento",
                                    value: formatearFecha(
                                      conductor.fecha_nacimiento,
                                    ),
                                  },
                                  {
                                    label: "Género",
                                    value:
                                      conductor.genero || "No especificado",
                                  },
                                  {
                                    label: "Dirección",
                                    value:
                                      conductor.direccion || "No registrada",
                                  },
                                  {
                                    label: "Tipo Sangre",
                                    value:
                                      conductor.tipo_sangre || "No registrada",
                                  },
                                ].map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <span className="text-sm font-medium text-gray-600">
                                      {item.label}:
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium text-right">
                                      {item.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>

                          {/* Licencia de conducción */}
                          <Card className="shadow-sm">
                            <CardBody className="p-5">
                              <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                                <div className="p-2 bg-green-100 rounded-lg mr-3">
                                  <Truck className="h-4 w-4 text-green-600" />
                                </div>
                                Licencia de Conducción
                              </h4>

                              {conductor.licencia_conduccion ? (
                                <div className="space-y-4">
                                  {/* Fecha de expedición */}
                                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm font-medium text-gray-600">
                                      Fecha expedición:
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium">
                                      {formatearFecha(
                                        conductor.licencia_conduccion
                                          .fecha_expedicion,
                                      )}
                                    </span>
                                  </div>

                                  {/* Categorías */}
                                  <div className="space-y-3">
                                    <span className="text-sm font-medium text-gray-600">
                                      Categorías autorizadas:
                                    </span>
                                    <div className="space-y-2">
                                      {conductor.licencia_conduccion.categorias?.map(
                                        (categoria, index) => {
                                          const vigencia =
                                            obtenerEstadoVigencia(
                                              categoria.vigencia_hasta,
                                            );

                                          return (
                                            <div
                                              key={index}
                                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                            >
                                              <div className="flex items-center space-x-3">
                                                <Chip
                                                  className="font-semibold"
                                                  color="primary"
                                                  size="sm"
                                                  variant="flat"
                                                >
                                                  {categoria.categoria}
                                                </Chip>
                                                <span className="text-sm text-gray-600">
                                                  Vigente hasta:{" "}
                                                  {formatearFecha(
                                                    categoria.vigencia_hasta,
                                                  )}
                                                </span>
                                              </div>
                                              <Chip
                                                className="font-medium"
                                                color={vigencia.color}
                                                size="sm"
                                                variant="flat"
                                              >
                                                {vigencia.msg}
                                              </Chip>
                                            </div>
                                          );
                                        },
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                                    <Truck className="h-6 w-6 text-gray-400" />
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    No hay información de licencia registrada
                                  </p>
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        </div>

                        {/* Columna derecha */}
                        <div className="space-y-6">
                          {/* Información laboral */}
                          <Card className="shadow-sm">
                            <CardBody className="p-5">
                              <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                                  <Briefcase className="h-4 w-4 text-purple-600" />
                                </div>
                                Información Laboral
                              </h4>
                              <div className="space-y-3">
                                {[
                                  {
                                    label: "Cargo",
                                    value: conductor.cargo || "Conductor",
                                  },
                                  {
                                    label: "Fecha ingreso",
                                    value: formatearFecha(
                                      conductor.fecha_ingreso,
                                    ),
                                  },
                                  {
                                    label: "Tipo contrato",
                                    value:
                                      conductor.termino_contrato ||
                                      "No especificado",
                                  },
                                  {
                                    label: "Terminación Contrato",
                                    value:
                                      conductor.fecha_terminacion ||
                                      "No especificado",
                                  },
                                  {
                                    label: "Salario base",
                                    value: formatearDinero(
                                      conductor.salario_base,
                                    ),
                                  },
                                  {
                                    label: "Sede trabajo",
                                    value:
                                      conductor.sede_trabajo || "No asignada",
                                  },
                                ].map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <span className="text-sm font-medium text-gray-600">
                                      {item.label}:
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium text-right">
                                      {item.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>

                          {/* Seguridad social */}
                          <Card className="shadow-sm">
                            <CardBody className="p-5">
                              <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                                <div className="p-2 bg-red-100 rounded-lg mr-3">
                                  <Heart className="h-4 w-4 text-red-600" />
                                </div>
                                Seguridad Social
                              </h4>
                              <div className="space-y-3">
                                {[
                                  {
                                    label: "EPS",
                                    value: conductor.eps || "No registrada",
                                  },
                                  {
                                    label: "Fondo de pensión",
                                    value:
                                      conductor.fondo_pension ||
                                      "No registrado",
                                  },
                                  {
                                    label: "ARL",
                                    value: conductor.arl || "No registrada",
                                  },
                                ].map((item, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                                  >
                                    <span className="text-sm font-medium text-gray-600">
                                      {item.label}:
                                    </span>
                                    <span className="text-sm text-gray-900 font-medium text-right">
                                      {item.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        </div>

                        <div className="col-span-2">
                          <RegistroModificaciones conductor={conductor} />
                        </div>
                      </div>
                    </div>
                  </Tab>

                  <Tab
                    key="documentos"
                    title={`Documentos (${conductor.documentos?.length || 0})`}
                  >
                    <div className="py-6">
                      {/* Aquí irán los documentos del conductor */}
                      <div className="space-y-6">
                        {/* Ejemplo de estructura para cuando tengas los documentos */}

                        {documentosAgrupadosOrdenados &&
                          Object.keys(documentosAgrupadosOrdenados).length ===
                            0 && (
                            <div className="text-center py-12">
                              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Documentos del Conductor
                              </h3>
                              <p className="text-gray-500 mb-4">
                                Aquí se mostrarán todos los documentos asociados
                                al conductor
                              </p>
                              <div className="text-sm text-gray-400">
                                <p>• Cédula de Ciudadanía</p>
                                <p>• Licencia de Conducción</p>
                                <p>• Certificado Médico</p>
                                <p>• Antecedentes Penales</p>
                                <p>• Contrato Laboral</p>
                              </div>
                            </div>
                          )}

                        {documentosAgrupadosOrdenados &&
                          Object.entries(documentosAgrupadosOrdenados).map(
                            ([categoria, docs]) => (
                              <Card key={categoria} className="shadow-sm">
                                <CardBody className="p-5">
                                  <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                                      {getDocumentIcon(categoria)}
                                    </div>
                                    {formatearCategoria(categoria)}
                                  </h4>
                                  <div className="space-y-4">
                                    {docs.map((documento) => (
                                      <div
                                        key={documento.id}
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1 min-w-0">
                                            <h5 className="font-semibold text-gray-900 mb-3">
                                              {documento.nombre_original}
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div className="flex items-center text-sm text-gray-600">
                                                <FileText className="h-3 w-3 mr-2" />
                                                Tamaño:{" "}
                                                {formatearTamaño(
                                                  documento.size,
                                                )}
                                              </div>
                                              <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="h-3 w-3 mr-2" />
                                                Subido:{" "}
                                                {formatearFecha(
                                                  documento.upload_date,
                                                )}
                                              </div>
                                              {documento.fecha_vigencia && (
                                                <div className="flex items-center">
                                                  <Calendar className="h-3 w-3 mr-2" />
                                                  <span className="text-sm text-gray-600 mr-2">
                                                    Estado:
                                                  </span>
                                                  <Chip
                                                    color={
                                                      obtenerEstadoVigencia(
                                                        documento.fecha_vigencia,
                                                      ).color
                                                    }
                                                    size="sm"
                                                    variant="flat"
                                                  >
                                                    {
                                                      obtenerEstadoVigencia(
                                                        documento.fecha_vigencia,
                                                      ).msg
                                                    }
                                                  </Chip>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex space-x-2 ml-4 flex-shrink-0">
                                            <Button
                                              isIconOnly
                                              className="rounded-lg"
                                              color="primary"
                                              size="sm"
                                              variant="flat"
                                              onPress={() =>
                                                handleView(documento)
                                              }
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              isIconOnly
                                              className="rounded-lg"
                                              color="secondary"
                                              size="sm"
                                              variant="flat"
                                              onPress={() =>
                                                handleDownload(documento)
                                              }
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardBody>
                              </Card>
                            ),
                          )}
                      </div>
                    </div>
                  </Tab>
                </Tabs>
              </div>
            </ModalBody>

            <ModalFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex space-x-3">
                <Button
                  className="font-medium"
                  color="danger"
                  radius="lg"
                  variant="light"
                  onPress={onClose}
                >
                  Cerrar
                </Button>
                {onEdit && (
                  <Button
                    color="primary"
                    radius="sm"
                    startContent={<Edit className="h-4 w-4" />}
                    variant="solid"
                    onPress={onEdit}
                  >
                    Editar Conductor
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

export default ModalDetalleConductor;
