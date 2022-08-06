import type { Coordinate } from "ol/coordinate";

export interface SpecialObject {
  id: number;
  kind: string;
  isAllCourses: boolean;
  locations: Coordinate[];
}
