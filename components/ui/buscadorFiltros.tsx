
import React, { useState, useEffect } from "react";
import {
    Input,
} from "@heroui/input";
import {
    Divider
} from "@heroui/divider";
import {
    Button
} from "@heroui/button";
import {
    Chip
} from "@heroui/chip";
import {
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    DropdownSection,
} from "@heroui/dropdown";
import {
    CheckboxGroup,
    Checkbox
} from "@heroui/checkbox";
import {
    Search,
    Filter,
    X,
    FileDown,
    RefreshCw
} from "lucide-react";
import { SedeTrabajo, EstadoConductor } from "@/context/ConductorContext";

// Tipos de identificación
const tiposIdentificacion = [
    { key: "CC", label: "Cédula de Ciudadanía" },
    { key: "CE", label: "Cédula de Extranjería" },
    { key: "TI", label: "Tarjeta de Identidad" },
    { key: "PA", label: "Pasaporte" },
    { key: "NIT", label: "NIT" },
];

// Tipos de contrato
const tiposContrato = [
    { key: "INDEFINIDO", label: "Contrato a término indefinido" },
    { key: "FIJO", label: "Contrato a término fijo" },
    { key: "OBRA_LABOR", label: "Contrato por obra o labor" },
    { key: "PRESTACION", label: "Contrato de prestación de servicios" },
    { key: "TEMPORAL", label: "Contrato temporal" },
];

interface BuscadorFiltrosConductoresProps {
    onSearch: (searchTerm: string) => void;
    onFilter: (filters: FilterOptions) => void;
    onExport?: () => void;
    onReset: () => void;
}

export interface FilterOptions {
    sedes: string[];
    tiposIdentificacion: string[];
    tiposContrato: string[];
    estados: EstadoConductor[];
}

