"use client"

import React, { useState, useEffect } from "react";

import { Conductor, useConductor, EstadoConductor } from "@/context/ConductorContext";
import ConductoresTable from "@/components/ui/table";
import { SortDescriptor } from "@/components/ui/customTable";
import { Button } from "@heroui/button";
import { PlusIcon } from "lucide-react";
import ModalForm from "@/components/ui/modalForm";
import ModalDetalleConductor from "@/components/ui/modalDetalle";
import BuscadorFiltrosConductores, { FilterOptions } from "@/components/ui/buscadorFiltros";

export default function GestionConductores() {
  const { conductoresState, handlePageChange, handleSortChange, crearConductor, actualizarConductor, fetchConductores } = useConductor();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor, _] = useState<SortDescriptor>({
    column: "nombre",
    direction: "ascending",
  });

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filtros, setFiltros] = useState<FilterOptions>({
    sedes: [],
    tiposIdentificacion: [],
    tiposContrato: [],
    estados: []
  });
  const [conductoresFiltrados, setConductoresFiltrados] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Estados para los modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(null);
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] = useState<Conductor | null>(null);

  // Efecto para aplicar filtros y búsqueda
  useEffect(() => {
    filtrarConductores();
  }, [conductoresState.data, searchTerm, filtros]);

  // Función para filtrar conductores basados en búsqueda y filtros
  const filtrarConductores = () => {
    let resultados = [...conductoresState.data];

    // Aplicar búsqueda
    if (searchTerm) {
      const termino = searchTerm.toLowerCase();
      resultados = resultados.filter(conductor => 
        conductor.nombre.toLowerCase().includes(termino) ||
        conductor.apellido.toLowerCase().includes(termino) ||
        conductor.email?.toLowerCase().includes(termino) ||
        conductor.numero_identificacion?.toLowerCase().includes(termino) ||
        conductor.telefono?.toLowerCase().includes(termino)
      );
    }

    // Aplicar filtros de sede
    if (filtros.sedes.length > 0) {
      resultados = resultados.filter(conductor => 
        conductor.sede_trabajo && filtros.sedes.includes(conductor.sede_trabajo)
      );
    }

    // Aplicar filtros de tipo de identificación
    if (filtros.tiposIdentificacion.length > 0) {
      resultados = resultados.filter(conductor => 
        filtros.tiposIdentificacion.includes(conductor.tipo_identificacion)
      );
    }

    // Aplicar filtros de tipo de contrato
    if (filtros.tiposContrato.length > 0) {
      resultados = resultados.filter(conductor => 
        conductor.tipo_contrato && filtros.tiposContrato.includes(conductor.tipo_contrato)
      );
    }

    // Aplicar filtros de estado
    if (filtros.estados.length > 0) {
      resultados = resultados.filter(conductor => 
        filtros.estados.includes(conductor.estado)
      );
    }

    setConductoresFiltrados(resultados);
  };

  // Manejar la búsqueda
  const handleSearch = (termino: string) => {
    setSearchTerm(termino);
    console.log(termino)
  };

  // Manejar los filtros
  const handleFilter = (nuevosFiltros: FilterOptions) => {
    setFiltros(nuevosFiltros);
  };

  // Manejar reset de búsqueda y filtros
  const handleReset = () => {
    setSearchTerm("");
    setFiltros({
      sedes: [],
      tiposIdentificacion: [],
      tiposContrato: [],
      estados: []
    });
    // Opcional: Recargar los datos
    fetchConductores(1);
  };

  // Manejar exportación (ejemplo)
  const handleExport = () => {
    // Implementar la lógica de exportación
    alert('Funcionalidad de exportación: Implementar según necesidades');
  };

  // Manejar la selección de conductores
  const handleSelectItem = (conductor: Conductor) => {
    if (selectedIds.includes(conductor.id)) {
      setSelectedIds(selectedIds.filter(id => id !== conductor.id));
    } else {
      setSelectedIds([...selectedIds, conductor.id]);
    }
  };

  // Funciones para el modal de detalle
  const abrirModalDetalle = (id: string) => {
    setSelectedConductorId(id);
    setModalDetalleOpen(true);
  };

  // Funciones para el modal de formulario (crear/editar)
  const abrirModalCrear = () => {
    setConductorParaEditar(null);
    setModalFormOpen(true);
  };

  const abrirModalEditar = (conductor: Conductor) => {
    setConductorParaEditar(conductor);
    setModalFormOpen(true);
  };

  const cerrarModalForm = () => {
    setModalFormOpen(false);
    setConductorParaEditar(null);
  };

  const cerrarModalDetalle = () => {
    setModalDetalleOpen(false);
    setSelectedConductorId(null);
  };

  // Función para guardar conductor (nueva o editada)
  const guardarConductor = async (conductorData: Conductor) => {
    try {
      setLoading(true);
      if (conductorData.id) {
        // Editar conductor existente
        await actualizarConductor(conductorData.id, conductorData);
      } else {
        // Crear nuevo conductor
        await crearConductor(conductorData);
      }

      // Si llegamos aquí, significa que la operación fue exitosa
      // Cerrar modal después de guardar correctamente
      cerrarModalForm();
    } catch (error) {
      // Si hay un error, no hacemos nada aquí ya que los errores ya son manejados
      console.log("Error al guardar el conductor, el modal permanece abierto:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-5 sm:p-10 space-y-5">
      <div className="flex gap-3 flex-col sm:flex-row w-full items-start md:items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          Gestión de Conductores
        </h1>
        <Button
          className="w-full sm:w-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          color="primary"
          radius="sm"
          startContent={<PlusIcon />}
          onPress={abrirModalCrear}
          isDisabled={loading}
        >
          Nuevo Conductor
        </Button>
      </div>

      {/* Componente de búsqueda y filtros */}
      <BuscadorFiltrosConductores
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={handleExport}
        onReset={handleReset}
      />

      {/* Información sobre resultados filtrados */}
      {(searchTerm || Object.values(filtros).some(f => f.length > 0)) && (
        <div className="bg-blue-50 p-3 rounded-md text-blue-700 text-sm">
          Mostrando {conductoresFiltrados.length} resultado(s) de {conductoresState.count} conductor(es) total(es)
          {searchTerm && <span> - Búsqueda: "{searchTerm}"</span>}
        </div>
      )}

      {/* Tabla de conductores con paginación */}
      <ConductoresTable
        currentItems={searchTerm || Object.values(filtros).some(f => f.length > 0) 
          ? conductoresFiltrados 
          : conductoresState.data}
        sortDescriptor={sortDescriptor}
        selectedIds={selectedIds}
        onSelectItem={handleSelectItem}
        // Propiedades de paginación
        currentPage={conductoresState.currentPage}
        totalPages={conductoresState.totalPages}
        totalCount={conductoresState.count}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        abrirModalEditar={abrirModalEditar}
        abrirModalDetalle={abrirModalDetalle}
        isLoading={loading}
      />

      {/* Modal de formulario (crear/editar) */}
      <ModalForm
        isOpen={modalFormOpen}
        onClose={cerrarModalForm}
        onSave={guardarConductor}
        conductorEditar={conductorParaEditar}
        titulo={conductorParaEditar ? "Editar Conductor" : "Registrar Nuevo Conductor"}
      />

      {/* Modal de detalle */}
      <ModalDetalleConductor
        isOpen={modalDetalleOpen}
        onClose={cerrarModalDetalle}
        conductor={conductoresState.data.find(conductor => conductor.id === selectedConductorId) || null}
        onEdit={() => {
          setModalDetalleOpen(false);
          setModalFormOpen(true);
          setConductorParaEditar(conductoresState.data.find(conductor => conductor.id === selectedConductorId) || null);
        }}
      />
    </div>
  );
}