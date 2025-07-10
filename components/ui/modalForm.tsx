import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { UserIcon, SaveIcon, Bot } from "lucide-react";
import { addToast } from "@heroui/toast";
import { Alert } from "@heroui/alert";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";

import SimpleDocumentUploader from "../documentSimpleUpload";

import {
  Conductor,
  EstadoConductor,
  initialProcesamientoState,
  PermisosConductor,
  useConductor,
} from "@/context/ConductorContext";

interface ModalFormConductorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conductor: Conductor) => Promise<void>;
  onSaveWithIA: (conductor: Conductor) => Promise<void>; // Nueva función para IA
  conductorEditar?: Conductor | null;
  titulo?: string;
}

interface DocumentoState {
  file?: File;
  fecha_vigencia?: Date;
  uploadedAt?: Date;
  existente?: any;
  esNuevo?: boolean;
}

// Configuración de documentos para IA
const documentTypesIA = [
  {
    key: "CEDULA",
    label: "Cédula de Ciudadanía",
    required: true,
    description:
      "Se extraerá: nombre, apellido, identificación, fecha nacimiento, género, tipo sangre",
  },
  {
    key: "LICENCIA",
    label: "Licencia de Conducción",
    required: true,
    description:
      "Se extraerá: categorías, fechas de vigencia, fecha expedición",
  },
  {
    key: "CONTRATO",
    label: "Contrato Laboral",
    required: true,
    description:
      "Se extraerá: fecha ingreso, salario, sede, términos contractuales",
  },
  {
    key: "FOTO_PERFIL",
    label: "Foto del Conductor",
    required: false,
    description: "Foto opcional para el perfil",
  },
];

const tiposIdentificacion = [
  { key: "CC", label: "Cédula de Ciudadanía" },
  { key: "CE", label: "Cédula de Extranjería" },
  { key: "TI", label: "Tarjeta de Identidad" },
  { key: "PA", label: "Pasaporte" },
  { key: "NIT", label: "NIT" },
];

