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
import { Tabs, Tab } from "@heroui/tabs";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { Select, SelectItem } from "@heroui/select";
import { Progress } from "@heroui/progress";
import { Alert } from "@heroui/alert";
import {
  User,
  FileText,
  Bot,
  Save,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Upload,
  Eye,
} from "lucide-react";
import { addToast } from "@heroui/toast";

import SimpleDocumentUploader from "../documentSimpleUpload";

import {
  Conductor,
  EstadoConductor,
  initialProcesamientoState,
  useConductor,
} from "@/context/ConductorContext";
import { estadosConductor } from "@/utils";
import { formatCurrency } from "@/helpers";
import { apiClient } from "@/config/apiClient";

interface ModalFormConductorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conductor: Conductor) => Promise<void>;
  onSaveWithIA: (conductor: Conductor) => Promise<void>;
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

// Documentos que afectan información básica (no cambiante)
const documentosBasicos = [
  {
    key: "CEDULA",
    label: "Cédula de Ciudadanía",
    required: true,
    description: "Documento de identificación oficial",
  },
  {
    key: "LICENCIA",
    label: "Licencia de Conducción",
    required: true,
    description: "Licencia vigente para conducir",
  },
  {
    key: "CONTRATO",
    label: "Contrato Laboral",
    required: false,
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

interface SelectEstadoConductorProps {
  value?: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
  errorMessage?: string;
  isInvalid?: boolean;
}

const SelectEstadoConductor: React.FC<SelectEstadoConductorProps> = ({
  value,
  onChange,
  isDisabled = false,
  label = "Estado",
  placeholder = "Seleccionar estado",
  isRequired = false,
  errorMessage,
  isInvalid = false,
}) => {
  const estadoSeleccionado = estadosConductor.find(
    (estado) => estado.key === value,
  );

  return (
    <div className="grid sm:grid-cols-2 gap-4 items-center">
      <Select
        classNames={{
          trigger:
            "border-gray-200 hover:border-gray-300 data-[hover=true]:border-gray-300",
          value: "text-gray-900",
          label: "text-gray-700",
        }}
        errorMessage={errorMessage}
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        isRequired={isRequired}
        items={estadosConductor}
        label={label}
        placeholder={placeholder}
        renderValue={(items) => {
          return items.map((item) => {
            const estado = estadosConductor.find((e) => e.key === item.key);

            if (!estado) return null;

            const Icon = estado.icon;

            return (
              <div key={item.key} className="flex items-center gap-2">
                <div className={`p-1 rounded ${estado.bgColor}`}>
                  <Icon className={`h-3 w-3 ${estado.textColor}`} />
                </div>
                <span className="font-medium">{estado.label}</span>
              </div>
            );
          });
        }}
        selectedKeys={value ? [value] : []}
        onSelectionChange={(keys) => {
          const selectedKey = Array.from(keys)[0] as string;

          if (selectedKey) {
            onChange(selectedKey);
          }
        }}
      >
        {(estado) => {
          const Icon = estado.icon;

          return (
            <SelectItem
              key={estado.key}
              classNames={{
                base: "data-[hover=true]:bg-gray-50 data-[selected=true]:bg-blue-50",
              }}
            >
              <div className="flex items-center justify-between w-full py-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${estado.bgColor} ${estado.borderColor} border`}
                  >
                    <Icon className={`h-4 w-4 ${estado.textColor}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {estado.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      {estado.description}
                    </div>
                  </div>
                </div>
                <Chip
                  className="font-medium"
                  color={estado.color}
                  size="sm"
                  variant="flat"
                >
                  {estado.key}
                </Chip>
              </div>
            </SelectItem>
          );
        }}
      </Select>

      {/* Vista previa del estado seleccionado */}
      {estadoSeleccionado && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${estadoSeleccionado.bgColor} ${estadoSeleccionado.borderColor} border`}
            >
              <estadoSeleccionado.icon
                className={`h-4 w-4 ${estadoSeleccionado.textColor}`}
              />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                Estado actual: {estadoSeleccionado.label}
              </div>
              <div className="text-sm text-gray-600">
                {estadoSeleccionado.description}
              </div>
            </div>
            <Chip
              className="font-medium"
              color={estadoSeleccionado.color}
              size="sm"
              variant="flat"
            >
              {estadoSeleccionado.key}
            </Chip>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalFormConductor: React.FC<ModalFormConductorProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveWithIA,
  conductorEditar = null,
  titulo = "Registrar Nuevo Conductor",
}) => {
  // Context
  const {
    procesamiento,
    currentConductor,
    setProcesamiento,
    setCurrentConductor,
    documentosRequeridos,
  } = useConductor();
  const [disabledTabs, setDisabledTabs] = useState<string[]>([]);

  // Estados locales
  const [activeTab, setActiveTab] = useState("documentos-basicos");
  const [documentos, setDocumentos] = useState<Record<string, DocumentoState>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  // Formulario para información cambiante
  const [formDataCambiante, setFormDataCambiante] = useState({
    telefono: "",
    email: "",
    direccion: "",
    salario_base: "",
    estado: "",
  });

  // Estado del formulario principal
  const [formData, setFormData] = useState<Partial<Conductor>>({
    nombre: "",
    apellido: "",
    tipo_identificacion: "CC",
    numero_identificacion: "",
    telefono: "",
    email: "",
    estado: EstadoConductor.disponible,
    permisos: {
      verViajes: true,
      verMantenimientos: false,
      verDocumentos: true,
      actualizarPerfil: true,
    },
  });

  const [errores, setErrores] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (conductorEditar) {
      setFormData({ ...conductorEditar });
      setFormDataCambiante({
        telefono: conductorEditar.telefono || "",
        email: conductorEditar.email || "",
        direccion: conductorEditar.direccion || "",
        salario_base: conductorEditar.salario_base?.toString() || "",
        estado: conductorEditar.estado,
      });

      // Cargar documentos existentes
      if (
        conductorEditar.documentos &&
        Array.isArray(conductorEditar.documentos)
      ) {
        const documentosExistentes: Record<string, DocumentoState> = {};

        conductorEditar.documentos.forEach((doc) => {
          if (doc.categoria) {
            documentosExistentes[doc.categoria] = {
              existente: doc,
              fecha_vigencia: doc.fecha_vigencia
                ? new Date(doc.fecha_vigencia)
                : undefined,
              uploadedAt: new Date(doc.upload_date || Date.now()),
              esNuevo: false,
            };
          }
        });
        setDocumentos(documentosExistentes);
      }
    } else {
      setDisabledTabs(["info", "documentos-requeridos"]);
      resetForm();
    }
  }, [conductorEditar, isOpen]);

  useEffect(() => {
    if (currentConductor) {
      setFormData((prev) => ({ ...prev, ...currentConductor }));
    }
  }, [currentConductor]);

  useEffect(() => {
    if (procesamiento.estado === "completado" && !loading) {
      setTimeout(() => {
        handleClose();
      }, 1000);
    }
  }, [procesamiento.estado, loading]);

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      tipo_identificacion: "CC",
      numero_identificacion: "",
      telefono: "",
      email: "",
      estado: EstadoConductor.disponible,
      permisos: {
        verViajes: true,
        verMantenimientos: false,
        verDocumentos: true,
        actualizarPerfil: true,
      },
    });
    setFormDataCambiante({
      telefono: "",
      email: "",
      direccion: "",
      salario_base: "",
      estado: "",
    });
    setDocumentos({});
    setErrores({});
    setCurrentConductor(null);
    setProcesamiento(initialProcesamientoState);
    setActiveTab("documentos-basicos");
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
  };

  const handleDocumentRemove = (docKey: string) => {
    setDocumentos((prev) => {
      const newDocs = { ...prev };

      delete newDocs[docKey];

      return newDocs;
    });
  };

  const handleSaveInformacionCambiante = async () => {
    setLoading(true);
    try {
      const response = await apiClient.patch(
        `/api/conductores/${conductorEditar?.id}/actualizar-info`,
        formDataCambiante,
      );

      if (response.data.success) {
        handleClose();
      }
    } catch (error) {
      console.error("Error al actualizar información:", error);
      addToast({
        title: "Error",
        description: "No se pudo actualizar la información",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateRequiredDocuments = () => {
    // ✅ Para creación de nuevos conductores, mantener la lógica original
    if (conductorEditar) {
      return []; // Sin documentos requeridos para edición
    }

    const requiredDocs = documentosBasicos.filter((doc) => doc.required);

    return requiredDocs
      .filter((doc) => {
        const documento = documentos[doc.key];

        return !(documento && (documento.file || documento.existente));
      })
      .map((doc) => doc.label);
  };

  const handleSaveWithDocuments = async () => {
    setLoading(true);
    try {
      const missingDocs = validateRequiredDocuments();

      if (missingDocs.length > 0) {
        addToast({
          title: "Documentos faltantes",
          description: `Faltan: ${missingDocs.join(", ")}`,
          color: "danger",
        });

        return;
      }

      // ✅ Verificar si hay al menos un documento nuevo para actualización
      if (conductorEditar) {
        const hayDocumentosNuevos = Object.values(documentos).some(
          (doc) => doc.file,
        );

        if (!hayDocumentosNuevos) {
          addToast({
            title: "Sin cambios",
            description:
              "Debe subir al menos un documento nuevo para actualizar",
            color: "warning",
          });

          return;
        }
      }

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

      const datosCompletos = {
        ...formData,
        documentos: documentosParaEnvio,
      };

      await onSaveWithIA(datosCompletos as Conductor);
    } catch (error) {
      console.error("Error en procesamiento con IA:", error);
      addToast({
        title: "Error",
        description: "Error al procesar con IA",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const getTituloModal = () => {
    if (conductorEditar) {
      return "Actualizar Conductor";
    }

    return titulo;
  };

  return (
    <Modal
      classNames={{
        base: "bg-white",
        backdrop: "bg-black/20 backdrop-blur-sm",
        closeButton: "hover:bg-gray-100 text-gray-500 top-4 right-4 z-50",
      }}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="5xl"
      onClose={handleClose}
    >
      <ModalContent>
        {() => (
          <>
            {/* Header minimalista */}
            <ModalHeader className="flex items-center gap-3 px-8 py-6 border-b border-gray-100">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {getTituloModal()}
                </h2>
                {conductorEditar && (
                  <p className="text-sm text-gray-500">
                    {conductorEditar.nombre} {conductorEditar.apellido}
                  </p>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="p-0">
              {/* Estado de procesamiento IA */}
              {procesamiento.sessionId &&
                procesamiento.estado !== "completado" && (
                  <div className="px-8 py-4 border-b border-gray-100">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Bot className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          Procesando con IA
                        </h3>
                      </div>
                      <Progress
                        className="mb-2"
                        color="primary"
                        value={procesamiento.progreso || 0}
                      />
                      <p className="text-sm text-blue-800">
                        {procesamiento.mensaje}
                      </p>
                      {procesamiento.error && (
                        <Alert className="mt-3" color="danger">
                          {procesamiento.error}
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

              {/* Estado completado */}
              {procesamiento.estado === "completado" && (
                <div className="px-8 py-4 border-b border-gray-100">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-green-900 mb-1">
                      Procesamiento Completado
                    </h3>
                    <p className="text-sm text-green-800">
                      La información se procesó correctamente
                    </p>
                  </div>
                </div>
              )}

              <Tabs
                className="w-full"
                classNames={{
                  base: "w-full",
                  tabList: "gap-6 w-full px-8 border-b border-gray-100",
                  cursor: "w-full bg-blue-600",
                  tab: "max-w-fit px-0 h-12 font-medium",
                  tabContent:
                    "group-data-[selected=true]:text-blue-600 text-gray-500",
                }}
                color="primary"
                disabledKeys={disabledTabs}
                selectedKey={activeTab}
                variant="underlined"
                onSelectionChange={(key) => setActiveTab(key as string)}
              >
                {/* Tab Documentos */}
                <Tab key="documentos-basicos" title="Documentos">
                  <div className="px-8 py-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Documentos de Registro
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Estos documentos actualizan la información básica no
                        cambiante del conductor
                      </p>

                      <div className="grid md:grid-cols-2 gap-6">
                        {documentosBasicos.map((docType) => {
                          const documento = documentos[docType.key];

                          return (
                            <div
                              key={docType.key}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                            >
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-gray-600" />
                                  <h4 className="font-medium text-gray-900">
                                    {docType.label}
                                  </h4>
                                  {!conductorEditar && docType.required && (
                                    <Chip
                                      color="danger"
                                      size="sm"
                                      variant="flat"
                                    >
                                      Requerido
                                    </Chip>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {docType.description}
                                </p>
                              </div>

                              <SimpleDocumentUploader
                                documentKey={docType.key}
                                errores={{}}
                                existingDocument={documento?.existente || null}
                                fecha_vigencia={
                                  documento?.fecha_vigencia || null
                                }
                                file={documento?.file || null}
                                isExisting={!!documento?.existente}
                                label=""
                                vigencia={false}
                                onChange={handleDocumentChange}
                                onRemove={handleDocumentRemove}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Tab>

                {/* Tab Actualizar Información */}
                <Tab key="info" title="Información Adicional">
                  <div className="px-8 py-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Información Cambiante
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Actualiza los datos que pueden cambiar con el tiempo
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          classNames={{
                            input: "placeholder:text-gray-400",
                            inputWrapper:
                              "border-gray-200 hover:border-gray-300",
                          }}
                          label="Teléfono"
                          name="telefono"
                          placeholder="Número de teléfono"
                          startContent={
                            <Phone className="h-4 w-4 text-gray-400" />
                          }
                          value={formDataCambiante.telefono}
                          onChange={(e) =>
                            setFormDataCambiante((prev) => ({
                              ...prev,
                              telefono: e.target.value,
                            }))
                          }
                        />

                        <Input
                          classNames={{
                            input: "placeholder:text-gray-400",
                            inputWrapper:
                              "border-gray-200 hover:border-gray-300",
                          }}
                          label="Email"
                          name="email"
                          placeholder="Correo electrónico"
                          startContent={
                            <Mail className="h-4 w-4 text-gray-400" />
                          }
                          type="email"
                          value={formDataCambiante.email}
                          onChange={(e) =>
                            setFormDataCambiante((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                        />

                        <Input
                          classNames={{
                            input: "placeholder:text-gray-400",
                            inputWrapper:
                              "border-gray-200 hover:border-gray-300",
                          }}
                          label="Dirección"
                          name="direccion"
                          placeholder="Dirección de residencia"
                          startContent={
                            <MapPin className="h-4 w-4 text-gray-400" />
                          }
                          value={formDataCambiante.direccion}
                          onChange={(e) =>
                            setFormDataCambiante((prev) => ({
                              ...prev,
                              direccion: e.target.value,
                            }))
                          }
                        />

                        <Input
                          classNames={{
                            input: "placeholder:text-gray-400",
                            inputWrapper:
                              "border-gray-200 hover:border-gray-300",
                          }}
                          label="Salario Base"
                          name="salario_base"
                          placeholder="Salario en COP"
                          startContent={
                            <DollarSign className="h-4 w-4 text-gray-400" />
                          }
                          type="text"
                          value={formatCurrency(
                            formDataCambiante.salario_base,
                            {
                              symbol: false,
                            },
                          )}
                          onChange={(e) => {
                            const inputVal = e.target.value.replace(
                              /[^\d]/g,
                              "",
                            );

                            setFormDataCambiante((prev) => ({
                              ...prev,
                              salario_base: inputVal,
                            }));
                          }}
                        />

                        <div className="col-span-2">
                          <SelectEstadoConductor
                            isRequired={true}
                            label="Estado del Conductor"
                            placeholder="Seleccionar estado"
                            value={formDataCambiante.estado}
                            onChange={(nuevoEstado) =>
                              setFormDataCambiante((prev) => ({
                                ...prev,
                                estado: nuevoEstado,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <Button
                          className="w-full sm:w-auto"
                          color="primary"
                          isLoading={loading}
                          startContent={
                            !loading && <Save className="h-4 w-4" />
                          }
                          onPress={handleSaveInformacionCambiante}
                        >
                          {loading
                            ? "Actualizando..."
                            : "Actualizar Información"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Tab>

                {/* Tab Documentos Requeridos */}
                <Tab
                  key="documentos-requeridos"
                  title={`Documentos Requeridos (${documentosRequeridos?.length || 0})`}
                >
                  <div className="px-8 py-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Documentos Adicionales
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Listado de documentos requeridos según las políticas de
                        la empresa
                      </p>

                      {!documentosRequeridos ||
                      documentosRequeridos.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500">
                            No hay documentos requeridos configurados
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documentosRequeridos.map((docRequerido) => (
                            <DocumentoRequeridoCard
                              key={docRequerido.id}
                              conductor={conductorEditar}
                              documento={docRequerido}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>

            {/* Footer */}
            {procesamiento.estado !== "completado" && (
              <ModalFooter className="px-8 py-4 border-t border-gray-100">
                <div className="flex justify-end gap-3">
                  <Button
                    color="danger"
                    isDisabled={loading}
                    variant="light"
                    onPress={handleClose}
                  >
                    Cancelar
                  </Button>

                  {activeTab === "documentos-basicos" &&
                    !procesamiento.sessionId && (
                      <Button
                        color="primary"
                        isLoading={loading}
                        startContent={!loading && <Bot className="h-4 w-4" />}
                        onPress={handleSaveWithDocuments}
                      >
                        {loading ? "Procesando con IA..." : "Procesar con IA"}
                      </Button>
                    )}
                </div>
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

// Componente para documentos requeridos
const DocumentoRequeridoCard: React.FC<{
  documento: any;
  conductor: Conductor | null;
}> = ({ documento, conductor }) => {
  const tieneDocumento = conductor?.documentos?.some((doc) =>
    doc.categoria?.includes(documento.documento.toUpperCase()),
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <h4 className="font-medium text-gray-900">{documento.documento}</h4>
            <div className="flex gap-2">
              {documento.es_obligatorio && (
                <Chip color="danger" size="sm" variant="flat">
                  Obligatorio
                </Chip>
              )}
              <Chip
                color={tieneDocumento ? "success" : "default"}
                size="sm"
                variant="flat"
              >
                {tieneDocumento ? "Completo" : "Pendiente"}
              </Chip>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Fecha creación:{" "}
            {new Date(documento.fecha_creacion).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-1">
          {tieneDocumento && (
            <Button
              isIconOnly
              className="text-gray-500 hover:text-blue-600"
              size="sm"
              variant="light"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {!tieneDocumento && (
            <Tooltip content="Subir documento">
              <Button
                isIconOnly
                className="text-gray-500 hover:text-green-600"
                size="sm"
                variant="light"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalFormConductor;
