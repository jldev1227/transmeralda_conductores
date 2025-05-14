"use client"

import React, { useState } from "react";

import { Conductor, useConductor } from "@/context/ConductorContext";
import ConductoresTable from "@/components/ui/table";
import { SortDescriptor } from "@/components/ui/customTable";
import { Button } from "@heroui/button";
import { PlusIcon } from "lucide-react";
import ModalForm from "@/components/ui/modalForm";
import ModalDetalleConductor from "@/components/ui/modalDetalle";


export default function GestionConductores() {
  const { conductoresState, handlePageChange, handleSortChange, crearConductor, actualizarConductor } = useConductor()
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDescriptor, _] = useState<SortDescriptor>({
    column: "nombre",
    direction: "ascending",
  });
  // Estados para los modales
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [selectedConductorId, setSelectedConductorId] = useState<string | null>(null);

  // Estados para el modal de formulario (crear/editar)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [conductorParaEditar, setConductorParaEditar] = useState<Conductor | null>(null);

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
      if (conductorData.id) {
        // Editar empresa existente
        console.log("actualizando")
        await actualizarConductor(conductorData.id, conductorData)
      } else {
        // Crear nueva empresa
        console.log("creando")
        await crearConductor(conductorData)
      }

      // Si llegamos aquí, significa que la operación fue exitosa
      // Cerrar modal después de guardar correctamente
      cerrarModalForm();

    } catch (error) {
      // Si hay un error, no hacemos nada aquí ya que los errores ya son manejados
      // en las funciones createEmpresa y updateEmpresa con addToast

      // No cerramos el modal para que el usuario pueda corregir los datos
      console.log("Error al guardar la empresa, el modal permanece abierto:", error);

      // Opcionalmente, puedes agregar un mensaje adicional para el usuario
      // indicando que debe corregir los errores para continuar
    }
  };


  return (
    <div className="container mx-auto p-10 space-y-5">
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
        >
          Nuevo Conductor
        </Button>
      </div>

      {/* Tabla de conductores con paginación */}
      <ConductoresTable
        currentItems={conductoresState.data}
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
      />

      {/* Modal de formulario (crear/editar) */}
      <ModalForm
        isOpen={modalFormOpen}
        onClose={cerrarModalForm}
        onSave={guardarConductor}
        conductorEditar={conductorParaEditar}
        titulo={conductorParaEditar ? "Editar Conductor" : "Registrar Nuevo Conductor"}
      />

      <ModalDetalleConductor
        isOpen={modalDetalleOpen}
        onClose={cerrarModalDetalle}
        conductor={conductoresState.data.filter(conductor=> conductor.id === selectedConductorId)[0]}
        onEdit={() => {
          setModalDetalleOpen(false);
          setModalFormOpen(true);
          setConductorParaEditar(conductoresState.data.filter(conductor=> conductor.id === selectedConductorId)[0])
        }}
      />

    </div>
  );
}