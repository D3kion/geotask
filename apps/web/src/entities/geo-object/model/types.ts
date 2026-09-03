export type GeoObject = {
  id: string;
  title: string;
  subtitle: string;
  layerId: string;
  coords: [number, number]; // [lon, lat]
  address?: string;
  props: Record<string, string>;
};
