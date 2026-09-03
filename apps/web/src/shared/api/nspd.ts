import { API_BASE, NSPD_ENDPOINTS } from "@/shared/config/api";
import type { GeoObject } from "@/entities/geo-object/model/types";

export type NspdTheme = {
  id: number;
  name: string;
  code?: string;
  descr?: string;
  sort_order?: number;
  [k: string]: unknown;
};

export type NspdLayer = {
  layerId: number;
  layerTreeId?: number;
  title: string;
  layerName?: string;
  categoryId?: number | string;
  layerType?: string;
  layerVisibleByDefault?: boolean;
  isHidden?: boolean;
  coverage?: { bbox?: number[] };
  options?: { queryable?: boolean; minZoom?: number; [k: string]: unknown };
  [k: string]: unknown;
};

export type NspdTreeFolder = {
  id?: number | string;
  name?: string;
  title?: string;
  layers?: number[];
  folders?: NspdTreeFolder[];
  [k: string]: unknown;
};

export type NspdTreeResponse = {
  layers: NspdLayer[];
  tree: {
    layers?: number[];
    folders?: NspdTreeFolder[];
    [k: string]: unknown;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function fetchThemes(): Promise<NspdTheme[]> {
  const raw = await fetchJson<unknown>(`${API_BASE}${NSPD_ENDPOINTS.themes}`);

  if (Array.isArray(raw)) return raw as NspdTheme[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as NspdTheme[];
    if (o.data && typeof o.data === "object") {
      const inner = o.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as NspdTheme[];
      if (Array.isArray(inner.items)) return inner.items as NspdTheme[];
    }
    if (Array.isArray(o.items)) return o.items as NspdTheme[];
    if (Array.isArray(o.themes)) return o.themes as NspdTheme[];
  }
  return [];
}

export async function fetchThemeTree(
  themeId: number | string,
): Promise<NspdTreeResponse> {
  const url = `${API_BASE}${NSPD_ENDPOINTS.tree}?themeId=${encodeURIComponent(String(themeId))}`;
  const raw = await fetchJson<unknown>(url);

  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.layers) && o.tree) {
      return o as unknown as NspdTreeResponse;
    }
    if (o.data && typeof o.data === "object") {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.layers) && d.tree) {
        return d as unknown as NspdTreeResponse;
      }
    }
  }
  return { layers: [], tree: {} };
}

export const SEARCH_TYPES = [
  { id: 1, label: "Недвижимость" },
  { id: 2, label: "Кадастровое деление" },
  { id: 4, label: "Административно-территориальное деление" },
  { id: 5, label: "Зоны и территории" },
  { id: 7, label: "Территориальные зоны" },
  { id: 15, label: "Комплексы объектов" },
] as const;

export type SearchTypeId = (typeof SEARCH_TYPES)[number]["id"];

export async function searchGeoportal(
  query: string,
  thematicSearchId = 1,
): Promise<GeoObject[]> {
  const url = `${API_BASE}${NSPD_ENDPOINTS.search}?thematicSearchId=${encodeURIComponent(String(thematicSearchId))}&query=${encodeURIComponent(query)}`;
  const raw = await fetchJson<unknown>(url);
  return mapSearchToGeoObjects(raw);
}

function mapSearchToGeoObjects(raw: unknown): GeoObject[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;

  const fc =
    (o.data as Record<string, unknown> | undefined) ??
    (o as Record<string, unknown>);

  const features = (fc?.features ?? fc?.data ?? []) as unknown[];
  if (!Array.isArray(features)) return [];

  return features
    .map((f, idx) => mapFeatureToGeoObject(f as Record<string, unknown>, idx))
    .filter(Boolean) as GeoObject[];
}

