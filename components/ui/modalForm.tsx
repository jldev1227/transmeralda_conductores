import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import {
  UserIcon,
  SaveIcon,
  CalendarIcon,
  DollarSignIcon,
  TruckIcon,
  HeartPulseIcon,
  IdCardIcon,
} from "lucide-react";

import {
  Conductor,
  EstadoConductor,
  SedeTrabajo,
  PermisosConductor,
} from "@/context/ConductorContext";

interface ModalFormConductorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conductor: Conductor) => Promise<void>; // Cambiar a Promise<void>
  conductorEditar?: Conductor | null;
  titulo?: string;
}

type ConductorKey = keyof Conductor;

// Tipos de identificación comunes en Colombia
const tiposIdentificacion = [
  { key: "CC", label: "Cédula de Ciudadanía" },
  { key: "CE", label: "Cédula de Extranjería" },
  { key: "TI", label: "Tarjeta de Identidad" },
  { key: "PA", label: "Pasaporte" },
  { key: "NIT", label: "NIT" },
];

// Categorías de licencia de conducción en Colombia
const categoriasLicencia = [
  { key: "A1", label: "A1 - Motocicletas hasta 125 cc" },
  { key: "A2", label: "A2 - Motocicletas de más de 125 cc" },
  { key: "B1", label: "B1 - Automóviles, camperos, camionetas" },
  { key: "B2", label: "B2 - Camiones rígidos, busetas y buses" },
  { key: "B3", label: "B3 - Vehículos articulados" },
  { key: "C1", label: "C1 - Automóviles, camperos, camionetas" },
  { key: "C2", label: "C2 - Camiones rígidos, busetas y buses" },
  { key: "C3", label: "C3 - Vehículos articulados" },
];

// Lista de EPS en Colombia
const listaEPS = [
  "Compensar",
  "Famisanar",
  "Nueva EPS",
  "Sanitas",
  "Sura",
  "Salud Total",
  "Coosalud",
  "Medimás",
  "Aliansalud",
  "Capital Salud",
  "Comfenalco Valle",
  "Otra",
];

// Lista de fondos de pensiones en Colombia
const listaFondosPension = [
  "Colpensiones",
  "Porvenir",
  "Protección",
  "Colfondos",
  "Old Mutual",
  "Otro",
];

// Lista de ARL en Colombia
const listaARL = [
  "Sura",
  "Positiva",
  "Colmena",
  "Bolívar",
  "Alfa",
  "Liberty",
  "Otra",
];

// Tipos de contrato
const tiposContrato = [
  { key: "INDEFINIDO", label: "Contrato a término indefinido" },
  { key: "FIJO", label: "Contrato a término fijo" },
  { key: "OBRA_LABOR", label: "Contrato por obra o labor" },
  { key: "PRESTACION", label: "Contrato de prestación de servicios" },
  { key: "TEMPORAL", label: "Contrato temporal" },
];

