export type MapLayer = {
  id: string;
  title: string;
  count?: number;
  children?: MapLayer[];
};

export type DatasetOption = {
  id: string;
  title: string;
};

// Папку можно включать целиком, только если слоёв не больше лимита
export const MAX_BULK_LAYERS = 5;

// id всех слоёв-листьев под нодой, включая вложенные папки
export function leafIds(layer: MapLayer): string[] {
  if (!layer.children?.length) {
    return [layer.id];
  }
  return layer.children.flatMap(leafIds);
}