const BuscadorFiltrosConductores: React.FC<BuscadorFiltrosConductoresProps> = ({
    onSearch,
    onFilter,
    onExport,
    onReset
}) => {
    // Estado para el término de búsqueda
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Estado para los filtros seleccionados
    const [filtros, setFiltros] = useState<FilterOptions>({
        sedes: [],
        tiposIdentificacion: [],
        tiposContrato: [],
        estados: []
    });

    // Estado para mostrar/ocultar los filtros
    const [mostrarFiltros, setMostrarFiltros] = useState<boolean>(false);

    // Efecto para aplicar filtros cuando cambian
    useEffect(() => {
        onFilter(filtros);
    }, [filtros]);

    // Manejar cambio en el término de búsqueda
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    // Aplicar búsqueda al presionar Enter o el botón
    const aplicarBusqueda = () => {
        onSearch(searchTerm);
    };

    // Manejar tecla Enter en el campo de búsqueda
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            aplicarBusqueda();
        }
    };

    // Manejar cambios en los filtros
    const handleFiltroChange = (tipo: keyof FilterOptions, valores: string[]) => {
        setFiltros(prev => ({
            ...prev,
            [tipo]: valores
        }));
    };

    // Función para borrar todos los filtros
    const limpiarFiltros = () => {
        setSearchTerm("");
        setFiltros({
            sedes: [],
            tiposIdentificacion: [],
            tiposContrato: [],
            estados: []
        });
        onReset();
    };

    // Contar filtros activos
    const contarFiltrosActivos = () => {
        return filtros.sedes.length + filtros.tiposIdentificacion.length +
            filtros.tiposContrato.length + filtros.estados.length;
    };

    // Renderizar tags de filtros seleccionados
    const renderFiltrosSeleccionados = () => {
        const todosLosFiltros = [
            ...filtros.sedes.map(sede => ({ tipo: 'sedes', valor: sede, label: `Sede: ${sede}` })),
            ...filtros.tiposIdentificacion.map(tipo => ({
                tipo: 'tiposIdentificacion',
                valor: tipo,
                label: `ID: ${tiposIdentificacion.find(t => t.key === tipo)?.label || tipo}`
            })),
            ...filtros.tiposContrato.map(contrato => ({
                tipo: 'tiposContrato',
                valor: contrato,
                label: `Contrato: ${tiposContrato.find(t => t.key === contrato)?.label || contrato}`
            })),
            ...filtros.estados.map(estado => ({ tipo: 'estados', valor: estado, label: `Estado: ${estado}` }))
        ];

        if (todosLosFiltros.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {todosLosFiltros.map((filtro, index) => (
                    <Chip
                        key={`${filtro.tipo}-${index}`}
                        variant="flat"
                        color="secondary"
                        onClose={() => {
                            const nuevosFiltros = { ...filtros };
                            (nuevosFiltros[filtro.tipo as keyof FilterOptions] as string[]) =
                                (nuevosFiltros[filtro.tipo as keyof FilterOptions] as string[]).filter(
                                    val => val !== filtro.valor
                                );
                            setFiltros(nuevosFiltros);
                        }}
                    >
                        {filtro.label}
                    </Chip>
                ))}
                {todosLosFiltros.length > 0 && (
                    <Chip
                        variant="flat"
                        color="danger"
                        onClose={limpiarFiltros}
                    >
                        Limpiar todos
                    </Chip>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
                {/* Buscador */}
                <div className="flex-grow">
                    <Input
                        type="text"
                        placeholder="Buscar por nombre, correo, cédula o teléfono..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyPress={handleKeyPress}
                        startContent={<Search className="text-gray-400" size={18} />}
                        endContent={
                            searchTerm && (
                                <button onClick={() => { setSearchTerm(""); onSearch(""); }}>
                                    <X className="text-gray-400" size={18} />
                                </button>
                            )
                        }
                        className="w-full"
                    />
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2">
                    <Button
                        color="primary"
                        variant="solid"
                        onPress={aplicarBusqueda}
                        className="w-full md:w-auto"
                    >
                        Buscar
                    </Button>

                    <Dropdown>
                        <DropdownTrigger>
                            <Button
                                color="secondary"
                                variant="flat"
                                startContent={<Filter size={18} />}
                                endContent={
                                    contarFiltrosActivos() > 0 ? (
                                        <div className="rounded-full bg-emerald-500 text-white text-xs h-5 w-5 flex items-center justify-center">
                                            {contarFiltrosActivos()}
                                        </div>
                                    ) : null
                                }
                                className="w-full md:w-auto"
                            >
                                Filtros
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Filtros de conductores" className="w-56">
                            <DropdownSection title="Sedes" showDivider>
                                <CheckboxGroup
                                    value={filtros.sedes}
                                    onValueChange={(value) => handleFiltroChange('sedes', value as string[])}
                                >
                                    {Object.values(SedeTrabajo).map((sede) => (
                                        <Checkbox key={sede} value={sede}>{sede}</Checkbox>
                                    ))}
                                </CheckboxGroup>
                            </DropdownSection>

                            <DropdownSection title="Tipo de Identificación" showDivider>
                                <CheckboxGroup
                                    value={filtros.tiposIdentificacion}
                                    onValueChange={(value) => handleFiltroChange('tiposIdentificacion', value as string[])}
                                >
                                    {tiposIdentificacion.map((tipo) => (
                                        <Checkbox key={tipo.key} value={tipo.key}>{tipo.label}</Checkbox>
                                    ))}
                                </CheckboxGroup>
                            </DropdownSection>

                            <DropdownSection title="Tipo de Contrato" showDivider>
                                <CheckboxGroup
                                    value={filtros.tiposContrato}
                                    onValueChange={(value) => handleFiltroChange('tiposContrato', value as string[])}
                                >
                                    {tiposContrato.map((tipo) => (
                                        <Checkbox key={tipo.key} value={tipo.key}>{tipo.label}</Checkbox>
                                    ))}
                                </CheckboxGroup>
                            </DropdownSection>

                            <DropdownSection title="Estado">
                                <CheckboxGroup
                                    value={filtros.estados}
                                    onValueChange={(value) => handleFiltroChange('estados', value as string[])}
                                >
                                    {Object.values(EstadoConductor).map((estado) => (
                                        <Checkbox key={estado} value={estado}>{estado}</Checkbox>
                                    ))}
                                </CheckboxGroup>
                            </DropdownSection>

                            <Divider className="my-2" />
                            <DropdownItem
                                key="reset-filters"
                                className="text-danger"
                                startContent={<RefreshCw size={18} />}
                                onPress={limpiarFiltros}
                            >
                                Limpiar filtros
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>

                    {onExport && (
                        <Button
                            color="default"
                            variant="flat"
                            startContent={<FileDown size={18} />}
                            onPress={onExport}
                            className="w-full md:w-auto"
                        >
                            Exportar
                        </Button>
                    )}
                </div>
            </div>

            {/* Mostrar filtros activos */}
            {renderFiltrosSeleccionados()}
        </div>
    );
};

export default BuscadorFiltrosConductores;