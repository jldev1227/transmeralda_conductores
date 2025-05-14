import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
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
} from "lucide-react";

import {
  Conductor,
  getEstadoColor,
  getEstadoLabel,
} from "@/context/ConductorContext";

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
  if (!conductor) return null;

  const estadoColor = getEstadoColor(conductor.estado);
  const esPlanta = !!(
    conductor.cargo &&
    conductor.fecha_ingreso &&
    conductor.salario_base
  );

  // Función para formatear fecha YYYY-MM-DD a formato legible
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "No especificada";

    return new Date(fecha).toLocaleDateString("es-CO", {
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

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="4xl" onClose={onClose}>
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">Detalle del Conductor</h3>
              </div>
              <Badge className={`${estadoColor.badge} px-3 py-1`}>
                {getEstadoLabel(conductor.estado)}
              </Badge>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* Encabezado con la información principal */}
                <div className="flex flex-col items-center md:flex-row md:items-start border-b pb-6">
                  <div className="mb-4 md:mb-0 md:mr-6">
                    {conductor.fotoUrl ? (
                      <img
                        alt={`${conductor.nombre} ${conductor.apellido}`}
                        className="h-32 w-32 rounded-full object-cover border-4 border-emerald-100"
                        src={conductor.fotoUrl}
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-4xl font-bold">
                        {conductor.nombre.charAt(0)}
                        {conductor.apellido.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {conductor.nombre} {conductor.apellido}
                    </h2>
                    <p className="text-md text-gray-600 mb-2">
                      {conductor.cargo || "Conductor"}
                    </p>
                    <div className="flex flex-col md:flex-row md:items-center text-sm text-gray-500 space-y-1 md:space-y-0 md:space-x-4">
                      <span className="flex items-center">
                        <IdCard className="h-4 w-4 mr-1" />
                        {conductor.tipo_identificacion}:{" "}
                        {conductor.numero_identificacion}
                      </span>
                      <span className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {conductor.telefono}
                      </span>
                      {conductor.email && (
                        <span className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {conductor.email}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <Badge
                        className={`${esPlanta ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"} mr-2`}
                      >
                        {esPlanta ? "Conductor de Planta" : "Conductor Externo"}
                      </Badge>
                      {conductor.sede_trabajo && (
                        <Badge className="bg-purple-100 text-purple-800">
                          Sede: {conductor.sede_trabajo}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenedor de columnas para la información detallada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna izquierda */}
                  <div className="space-y-6">
                    {/* Información de contacto */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        Información de Contacto
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="font-medium w-28">Teléfono:</span>
                          <span>{conductor.telefono}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Email:</span>
                          <span>{conductor.email || "No registrado"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Dirección:</span>
                          <span>{conductor.direccion || "No registrada"}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Información personal */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-500" />
                        Información Personal
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="font-medium w-28">Fecha Nac.:</span>
                          <span>
                            {formatearFecha(conductor.fecha_nacimiento)}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Género:</span>
                          <span>{conductor.genero || "No especificado"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">
                            Identificación:
                          </span>
                          <span>
                            {conductor.tipo_identificacion}{" "}
                            {conductor.numero_identificacion}
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Licencia de conducción */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <Truck className="h-4 w-4 mr-2 text-gray-500" />
                        Licencia de Conducción
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="font-medium w-28">Número:</span>
                          <span>
                            {conductor.licencia_conduccion || "No registrado"}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Categoría:</span>
                          <span>
                            {conductor.categoria_licencia || "No registrada"}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Vencimiento:</span>
                          <span>
                            {formatearFecha(conductor.vencimiento_licencia)}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="space-y-6">
                    {/* Información laboral */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <IdCard className="h-4 w-4 mr-2 text-gray-500" />
                        Información Laboral
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="font-medium w-28">Cargo:</span>
                          <span>{conductor.cargo || "Conductor"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">
                            Salario Base:
                          </span>
                          <span>{formatearDinero(conductor.salario_base)}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Ingreso:</span>
                          <span>{formatearFecha(conductor.fecha_ingreso)}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Contrato:</span>
                          <span>
                            {conductor.tipo_contrato || "No especificado"}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Sede:</span>
                          <span>{conductor.sede_trabajo || "No asignada"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Estado:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${estadoColor.badge}`}
                          >
                            {getEstadoLabel(conductor.estado)}
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Seguridad social */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <Heart className="h-4 w-4 mr-2 text-gray-500" />
                        Seguridad Social
                      </h4>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="font-medium w-28">EPS:</span>
                          <span>{conductor.eps || "No registrada"}</span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">Pensión:</span>
                          <span>
                            {conductor.fondo_pension || "No registrado"}
                          </span>
                        </li>
                        <li className="flex items-start">
                          <span className="font-medium w-28">ARL:</span>
                          <span>{conductor.arl || "No registrada"}</span>
                        </li>
                      </ul>
                    </div>

                    {/* Permisos en el sistema */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                        <ShieldCheck className="h-4 w-4 mr-2 text-gray-500" />
                        Permisos en el Sistema
                      </h4>
                      <ul className="space-y-2">
                        {conductor.permisos &&
                          Object.entries(conductor.permisos).map(
                            ([clave, valor]) => (
                              <li key={clave} className="flex items-start">
                                <span className="font-medium w-28">
                                  {clave === "verViajes"
                                    ? "Ver Viajes"
                                    : clave === "verMantenimientos"
                                      ? "Ver Mantenimientos"
                                      : clave === "verDocumentos"
                                        ? "Ver Documentos"
                                        : clave === "actualizarPerfil"
                                          ? "Editar Perfil"
                                          : clave}
                                  :
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${valor ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                                >
                                  {valor ? "Permitido" : "Denegado"}
                                </span>
                              </li>
                            ),
                          )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold mb-3 flex items-center border-b pb-2">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Actividad en el Sistema
                  </h4>
                  <ul className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                    <li className="flex items-start">
                      <span className="font-medium w-28">Último acceso:</span>
                      <span>
                        {conductor.ultimo_acceso
                          ? new Date(conductor.ultimo_acceso).toLocaleString(
                              "es-CO",
                            )
                          : "Nunca ha accedido"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-medium w-28">Creado el:</span>
                      <span>
                        {conductor.createdAt
                          ? new Date(conductor.createdAt).toLocaleString(
                              "es-CO",
                            )
                          : "No disponible"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-medium w-28">Actualizado:</span>
                      <span>
                        {conductor.updatedAt
                          ? new Date(conductor.updatedAt).toLocaleString(
                              "es-CO",
                            )
                          : "No disponible"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-medium w-28">Creado por:</span>
                      <span>{conductor.creado_por_id || "No disponible"}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <div className="flex space-x-2">
                <Button
                  color="primary"
                  radius="sm"
                  variant="light"
                  onPress={onClose}
                >
                  Cerrar
                </Button>

                {/* Botón para descargar información (opcional) */}
                <Button
                  color="secondary"
                  radius="sm"
                  startContent={<Download className="h-4 w-4" />}
                  variant="flat"
                  onPress={() => {
                    // Lógica para descargar información del conductor (PDF, CSV, etc.)
                    alert(
                      "Funcionalidad para descargar información del conductor",
                    );
                  }}
                >
                  Descargar Info
                </Button>

                {/* Botón de editar (opcional) */}
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