const ModalFormConductor: React.FC<ModalFormConductorProps> = ({
  isOpen,
  onClose,
  onSave,
  conductorEditar = null,
  titulo = "Registrar Nuevo Conductor",
}) => {
  // Estado para determinar si el conductor es de planta
  const [esPlanta, setEsPlanta] = useState<boolean>(true);

  // Estado para almacenar los datos del formulario
  const [formData, setFormData] = useState<Partial<Conductor>>({
    nombre: "",
    apellido: "",
    tipo_identificacion: "CC",
    numero_identificacion: "",
    telefono: "",
    email: "",
    password: "",
    cargo: "Conductor",
    estado: EstadoConductor.ACTIVO,
    permisos: {
      verViajes: true,
      verMantenimientos: false,
      verDocumentos: true,
      actualizarPerfil: true,
    },
  });

  // Estado para manejar la validación
  const [errores, setErrores] = useState<Record<string, boolean>>({
    nombre: false,
    apellido: false,
    numero_identificacion: false,
    telefono: false,
    email: false,
    password: false,
  });

  // Efecto para cargar datos cuando se está editando
  useEffect(() => {
    if (conductorEditar) {
      setFormData({
        ...conductorEditar,
        // Asegurarse de que la contraseña no se muestre (por seguridad)
        password: "",
      });

      // Determinar si es de planta basado en los campos
      const tieneInfoLaboral = !!(
        conductorEditar.cargo &&
        conductorEditar.fecha_ingreso &&
        conductorEditar.salario_base
      );

      setEsPlanta(tieneInfoLaboral);
    } else {
      // Resetear el formulario si no hay conductor para editar
      resetForm();
    }
  }, [conductorEditar, isOpen]);

  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      tipo_identificacion: "CC",
      numero_identificacion: "",
      telefono: "",
      email: "",
      password: "",
      cargo: "Conductor",
      estado: EstadoConductor.ACTIVO,
      permisos: {
        verViajes: true,
        verMantenimientos: false,
        verDocumentos: true,
        actualizarPerfil: true,
      },
    });
    setEsPlanta(true);
    setErrores({
      nombre: false,
      apellido: false,
      numero_identificacion: false,
      telefono: false,
      email: false,
      password: false,
    });
  };

  // Manejar cambios en los inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Limpiar error al escribir
    if (errores[name]) {
      setErrores((prev) => ({
        ...prev,
        [name]: false,
      }));
    }
  };

  // Manejar cambios en los switches
  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name === "esPlanta") {
      setEsPlanta(checked);

      return;
    }

    // Para otros switches (como permisos)
    if (name.startsWith("permisos.")) {
      const permisoKey = name.split(".")[1] as keyof PermisosConductor;

      setFormData((prev) => {
        // Asegúrate de que prev.permisos exista o crea un objeto vacío
        const prevPermisos = prev.permisos || {
          verViajes: false,
          verMantenimientos: false,
          verDocumentos: false,
          actualizarPerfil: false,
        };

        return {
          ...prev,
          permisos: {
            ...prevPermisos,
            [permisoKey]: checked,
          },
        };
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    }
  };

  // Validar y guardar datos
  const handleSave = () => {
    // Campos requeridos para todos los conductores

    // Asegúrate de que camposRequeridos contenga solo claves válidas
    const camposRequeridos: ConductorKey[] = [
      "nombre",
      "apellido",
      "tipo_identificacion",
      "numero_identificacion",
      "telefono",
      // Agrega otras claves según sea necesario
    ];

    // Campos adicionales requeridos para conductores de planta
    if (esPlanta) {
      camposRequeridos.push("email", "cargo", "fecha_ingreso", "salario_base");
    }

    // Validar campos requeridos
    const nuevosErrores: Record<ConductorKey, boolean> = {} as Record<
      ConductorKey,
      boolean
    >;

    camposRequeridos.forEach((campo) => {
      if (campo === "salario_base") {
        nuevosErrores[campo] = !formData[campo] || formData[campo] === 0;
      } else {
        nuevosErrores[campo] = !formData[campo]?.toString().trim();
      }
    });

    setErrores(nuevosErrores);

    // Si hay errores, no continuar
    if (Object.values(nuevosErrores).some((error) => error)) {
      return;
    }

    // Enviar datos
    onSave(formData as Conductor);
  };

  return (
    <Modal
      backdrop={"blur"}
      isOpen={isOpen}
      scrollBehavior="inside"
      size="4xl"
      onClose={onClose}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">
                  {conductorEditar ? "Editar Conductor" : titulo}
                </h3>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-6">
                {/* Switch para determinar si es de planta */}
                <div className="flex items-center justify-between border p-3 rounded-md bg-gray-50">
                  <div>
                    <span className="font-medium">Conductor de planta</span>
                    <p className="text-sm text-gray-500">
                      Marque esta opción si el conductor es empleado directo
                    </p>
                  </div>
                  <Switch
                    color="success"
                    isSelected={esPlanta}
                    onChange={(e) =>
                      handleSwitchChange("esPlanta", e.target.checked)
                    }
                  />
                </div>

                {/* Sección 1: Información básica (siempre visible) */}
                <div className="border p-4 rounded-md">
                  <h4 className="text-md font-semibold mb-4 border-b pb-2">
                    Información Básica
                  </h4>
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
                        <SelectItem key={tipo.key} textValue={tipo.key}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </Select>

                    <Input
                      isRequired
                      errorMessage={
                        errores.numero_identificacion
                          ? "El número de identificación es requerido"
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
                  </div>
                </div>

                {/* Solo mostrar el resto de secciones si es de planta */}
                {esPlanta && (
                  <>
                    {/* Sección 2: Información de Contacto y Acceso */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        Información de Contacto y Acceso
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          isRequired
                          errorMessage={
                            errores.email
                              ? "El correo electrónico es requerido"
                              : ""
                          }
                          isInvalid={errores.email}
                          label="Correo Electrónico"
                          name="email"
                          placeholder="Ingrese email"
                          type="email"
                          value={formData.email || ""}
                          onChange={handleChange}
                        />

                        <Input
                          errorMessage={
                            errores.password && !conductorEditar
                              ? "La contraseña es requerida"
                              : ""
                          }
                          isInvalid={errores.password && !conductorEditar}
                          isRequired={!conductorEditar}
                          label={
                            conductorEditar
                              ? "Nueva Contraseña (dejar en blanco para mantener)"
                              : "Contraseña"
                          }
                          name="password"
                          placeholder={
                            conductorEditar
                              ? "Nueva contraseña (opcional)"
                              : "Ingrese contraseña"
                          }
                          type="password"
                          value={formData.password || ""}
                          onChange={handleChange}
                        />

                        <Textarea
                          label="Dirección"
                          name="direccion"
                          placeholder="Ingrese dirección"
                          value={formData.direccion || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Sección 3: Información Personal */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        Información Personal
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Fecha de Nacimiento"
                          name="fecha_nacimiento"
                          placeholder="YYYY-MM-DD"
                          type="date"
                          value={formData.fecha_nacimiento || ""}
                          onChange={handleChange}
                        />

                        <Select
                          label="Género"
                          name="genero"
                          placeholder="Seleccione género"
                          value={formData.genero || ""}
                          onChange={handleChange}
                        >
                          <SelectItem key="masculino" textValue="Masculino">
                            Masculino
                          </SelectItem>
                          <SelectItem key="femenino" textValue="Femenino">
                            Femenino
                          </SelectItem>
                          <SelectItem key="otro" textValue="Otro">
                            Otro
                          </SelectItem>
                        </Select>

                        <Input
                          label="URL de Foto"
                          name="fotoUrl"
                          placeholder="URL de la foto (opcional)"
                          value={formData.fotoUrl || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Sección 4: Información Laboral */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        <span className="flex items-center">
                          <IdCardIcon className="h-4 w-4 mr-2" />
                          Información Laboral
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          isRequired
                          errorMessage={
                            errores.cargo ? "El cargo es requerido" : ""
                          }
                          isInvalid={errores.cargo}
                          label="Cargo"
                          name="cargo"
                          placeholder="Ingrese cargo"
                          value={formData.cargo || "Conductor"}
                          onChange={handleChange}
                        />

                        <Input
                          isRequired
                          errorMessage={
                            errores.fecha_ingreso
                              ? "La fecha de ingreso es requerida"
                              : ""
                          }
                          isInvalid={errores.fecha_ingreso}
                          label="Fecha de Ingreso"
                          name="fecha_ingreso"
                          placeholder="YYYY-MM-DD"
                          startContent={
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                          }
                          type="date"
                          value={formData.fecha_ingreso || ""}
                          onChange={handleChange}
                        />

                        <Input
                          isRequired
                          errorMessage={
                            errores.salario_base
                              ? "El salario base es requerido"
                              : ""
                          }
                          isInvalid={errores.salario_base}
                          label="Salario Base"
                          name="salario_base"
                          placeholder="Ingrese salario base"
                          startContent={
                            <DollarSignIcon className="h-4 w-4 text-gray-500" />
                          }
                          type="number"
                          value={formData.salario_base?.toString() || ""}
                          onChange={handleChange}
                        />

                        <Select
                          label="Tipo de Contrato"
                          name="tipo_contrato"
                          placeholder="Seleccione tipo de contrato"
                          value={formData.tipo_contrato || ""}
                          onChange={handleChange}
                        >
                          {tiposContrato.map((tipo) => (
                            <SelectItem key={tipo.key} textValue={tipo.key}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </Select>

                        <Select
                          label="Sede de Trabajo"
                          name="sede_trabajo"
                          placeholder="Seleccione sede"
                          value={formData.sede_trabajo || ""}
                          onChange={handleChange}
                        >
                          {Object.entries(SedeTrabajo).map(([key, value]) => (
                            <SelectItem key={key} textValue={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </Select>

                        <Select
                          label="Estado"
                          name="estado"
                          placeholder="Seleccione estado"
                          value={formData.estado || EstadoConductor.ACTIVO}
                          onChange={handleChange}
                        >
                          {Object.entries(EstadoConductor).map(
                            ([key, value]) => (
                              <SelectItem key={key} textValue={value}>
                                {value}
                              </SelectItem>
                            ),
                          )}
                        </Select>
                      </div>
                    </div>

                    {/* Sección 5: Seguridad Social */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        <span className="flex items-center">
                          <HeartPulseIcon className="h-4 w-4 mr-2" />
                          Seguridad Social
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                          label="EPS"
                          name="eps"
                          placeholder="Seleccione EPS"
                          value={formData.eps || ""}
                          onChange={handleChange}
                        >
                          {listaEPS.map((eps) => (
                            <SelectItem key={eps} textValue={eps}>
                              {eps}
                            </SelectItem>
                          ))}
                        </Select>

                        <Select
                          label="Fondo de Pensión"
                          name="fondo_pension"
                          placeholder="Seleccione fondo"
                          value={formData.fondo_pension || ""}
                          onChange={handleChange}
                        >
                          {listaFondosPension.map((fondo) => (
                            <SelectItem key={fondo} textValue={fondo}>
                              {fondo}
                            </SelectItem>
                          ))}
                        </Select>

                        <Select
                          label="ARL"
                          name="arl"
                          placeholder="Seleccione ARL"
                          value={formData.arl || ""}
                          onChange={handleChange}
                        >
                          {listaARL.map((arl) => (
                            <SelectItem key={arl} textValue={arl}>
                              {arl}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    </div>

                    {/* Sección 6: Licencia de Conducción */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        <span className="flex items-center">
                          <TruckIcon className="h-4 w-4 mr-2" />
                          Licencia de Conducción
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="Número de Licencia"
                          name="licencia_conduccion"
                          placeholder="Ingrese número de licencia"
                          value={formData.licencia_conduccion || ""}
                          onChange={handleChange}
                        />

                        <Select
                          label="Categoría"
                          name="categoria_licencia"
                          placeholder="Seleccione categoría"
                          value={formData.categoria_licencia || ""}
                          onChange={handleChange}
                        >
                          {categoriasLicencia.map((cat) => (
                            <SelectItem key={cat.key} textValue={cat.key}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </Select>

                        <Input
                          label="Fecha de Vencimiento"
                          name="vencimiento_licencia"
                          placeholder="YYYY-MM-DD"
                          startContent={
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                          }
                          type="date"
                          value={formData.vencimiento_licencia || ""}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Sección 7: Permisos */}
                    <div className="border p-4 rounded-md">
                      <h4 className="text-md font-semibold mb-4 border-b pb-2">
                        Permisos del Sistema
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              Ver Viajes
                            </span>
                            <p className="text-xs text-gray-500">
                              Permite ver la información de viajes
                            </p>
                          </div>
                          <Switch
                            color="success"
                            isSelected={formData.permisos?.verViajes}
                            onChange={(e) =>
                              handleSwitchChange(
                                "permisos.verViajes",
                                e.target.checked,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              Ver Mantenimientos
                            </span>
                            <p className="text-xs text-gray-500">
                              Permite ver mantenimientos de vehículos
                            </p>
                          </div>
                          <Switch
                            color="success"
                            isSelected={formData.permisos?.verMantenimientos}
                            onChange={(e) =>
                              handleSwitchChange(
                                "permisos.verMantenimientos",
                                e.target.checked,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              Ver Documentos
                            </span>
                            <p className="text-xs text-gray-500">
                              Permite ver documentos
                            </p>
                          </div>
                          <Switch
                            color="success"
                            isSelected={formData.permisos?.verDocumentos}
                            onChange={(e) =>
                              handleSwitchChange(
                                "permisos.verDocumentos",
                                e.target.checked,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">
                              Actualizar Perfil
                            </span>
                            <p className="text-xs text-gray-500">
                              Permite actualizar su propio perfil
                            </p>
                          </div>
                          <Switch
                            color="success"
                            isSelected={formData.permisos?.actualizarPerfil}
                            onChange={(e) =>
                              handleSwitchChange(
                                "permisos.actualizarPerfil",
                                e.target.checked,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                color="danger"
                radius="sm"
                variant="light"
                onPress={onClose}
              >
                Cancelar
              </Button>
              <Button
                className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                startContent={<SaveIcon className="h-4 w-4" />}
                onPress={handleSave}
              >
                {conductorEditar ? "Actualizar" : "Guardar"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ModalFormConductor;