const ModalFormConductor: React.FC<ModalFormConductorProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveWithIA,
  conductorEditar = null,
  titulo = "Registrar Nuevo Conductor",
}) => {
  // Estados del context
  const {
    procesamiento,
    currentConductor,
    setProcesamiento,
    setCurrentConductor,
  } = useConductor();

  // Estados locales
  const [modoCreacion, setModoCreacion] = useState<"tradicional" | "ia">("ia"); // Por defecto IA
  const [documentos, setDocumentos] = useState<Record<string, DocumentoState>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<Partial<Conductor>>({
    nombre: "",
    apellido: "",
    tipo_identificacion: "CC",
    numero_identificacion: "",
    telefono: "",
    email: "",
    password: "",
    estado: EstadoConductor.disponible,
    permisos: {
      verViajes: true,
      verMantenimientos: false,
      verDocumentos: true,
      actualizarPerfil: true,
    },
  });

  // Estados de validación
  const [errores, setErrores] = useState<Record<string, boolean>>({});
  const [erroresDocumentos, setErroresDocumentos] = useState<
    Record<string, boolean>
  >({});

  // ✅ EFECTOS
  useEffect(() => {
    if (conductorEditar) {
      setFormData({ ...conductorEditar, password: "" });
      setModoCreacion("tradicional"); // Si editamos, usar modo tradicional
    } else {
      resetForm();
    }
  }, [conductorEditar, isOpen]);

  // Sincronizar datos del currentConductor (datos extraídos por IA)
  useEffect(() => {
    if (currentConductor && modoCreacion === "ia") {
      setFormData((prev) => ({ ...prev, ...currentConductor }));
    }
  }, [currentConductor, modoCreacion]);

  // ✅ AUTO-CIERRE CUANDO IA TERMINA EXITOSAMENTE
  useEffect(() => {
    if (
      modoCreacion === "ia" &&
      procesamiento.estado === "completado" &&
      !loading
    ) {
      // Cerrar modal automáticamente cuando la IA termine exitosamente
      handleClose();
    }
  }, [procesamiento.estado, modoCreacion, loading]);

  // ✅ FUNCIONES DE UTILIDAD
  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      tipo_identificacion: "CC",
      numero_identificacion: "",
      telefono: "",
      email: "",
      password: "",
      estado: EstadoConductor.disponible,
      permisos: {
        verViajes: true,
        verMantenimientos: false,
        verDocumentos: true,
        actualizarPerfil: true,
      },
    });
    setModoCreacion("ia");
    setErrores({});
    setDocumentos({});
    setErroresDocumentos({});
    setCurrentConductor(null);
    setProcesamiento(initialProcesamientoState);
  };

  const validateRequiredDocuments = () => {
    return documentTypesIA
      .filter((doc) => doc.required)
      .filter((doc) => {
        const documento = documentos[doc.key];

        return !(documento && (documento.file || documento.existente));
      })
      .map((doc) => doc.label);
  };

  const preparearDocumentosParaEnvio = () => {
    const documentosParaEnvio: Record<string, any> = {};

    Object.keys(documentos).forEach((key) => {
      const documento = documentos[key];

      if (documento?.file) {
        documentosParaEnvio[key] = {
          file: documento.file,
          ...(documento.fecha_vigencia && {
            fecha_vigencia: documento.fecha_vigencia,
          }),
        };
      }
    });

    return documentosParaEnvio;
  };

  // ✅ AUTO-REGISTRO CUANDO IA COMPLETA
  const handleAutoRegistroIA = async () => {
    setLoading(true);
    try {
      console.log("🤖 Registrando automáticamente con datos de IA...");

      const datosCompletos = {
        ...formData,
        documentos: preparearDocumentosParaEnvio(),
      };

      await onSaveWithIA(datosCompletos as Conductor);

      addToast({
        title: "✅ Conductor registrado",
        description: "El conductor ha sido registrado exitosamente con IA",
        color: "success",
      });

      handleClose();
    } catch (error) {
      console.error("❌ Error en auto-registro IA:", error);
      addToast({
        title: "Error en registro automático",
        description:
          "Hubo un problema al registrar el conductor automáticamente",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ MANEJADORES DE EVENTOS
  const handleSave = async () => {
    setLoading(true);
    try {
      if (modoCreacion === "ia") {
        // Validar documentos requeridos para IA
        const missingDocs = validateRequiredDocuments();

        if (missingDocs.length > 0) {
          addToast({
            title: "Documentos faltantes",
            description: `Faltan: ${missingDocs.join(", ")}`,
            color: "danger",
          });

          return;
        }

        // Preparar datos para IA - el registro será automático
        const datosCompletos = {
          ...formData,
          documentos: preparearDocumentosParaEnvio(),
        };

        await onSaveWithIA(datosCompletos as Conductor);
      } else {
        // Modo tradicional
        const camposRequeridos = [
          "nombre",
          "apellido",
          "numero_identificacion",
          "telefono",
        ];
        const nuevosErrores: Record<string, boolean> = {};

        camposRequeridos.forEach((campo) => {
          if (!formData[campo as keyof typeof formData]) {
            nuevosErrores[campo] = true;
          }
        });

        setErrores(nuevosErrores);

        if (Object.values(nuevosErrores).some((error) => error)) {
          return;
        }

        await onSave(formData as Conductor);
        handleClose();
      }
    } catch (error) {
      console.error("Error en handleSave:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name.startsWith("permisos.")) {
      const permisoKey = name.split(".")[1] as keyof PermisosConductor;

      setFormData((prev) => ({
        ...prev,
        permisos: { ...prev.permisos, [permisoKey]: checked },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    }
  };

  const handleDocumentChange = (docKey: string, file: File) => {
    setDocumentos((prev) => ({
      ...prev,
      [docKey]: {
        file,
        uploadedAt: new Date(),
        esNuevo: true,
      },
    }));

    if (erroresDocumentos[docKey]) {
      setErroresDocumentos((prev) => ({ ...prev, [docKey]: false }));
    }
  };

  const handleDocumentRemove = (docKey: string) => {
    setDocumentos((prev) => {
      const newDocs = { ...prev };

      delete newDocs[docKey];

      return newDocs;
    });
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  // ✅ RENDERIZADO
  return (
    <Modal
      backdrop="blur"
      isOpen={isOpen}
      scrollBehavior="inside"
      size="4xl"
      onClose={handleClose}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center space-x-2">
                {modoCreacion === "ia" ? (
                  <Bot className="h-5 w-5 text-blue-600" />
                ) : (
                  <UserIcon className="h-5 w-5 text-emerald-600" />
                )}
                <h3 className="text-lg font-semibold">
                  {conductorEditar ? "Actualizar Conductor" : titulo}
                  {modoCreacion === "ia" && !conductorEditar && (
                    <Chip
                      className="ml-2"
                      color="primary"
                      size="sm"
                      variant="flat"
                    >
                      Con IA
                    </Chip>
                  )}
                </h3>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* ✅ SELECTOR DE MODO (Solo para nuevos conductores) */}
                {!conductorEditar &&
                  !procesamiento.sessionId &&
                  !currentConductor && (
                    <Card>
                      <CardBody>
                        <div>
                          <div>
                            <h4 className="font-semibold text-lg mb-2">
                              Método de Registro
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  modoCreacion === "ia"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                role="button"
                                onClick={() => setModoCreacion("ia")}
                              >
                                <div className="flex items-center gap-3">
                                  <Bot className="h-8 w-8 text-blue-600" />
                                  <div>
                                    <h5 className="font-semibold">
                                      Con Inteligencia Artificial
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      Extrae automáticamente los datos y
                                      registra el conductor
                                    </p>
                                    <Chip
                                      className="mt-1"
                                      color="success"
                                      size="sm"
                                      variant="flat"
                                    >
                                      Automático
                                    </Chip>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                  modoCreacion === "tradicional"
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                role="button"
                                onClick={() => setModoCreacion("tradicional")}
                              >
                                <div className="flex items-center gap-3">
                                  <UserIcon className="h-8 w-8 text-emerald-600" />
                                  <div>
                                    <h5 className="font-semibold">
                                      Método Tradicional
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      Ingreso manual de información básica
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                {/* ✅ PROGRESO DEL PROCESAMIENTO IA */}
                {modoCreacion === "ia" &&
                  procesamiento.sessionId &&
                  procesamiento.estado !== "completado" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">
                            Procesamiento con IA
                          </h3>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-4">
                          <Progress
                            showValueLabel
                            color="primary"
                            label="Progreso"
                            value={procesamiento.progreso || 0}
                          />
                          <p className="text-sm text-gray-600">
                            {procesamiento.mensaje}
                          </p>
                          {procesamiento.error && (
                            <Alert color="danger" variant="faded">
                              {procesamiento.error}
                            </Alert>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                {/* ✅ CARGA DE DOCUMENTOS PARA IA */}
                {modoCreacion === "ia" &&
                  !procesamiento.sessionId &&
                  !currentConductor && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold">
                            Documentos para Procesamiento IA
                          </h4>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>ℹ️ Proceso automático:</strong> Una vez
                            cargados los documentos requeridos, la IA extraerá
                            los datos y registrará el conductor automáticamente.
                          </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {documentTypesIA.map((docType) => {
                            const documento = documentos[docType.key];

                            return (
                              <div
                                key={docType.key}
                                className="border rounded-lg p-4"
                              >
                                <div className="mb-3">
                                  <h5 className="font-semibold">
                                    {docType.label}
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    {docType.description}
                                  </p>
                                  {docType.required && (
                                    <Chip
                                      className="mt-1"
                                      color="danger"
                                      size="sm"
                                      variant="flat"
                                    >
                                      Requerido
                                    </Chip>
                                  )}
                                </div>

                                <SimpleDocumentUploader
                                  documentKey={docType.key}
                                  errores={erroresDocumentos}
                                  existingDocument={null}
                                  fecha_vigencia={null}
                                  file={documento?.file || null}
                                  isExisting={false}
                                  label=""
                                  vigencia={false}
                                  onChange={handleDocumentChange}
                                  onRemove={handleDocumentRemove}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                {/* ✅ FORMULARIO TRADICIONAL */}
                {modoCreacion === "tradicional" && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-emerald-600" />
                        <h4 className="font-semibold">Información Básica</h4>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          isRequired
                          errorMessage={
                            errores.nombre ? "El nombre es requerido" : ""
                          }
                          isInvalid={errores.nombre}
                          label="Nombres"
                          name="nombre"
                          placeholder="Ingrese nombres"
                          value={formData.nombre || ""}
                          onChange={handleChange}
                        />

                        <Input
                          isRequired
                          errorMessage={
                            errores.apellido ? "El apellido es requerido" : ""
                          }
                          isInvalid={errores.apellido}
                          label="Apellidos"
                          name="apellido"
                          placeholder="Ingrese apellidos"
                          value={formData.apellido || ""}
                          onChange={handleChange}
                        />

                        <Select
                          isRequired
                          defaultSelectedKeys={
                            formData.tipo_identificacion
                              ? [formData.tipo_identificacion]
                              : []
                          }
                          label="Tipo de Identificación"
                          name="tipo_identificacion"
                          placeholder="Seleccione tipo"
                          onChange={handleChange}
                        >
                          {tiposIdentificacion.map((tipo) => (
                            <SelectItem key={tipo.key}>{tipo.label}</SelectItem>
                          ))}
                        </Select>

                        <Input
                          isRequired
                          errorMessage={
                            errores.numero_identificacion
                              ? "La identificación es requerida"
                              : ""
                          }
                          isInvalid={errores.numero_identificacion}
                          label="Número de Identificación"
                          name="numero_identificacion"
                          placeholder="Ingrese número"
                          value={formData.numero_identificacion || ""}
                          onChange={handleChange}
                        />

                        <Input
                          isRequired
                          errorMessage={
                            errores.telefono ? "El teléfono es requerido" : ""
                          }
                          isInvalid={errores.telefono}
                          label="Teléfono"
                          name="telefono"
                          placeholder="Ingrese teléfono"
                          value={formData.telefono || ""}
                          onChange={handleChange}
                        />

                        <Input
                          label="Email"
                          name="email"
                          placeholder="Ingrese email"
                          type="email"
                          value={formData.email || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>

            {/* No mostrar el footer si el procesamiento está completado */}
            {procesamiento.estado !== "completado" && (
              <ModalFooter>
                <div className="flex gap-3 w-full justify-between">
                  {/* Botón Cancelar */}
                  <Button
                    color="danger"
                    isDisabled={loading || !!procesamiento.sessionId}
                    variant="light"
                    onPress={handleClose}
                  >
                    Cancelar
                  </Button>

                  <div className="flex gap-2">
                    {/* Botón Reiniciar para errores o cuando hay procesamiento */}
                    {(procesamiento.estado === "error" ||
                      procesamiento.sessionId) && (
                      <Button
                        color="warning"
                        isDisabled={loading}
                        variant="flat"
                        onPress={resetForm}
                      >
                        Reiniciar
                      </Button>
                    )}

                    {/* Botón principal - solo mostrar si no hay procesamiento activo */}
                    {!procesamiento.sessionId && (
                      <Button
                        color="primary"
                        isLoading={loading}
                        startContent={
                          !loading ? (
                            <SaveIcon className="h-4 w-4" />
                          ) : undefined
                        }
                        onPress={handleSave}
                      >
                        {loading
                          ? modoCreacion === "ia"
                            ? "Procesando con IA..."
                            : "Guardando..."
                          : modoCreacion === "ia"
                            ? "Procesar con IA"
                            : "Guardar"}
                      </Button>
                    )}
                  </div>
                </div>
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ModalFormConductor;