function mapFeatureToGeoObject(
  f: Record<string, unknown>,
  idx: number,
): GeoObject | null {
  if (!f || typeof f !== "object") return null;

  const idRaw = (f.id ?? f.externalKey ?? idx) as string | number;
  const id = String(idRaw);

  const geom = f.geometry as Record<string, unknown> | undefined;
  const props = (f.properties ?? f.options ?? {}) as Record<string, unknown>;
  const options = (props.options ?? props) as Record<string, unknown>;

  const coords = extractLonLat(geom, props);
  if (!coords) return null;

  const title =
    (props.label as string) ??
    (props.descr as string) ??
    (options.cad_number as string) ??
    (options.cad_num as string) ??
    (options.readable_address as string) ??
    (options.address_readable_address as string) ??
    (props.categoryName as string) ??
    `Объект #${id}`;

  const subtitle =
    (props.categoryName as string) ??
    (props.descr as string) ??
    (options.type as string) ??
    (options.params_type as string) ??
    "";

  const address =
    (options.readable_address as string) ??
    (options.address_readable_address as string) ??
    (props.label as string) ??
    undefined;

  const layerId =
    String(
      (props.category as string | number) ??
        (options.category as string | number) ??
        (f.categoryId as string | number) ??
        "search",
    ) ?? "search";

  const flatProps: Record<string, string> = {};
  for (const [k, v] of Object.entries(options)) {
    if (v == null) continue;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      flatProps[k] = String(v);
      if (Object.keys(flatProps).length >= 8) break;
    }
  }
  for (const k of [
    "score",
    "category",
    "categoryName",
    "externalKey",
    "label",
  ]) {
    if (props[k] != null && !(k in flatProps)) {
      flatProps[k] = String(props[k] as string | number);
    }
  }

  return {
    id: `search-${id}`,
    title: String(title).slice(0, 120),
    subtitle: String(subtitle).slice(0, 120),
    layerId,
    coords,
    address: address ? String(address) : undefined,
    props: Object.keys(flatProps).length ? flatProps : { id },
  };
}

function extractLonLat(
  geom: Record<string, unknown> | undefined,
  props: Record<string, unknown>,
): [number, number] | null {
  if (!geom) {
    const x =
      props.x ??
      props.lon ??
      (props.options as Record<string, unknown> | undefined)?.x;
    const y =
      props.y ??
      props.lat ??
      (props.options as Record<string, unknown> | undefined)?.y;
    if (typeof x === "number" && typeof y === "number") return [x, y];
    return null;
  }

  const type = geom.type as string | undefined;
  const coords = geom.coordinates as unknown;
  const crs = (geom.crs as Record<string, unknown> | undefined)?.properties as
    | Record<string, unknown>
    | undefined;
  const crsName = (crs?.name as string | undefined) ?? "EPSG:3857";
  const is3857 = crsName.includes("3857");

  if (type === "Point" && Array.isArray(coords) && coords.length >= 2) {
    const [x, y] = coords as [number, number];
    if (is3857) return toLonLat3857(x, y);
    return [x, y];
  }

  if (type === "Polygon" && Array.isArray(coords)) {
    const ring = (coords as number[][][])[0];
    if (ring && ring.length) return centroidLonLat(ring, is3857);
  }

  if (type === "MultiPolygon" && Array.isArray(coords)) {
    const poly = (coords as number[][][][])[0];
    const ring = poly?.[0];
    if (ring && ring.length) return centroidLonLat(ring, is3857);
  }

  return null;
}

function centroidLonLat(
  ring: number[][],
  is3857: boolean,
): [number, number] | null {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  const cx = sx / ring.length;
  const cy = sy / ring.length;
  if (is3857) return toLonLat3857(cx, cy);
  return [cx, cy];
}

function toLonLat3857(x: number, y: number): [number, number] {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

export type GetFeatureInfoResult = GeoObject;

export async function fetchGetFeatureInfo(
  layerId: number | string,
  wmsParams: Record<string, string | number>,
): Promise<GeoObject[]> {
  const base = `${API_BASE}${NSPD_ENDPOINTS.wms(layerId)}`;
  const url = new URL(
    base,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  );
  for (const [k, v] of Object.entries(wmsParams)) {
    url.searchParams.set(k, String(v));
  }

  const rel = `${base}?${url.searchParams.toString()}`;

  const res = await fetch(rel, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json") || ct.includes("json")) {
    const json = (await res.json().catch(() => null)) as unknown;
    return mapGfiJsonToGeoObjects(json, String(layerId));
  }

  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as unknown;
    return mapGfiJsonToGeoObjects(json, String(layerId));
  } catch {
    return [];
  }
}

