import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface FilterOptions {
  sedes: Set<string>;
  tiposIdentificacion: Set<string>;
  tiposContrato: Set<string>;
  estados: Set<string>;
  generos: Set<string>;
  tiposSangre: Set<string>;
  terminosContrato: Set<string>;
  fechaIngresoDesde: string;
  fechaIngresoHasta: string;
  salarioMinimo: string;
  salarioMaximo: string;
}
