import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface FilterOptions {
  sedes: Set<string>;
  tiposIdentificacion: Set<string>;
  tiposContrato: Set<string>;
  estados: Set<string>;
}