function mapGfiJsonToGeoObjects(raw: unknown, layerId: string): GeoObject[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;

  const features =
    (o.features as unknown[]) ??
    ((o.data as Record<string, unknown> | undefined)?.features as unknown[]) ??
    ((o.data as Record<string, unknown> | undefined)?.data as unknown[]) ??
    [];

  if (!Array.isArray(features) || features.length === 0) return [];

  return features
    .map((f, idx) => {
      const rec = f as Record<string, unknown>;
      const props = (rec.properties ??
        rec.attributes ??
        rec.fields ??
        {}) as Record<string, unknown>;
      const geom = rec.geometry as Record<string, unknown> | undefined;

      const idRaw = (rec.id ?? props.id ?? props.objectId ?? idx) as
        | string
        | number;
      const id = `${layerId}-${String(idRaw)}`;

      const coords =
        extractLonLat(geom, props) ?? extractLonLatFromProps(props);
      if (!coords) return null;

      const title =
        (props.display_name as string) ??
        (props.name as string) ??
        (props.title as string) ??
        (props.label as string) ??
        (props.cad_number as string) ??
        (props.cn as string) ??
        `Объект ${layerId}`;

      const subtitle =
        `Слой ${layerId} · ${String(props.type ?? props.category ?? "").slice(0, 40)}`.trim();

      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v == null) continue;
        if (
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
        ) {
          flat[k] = String(v);
          if (Object.keys(flat).length >= 10) break;
        }
      }

      return {
        id: `gfi-${id}`,
        title: String(title).slice(0, 120),
        subtitle,
        layerId,
        coords,
        address:
          (props.address as string) ??
          (props.readable_address as string) ??
          undefined,
        props: Object.keys(flat).length ? flat : { id: String(idRaw) },
      } as GeoObject;
    })
    .filter(Boolean) as GeoObject[];
}

function extractLonLatFromProps(
  props: Record<string, unknown>,
): [number, number] | null {
  const x = (props.x ?? props.lon ?? props.longitude) as number | undefined;
  const y = (props.y ?? props.lat ?? props.latitude) as number | undefined;
  if (typeof x === "number" && typeof y === "number") {
    if (Math.abs(x) > 180) return toLonLat3857(x, y);
    return [x, y];
  }
  return null;
}

export function buildLayerTree(
  layers: NspdLayer[],
  tree: NspdTreeResponse["tree"],
): import("@/entities/map-layer/model/types").MapLayer[] {
  if (!layers.length) return [];

  const byId = new Map<number, NspdLayer>();
  for (const l of layers) byId.set(l.layerId, l);

  if (tree?.folders?.length) {
    const walk = (
      folders: NspdTreeFolder[],
    ): import("@/entities/map-layer/model/types").MapLayer[] =>
      folders.map((f) => {
        const title =
          String(f.name ?? f.title ?? `Папка ${f.id ?? ""}`).trim() || "Папка";
        const id = String(f.id ?? title);

        const childLayers = (f.layers ?? [])
          .map((lid) => byId.get(Number(lid)))
          .filter(Boolean)
          .map((l) => ({
            id: String(l!.layerId),
            title: l!.title,
          }));

        const sub = f.folders?.length ? walk(f.folders) : [];

        const children = [...sub, ...childLayers];

        return {
          id,
          title,
          children: children.length ? children : undefined,
        };
      });

    const folderLayerIds = new Set<number>();
    const collect = (folders: NspdTreeFolder[]) => {
      for (const f of folders) {
        for (const lid of f.layers ?? []) folderLayerIds.add(Number(lid));
        if (f.folders) collect(f.folders);
      }
    };
    collect(tree.folders);

    const rootLayers = (tree.layers ?? [])
      .concat(
        layers.map((l) => l.layerId).filter((id) => !folderLayerIds.has(id)),
      )
      .map((lid) => byId.get(Number(lid)))
      .filter(Boolean)
      .map((l) => ({ id: String(l!.layerId), title: l!.title }));

    return [...walk(tree.folders), ...rootLayers];
  }

  return layers.map((l) => ({
    id: String(l.layerId),
    title: l.title,
  }));
}
