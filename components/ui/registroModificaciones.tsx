import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Clipboard, User, UserPlus, UserCheck } from "lucide-react";

import { Conductor } from "@/context/ConductorContext";

const RegistroModificaciones = ({ conductor }: { conductor: Conductor }) => {
  // Función para formatear fecha
  const formatearFecha = (fecha: Date) => {
    if (!fecha) return "No disponible";

    try {
      const fechaObj = new Date(fecha);

      return fechaObj.toLocaleString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  // Función para obtener nombre completo del usuario
  const obtenerNombreUsuario = (usuario: {
    nombre?: string;
    apellido?: string;
    email?: string;
    role?: string;
  }) => {
    if (!usuario) return "Usuario no disponible";

    if (usuario.nombre && usuario.apellido) {
      return `${usuario.nombre} ${usuario.apellido}`;
    } else if (usuario.nombre) {
      return usuario.nombre;
    } else if (usuario.email) {
      return usuario.email;
    } else {
      return "Usuario desconocido";
    }
  };

  return (
    <Card className="shadow-sm">
      <CardBody className="p-5">
        <h4 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
          <div className="p-2 bg-green-100 rounded-lg mr-3">
            <Clipboard className="h-4 w-4 text-green-600" />
          </div>
          Registro de modificaciones
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {/* Información de creación */}
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-blue-900">
                  Creado por
                </h5>
                <span className="text-xs text-blue-600">
                  {formatearFecha(conductor.createdAt)}
                </span>
              </div>
              <div className="mt-2 flex items-center space-x-3">
                {conductor.creadoPor ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {obtenerNombreUsuario(conductor.creadoPor)}
                      </p>
                      {conductor.creadoPor.email && (
                        <p className="text-xs text-gray-500">
                          {conductor.creadoPor.email}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Usuario no disponible
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información de última actualización */}
          <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-green-900">
                  Última actualización
                </h5>
                <span className="text-xs text-green-600">
                  {formatearFecha(conductor.updatedAt)}
                </span>
              </div>
              <div className="mt-2 flex items-center space-x-3">
                {conductor.actualizadoPor ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {obtenerNombreUsuario(conductor.actualizadoPor)}
                      </p>
                      {conductor.actualizadoPor.email && (
                        <p className="text-xs text-gray-500">
                          {conductor.actualizadoPor.email}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Usuario no disponible
                    </span>
                  </div>
                )}
              </div>

              {/* Mostrar si es el mismo usuario */}
              {conductor.creadoPor &&
                conductor.actualizadoPor &&
                conductor.creadoPor.id === conductor.actualizadoPor.id && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      <User className="h-3 w-3 mr-1" />
                      Mismo usuario creador
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default RegistroModificaciones;
