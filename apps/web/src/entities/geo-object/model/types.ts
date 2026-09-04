export type GeoObject = {
  id: string;
  title: string;
  subtitle: string;
  layerId: string;
  coords: [number, number]; // [lon, lat]
  address?: string;
  props: Record<string, string>;
  categoryId?: string;
  categoryName?: string;
  raw?: unknown;
};

export function objTitle(o: GeoObject): string {
  if (o.categoryName) {
    return `${o.categoryName}: ${o.title}`;
  }
  return o.title;
}
