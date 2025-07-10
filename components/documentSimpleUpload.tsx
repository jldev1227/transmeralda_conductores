"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { DatePicker } from "@heroui/date-picker";
import {
  Upload,
  FileText,
  XCircle,
  Calendar,
  Download,
  Crop,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import ReactCrop, {
  Crop as CropType,
  centerCrop,
  makeAspectCrop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { apiClient } from "@/config/apiClient";
import { Documento } from "@/context/ConductorContext";

// Formatter para fechas en español
const formatter = new Intl.DateTimeFormat("es-ES", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// ✅ Interfaz para documentos existentes
interface DocumentoExistente {
  id: string;
  categoria: string;
  nombre_original: string;
  fecha_vigencia: string | null;
  estado: string;
  s3_key: string;
  size: number;
  upload_date: string;
}

// ✅ Tipos de archivos permitidos
type FileType = "image" | "pdf" | "document" | "any";

interface SimpleDocumentUploaderProps {
  documentKey: string;
  label: string;
  required?: boolean;
  vigencia?: boolean;
  file?: File | null;
  fecha_vigencia?: Date | null;
  onChange?: (documentKey: string, file: File, fecha_vigencia?: Date) => void;
  onRemove?: (documentKey: string) => void;
  disabled?: boolean;
  errores?: Record<string, boolean>;
  // ✅ Nuevas props para documentos existentes
  existingDocument?: DocumentoExistente | null;
  isExisting?: boolean;
  // ✅ Nueva prop para tipo de archivo
  fileType?: FileType;
}

const SimpleDocumentUploader = ({
  documentKey,
  label,
  required = false,
  vigencia = false,
  file = null,
  fecha_vigencia = null,
  onChange,
  onRemove,
  disabled = false,
  errores = {},
  existingDocument = null,
  isExisting = false,
  fileType = "any",
}: SimpleDocumentUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Estados para el crop de imágenes
  const [showCrop, setShowCrop] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ✅ Función para obtener los tipos de archivo aceptados
  const getAcceptedTypes = (type: FileType): string => {
    switch (type) {
      case "image":
        return ".jpg,.jpeg,.png,.webp";
      case "pdf":
        return ".pdf";
      case "document":
        return ".pdf,.doc,.docx";
      default:
        return ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx";
    }
  };

  // ✅ Función para obtener la descripción de tipos permitidos
  const getFileTypeDescription = (type: FileType): string => {
    switch (type) {
      case "image":
        return "JPG, PNG o WEBP (Máx. 10MB)";
      case "pdf":
        return "PDF (Máx. 10MB)";
      case "document":
        return "PDF, DOC o DOCX (Máx. 10MB)";
      default:
        return "PDF, JPG, PNG o documentos (Máx. 10MB)";
    }
  };

  // ✅ Función para verificar si es una imagen
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  // ✅ Función para validar la extensión del archivo
  const validateFileExtension = (
    file: File,
    allowedType: FileType,
  ): boolean => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf("."));

    const allowedExtensions: Record<FileType, string[]> = {
      image: [".jpg", ".jpeg", ".png", ".webp"],
      pdf: [".pdf"],
      document: [".pdf", ".doc", ".docx"],
      any: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"],
    };

    return allowedExtensions[allowedType].includes(fileExtension);
  };

  // ✅ Función para validar el tamaño del archivo (10MB máximo)
  const validateFileSize = (file: File): boolean => {
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB

    return file.size <= maxSizeInBytes;
  };

  // ✅ Función para obtener el mensaje de error según el tipo de validación
  const getValidationErrorMessage = (
    file: File,
    type: FileType,
  ): string | null => {
    if (!validateFileSize(file)) {
      return `El archivo excede el tamaño máximo permitido de 10MB. Tamaño actual: ${formatFileSize(file.size)}`;
    }

    if (!validateFileExtension(file, type)) {
      const allowedExtensions = getAcceptedTypes(type).split(",").join(", ");

      return `Tipo de archivo no permitido. Extensiones permitidas: ${allowedExtensions}`;
    }

    return null;
  };

  // ✅ Función para crear el archivo recortado
  const createCroppedFile = async (
    image: HTMLImageElement,
    pixelCrop: PixelCrop,
    fileName: string,
  ): Promise<File> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener el contexto del canvas");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error("Error al crear el blob de la imagen");
          }
          const file = new File([blob], fileName, { type: "image/jpeg" });

          resolve(file);
        },
        "image/jpeg",
        0.9,
      );
    });
  };

  // ✅ Manejar la confirmación del crop
  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current || !originalFile) {
      return;
    }

    try {
      const croppedFile = await createCroppedFile(
        imgRef.current,
        completedCrop,
        originalFile.name,
      );

      const dateValue = calendarDateToDate(selectedDate);

      onChange?.(documentKey, croppedFile, dateValue || undefined);

      // Limpiar estados del crop
      setShowCrop(false);
      setImgSrc("");
      setCrop(undefined);
      setCompletedCrop(undefined);
      setOriginalFile(null);
      setFileError(null);
    } catch (error) {
      console.error("Error al recortar la imagen:", error);
      setFileError("Error al recortar la imagen. Por favor, intenta de nuevo.");
    }
  };

  // ✅ Cancelar el crop
  const handleCropCancel = () => {
    setShowCrop(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setOriginalFile(null);
    setFileError(null);

    // Limpiar el input file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ✅ Manejar cuando la imagen se carga en el crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (documentKey === "FOTO_PERFIL") {
      const { width, height } = e.currentTarget;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: "%",
            width: 90,
          },
          1, // Aspecto cuadrado para fotos de perfil
          width,
          height,
        ),
        width,
        height,
      );

      setCrop(crop);
    }
  };

  // ✅ Inicializar fecha desde documento existente o fecha_vigencia prop
  useEffect(() => {
    if (fecha_vigencia) {
      const date = new Date(fecha_vigencia);

      setSelectedDate(
        new CalendarDate(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        ),
      );
    } else if (existingDocument?.fecha_vigencia) {
      const date = new Date(existingDocument.fecha_vigencia);

      setSelectedDate(
        new CalendarDate(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        ),
      );
    }
  }, [fecha_vigencia, existingDocument]);

  // Convertir CalendarDate a Date
  const calendarDateToDate = (
    calendarDate: CalendarDate | null,
  ): Date | null => {
    if (!calendarDate) return null;

    return new Date(
      calendarDate.year,
      calendarDate.month - 1,
      calendarDate.day,
    );
  };

  // Manejar cambios de fecha y actualizar el archivo si existe
  useEffect(() => {
    if (file && selectedDate) {
      const dateValue = calendarDateToDate(selectedDate);

      onChange?.(documentKey, file, dateValue || undefined);
    }
  }, [selectedDate, file, documentKey]);

  // ✅ Función para procesar el archivo seleccionado con validación
  const processSelectedFile = (selectedFile: File) => {
    if (disabled) return;

    // Limpiar errores previos
    setFileError(null);

    // ✅ VALIDAR ARCHIVO - SI NO ES VÁLIDO, RETORNAR SIN PROCESAR
    const validationError = getValidationErrorMessage(selectedFile, fileType);

    if (validationError) {
      setFileError(validationError);

      // Limpiar el input file para permitir seleccionar de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // ✅ RETORNAR AQUÍ PARA QUE NO ENTRE EN EL ARRAY
      return;
    }

    // Si es FOTO_PERFIL y es una imagen válida, abrir el crop
    if (documentKey === "FOTO_PERFIL" && isImageFile(selectedFile)) {
      const reader = new FileReader();

      reader.onload = () => {
        setImgSrc(reader.result?.toString() || "");
        setOriginalFile(selectedFile);
        setShowCrop(true);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // Para otros tipos de archivo válidos
      const dateValue = calendarDateToDate(selectedDate);

      onChange?.(documentKey, selectedFile, dateValue || undefined);
    }
  };

  // Manejar drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFile = e.dataTransfer.files[0];

      processSelectedFile(newFile);
    }
  };

  // Manejar selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.target.files && e.target.files.length > 0) {
      const newFile = e.target.files[0];

      processSelectedFile(newFile);
    }
  };

  // Manejar eliminación
  const handleRemove = () => {
    if (disabled) return;

    setSelectedDate(null);
    setFileError(null);
    onRemove?.(documentKey);

    // Limpiar el input file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Formatear tamaño del archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ✅ Determinar qué mostrar: archivo nuevo o documento existente
  const hasContent = file || existingDocument;
  const displayName = file
    ? file.name
    : existingDocument?.nombre_original || "";
  const displaySize = file ? file.size : existingDocument?.size || 0;

  // OPCIÓN 3: Descarga con fetch a través del backend
  const handleDownload = async (documento: Documento | DocumentoExistente) => {
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

  // ✅ Modal de crop para imágenes
  if (showCrop && imgSrc) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recortar imagen de perfil</h3>
            <Button
              isIconOnly
              color="danger"
              variant="light"
              onPress={handleCropCancel}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <ReactCrop
              aspect={1} // Aspecto cuadrado para fotos de perfil
              crop={crop}
              minHeight={100}
              minWidth={100}
              onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
            >
              <img
                ref={imgRef}
                alt="Imagen a recortar"
                src={imgSrc}
                style={{ maxHeight: "400px", maxWidth: "100%" }}
                onLoad={onImageLoad}
              />
            </ReactCrop>

            <div className="flex justify-end gap-2">
              <Button color="danger" variant="light" onPress={handleCropCancel}>
                Cancelar
              </Button>
              <Button
                color="primary"
                isDisabled={!completedCrop}
                onPress={handleCropConfirm}
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar recorte
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between items-center">
        <h4 className="font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {documentKey === "FOTO_PERFIL" && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Crop className="h-3 w-3 inline mr-1" />
              Con recorte
            </span>
          )}
        </h4>

        {hasContent && (
          <div className="flex items-center gap-2">
            {isExisting && !file && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <FileText className="h-4 w-4 mr-1" />
                Documento existente
              </div>
            )}
            {file && (
              <div className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                <FileText className="h-4 w-4 mr-1" />
                Nuevo archivo
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ Mostrar error de validación de archivo */}
      {fileError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Archivo no válido
            </p>
            <p className="text-sm text-red-700">{fileError}</p>
          </div>
        </div>
      )}

      {/* Upload Area o File Preview */}
      {!hasContent ? (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}
            ${fileError ? "border-red-300 bg-red-50" : ""}
          `}
          role="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            accept={getAcceptedTypes(fileType)}
            className="hidden"
            disabled={disabled}
            type="file"
            onChange={handleFileChange}
          />

          <Upload
            className={`mx-auto h-8 w-8 mb-3 ${fileError ? "text-red-400" : "text-gray-400"}`}
          />
          <p
            className={`font-medium mb-1 ${fileError ? "text-red-600" : "text-gray-600"}`}
          >
            {isDragging
              ? "Suelta el archivo aquí"
              : "Arrastra y suelta o haz clic"}
          </p>
          <p
            className={`text-sm ${fileError ? "text-red-500" : "text-gray-500"}`}
          >
            {getFileTypeDescription(fileType)}
          </p>
        </div>
      ) : (
        /* File Preview */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3 sm:gap-0">
            <div className="flex items-center sm:flex-row flex-col w-full sm:w-auto">
              <FileText
                className={`h-5 w-5 mr-0 sm:mr-3 mb-2 sm:mb-0 ${file ? "text-green-600" : "text-blue-600"}`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`
                      font-medium text-gray-900 text-sm max-w-full truncate
                      max-w-[100px]
                      sm:max-w-[180px]
                      md:max-w-[260px]
                      lg:max-w-[360px]
                    `}
                  title={displayName}
                >
                  {displayName}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span>{formatFileSize(displaySize)}</span>
                  {existingDocument && (
                    <span>
                      • Subido:{" "}
                      {new Date(
                        existingDocument.upload_date,
                      ).toLocaleDateString("es-ES")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-row gap-2 w-full sm:w-auto justify-center">
              {/* ✅ Botón de descarga para documentos existentes */}
              {existingDocument && !file && (
                <Button
                  className="min-w-0 px-2"
                  color="primary"
                  size="sm"
                  title="Descargar documento"
                  variant="light"
                  onPress={() => handleDownload(existingDocument)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {/* Botón para reemplazar archivo existente */}
              {existingDocument && !disabled && (
                <Button
                  className="min-w-0 px-2"
                  color="secondary"
                  size="sm"
                  title="Reemplazar archivo"
                  variant="light"
                  onPress={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}

              {/* Botón de eliminación */}
              {!disabled && (
                <Button
                  className="min-w-0 px-2"
                  color="danger"
                  size="sm"
                  title="Eliminar"
                  variant="light"
                  onPress={handleRemove}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Input oculto para reemplazar archivos */}
          <input
            ref={fileInputRef}
            accept={getAcceptedTypes(fileType)}
            className="hidden"
            disabled={disabled}
            type="file"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Date Picker para vigencia */}
      {vigencia && (
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4 mr-2" />
            Fecha de vigencia
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <DatePicker
            className="w-full"
            errorMessage={
              errores[documentKey] ? "Este campo es obligatorio" : undefined
            }
            isDisabled={disabled}
            isInvalid={errores[documentKey]}
            label="Seleccionar fecha de vigencia"
            size="sm"
            value={selectedDate}
            onChange={setSelectedDate}
          />

          {selectedDate && (
            <p className="text-xs text-gray-500">
              Vigente hasta:{" "}
              {selectedDate
                ? formatter.format(selectedDate.toDate(getLocalTimeZone()))
                : "--"}
            </p>
          )}

          {/* ✅ Mostrar fecha de vigencia actual del documento existente */}
          {existingDocument?.fecha_vigencia && !selectedDate && (
            <p className="text-xs text-blue-600">
              Vigencia actual:{" "}
              {new Date(existingDocument.fecha_vigencia).toLocaleDateString(
                "es-ES",
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SimpleDocumentUploader;
