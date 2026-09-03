/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef } from "react";
import type { GeoObject } from "@/entities/geo-object/model/types";
import type { NspdLayer } from "@/shared/api/nspd";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/shared/config/map";

export function MapView({
  wmsLayers,
  visible,
  markers,
  selectedId,
  onPick,
  onSelect,
}: {
  wmsLayers: NspdLayer[];
  visible: Set<string>;
  markers: GeoObject[];
  selectedId?: string;
  onPick: (objs: GeoObject[]) => void;
  onSelect: (obj: GeoObject) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("ol/Map").default | null>(null);
  const vectorSourceRef = useRef<import("ol/source/Vector").default | null>(
    null,
  );
  const vectorLayerRef = useRef<import("ol/layer/Vector").default | null>(null);
  const wmsByIdRef = useRef<Map<string, import("ol/layer/Tile").default>>(
    new Map(),
  );
  const wmsSourcesRef = useRef<
    Map<string, import("ol/source/TileWMS").default>
  >(new Map());

  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelect);
  const visibleRef = useRef(visible);
  const wmsLayersRef = useRef(wmsLayers);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    wmsLayersRef.current = wmsLayers;
  }, [wmsLayers]);

  useEffect(() => {
    let map: import("ol/Map").default | null = null;
    let disposed = false;

    (async () => {
      const [
        { default: Map },
        { default: View },
        { default: TileLayer },
        { default: VectorLayer },
        { default: OSM },
        { default: VectorSource },
        { fromLonLat },
        { Circle, Fill, Stroke, Style },
      ] = await Promise.all([
        import("ol/Map"),
        import("ol/View"),
        import("ol/layer/Tile"),
        import("ol/layer/Vector"),
        import("ol/source/OSM"),
        import("ol/source/Vector"),
        import("ol/proj"),
        import("ol/style"),
      ]);

      if (disposed || !containerRef.current) return;

      const vectorSource = new VectorSource();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vectorSourceRef as any).current = vectorSource;

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const isSelected = feature.get("id") === selectedId;
          return new Style({
            image: new Circle({
              radius: isSelected ? 9 : 7,
              fill: new Fill({ color: isSelected ? "#18181b" : "#3f3f46" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          });
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (vectorLayerRef as any).current = vectorLayer;

      map = new Map({
        target: containerRef.current,
        layers: [new TileLayer({ source: new OSM() }), vectorLayer],
        view: new View({
          center: fromLonLat(DEFAULT_CENTER),
          zoom: DEFAULT_ZOOM,
        }),
      });

      mapRef.current = map;

      map.on("singleclick", async (evt) => {
        const view = map!.getView();
        const resolution = view.getResolution();
        const projection = view.getProjection();
        const coordinate = evt.coordinate;

        const hitFeature = map!.forEachFeatureAtPixel(evt.pixel, (f) => f);
        if (hitFeature) {
          const hitId = hitFeature.get("id") as string | undefined;
          const hitObj = markersRef.current.find(
            (o) =>
              o.id === hitId ||
              `search-${o.id}` === hitId ||
              `gfi-${o.id}` === hitId,
          );
          if (hitId) {
            const byId = markersRef.current.find((o) => o.id === hitId);
            if (byId) {
              onSelectRef.current(byId);
              return;
            }
          }
          if (hitObj) {
            onSelectRef.current(hitObj);
            return;
          }
        }

        const visibleIds = [...visibleRef.current];
        const layersToQuery = wmsLayersRef.current.filter((l) =>
          visibleIds.includes(String(l.layerId)),
        );

        if (layersToQuery.length === 0) {
          const lonLat = (await import("ol/proj")).toLonLat(coordinate) as [
            number,
            number,
          ];
          const nearby = markersRef.current.filter((o) => {
            const dLon = o.coords[0] - lonLat[0];
            const dLat = o.coords[1] - lonLat[1];
            return Math.hypot(dLon, dLat) < 0.018;
          });
          if (nearby.length === 0) {
            onPickRef.current([]);
            return;
          }
          if (nearby.length === 1) onSelectRef.current(nearby[0]!);
          else onPickRef.current(nearby);
          return;
        }

        const results: GeoObject[] = [];
        await Promise.all(
          layersToQuery.map(async (l) => {
            const source = wmsSourcesRef.current.get(String(l.layerId));
            if (!source || !resolution) return;

            const url = source.getFeatureInfoUrl(
              coordinate,
              resolution,
              projection,
              {
                INFO_FORMAT: "application/json",
                QUERY_LAYERS: String(l.layerId),
                FEATURE_COUNT: 10,
              },
            );
            if (!url) return;

            let rel = url;
            try {
              const u = new URL(url, window.location.origin);
              rel = `${u.pathname}${u.search}`;
            } catch {
              rel = url;
            }

            try {
              const res = await fetch(rel, {
                headers: { Accept: "application/json" },
              });
              if (!res.ok) return;
              const ct = res.headers.get("content-type") ?? "";
              let json: unknown = null;
              if (ct.includes("json")) {
                json = await res.json().catch(() => null);
              } else {
                const txt = await res.text().catch(() => "");
                try {
                  json = JSON.parse(txt);
                } catch {
                  return;
                }
              }
              const objs = mapGfiJson(json, String(l.layerId));
              results.push(...objs);
            } catch {}
          }),
        );

        if (results.length === 0) {
          onPickRef.current([]);
          return;
        }
        if (results.length === 1) onSelectRef.current(results[0]!);
        else onPickRef.current(results);
      });

      map.on("pointermove", (evt) => {
        const hit = map!.hasFeatureAtPixel(evt.pixel);
        const target = map!.getTargetElement();
        target.style.cursor = hit ? "pointer" : "";
      });
    })();

    return () => {
      disposed = true;
      if (map) map.setTarget(undefined);
    };
  }, []);

  const markersRef = useRef(markers);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    (async () => {
      const [
        { default: TileLayer },
        { default: TileWMS },
        { default: TileGrid },
        { get: getProjection },
        { getWidth },
      ] = await Promise.all([
        import("ol/layer/Tile"),
        import("ol/source/TileWMS"),
        import("ol/tilegrid/TileGrid"),
        import("ol/proj"),
        import("ol/extent"),
      ]);
      const map = mapRef.current;
      if (!map) return;

      const wanted = new Set(wmsLayers.map((l) => String(l.layerId)));

      for (const [id, layer] of [...wmsByIdRef.current.entries()]) {
        if (!wanted.has(id)) {
          map.removeLayer(layer);
          wmsByIdRef.current.delete(id);
          wmsSourcesRef.current.delete(id);
        }
      }

      for (const l of wmsLayers) {
        const id = String(l.layerId);
        const isVisible = visible.has(id);
        let tileLayer = wmsByIdRef.current.get(id);

        if (!tileLayer) {
          const projExtent = getProjection("EPSG:3857")?.getExtent() ?? [];
          const startResolution = getWidth(projExtent) / 256;
          const resolutions = new Array(22);
          for (let i = 0, ii = resolutions.length; i < ii; ++i) {
            resolutions[i] = startResolution / Math.pow(2, i);
          }
          const source = new TileWMS({
            url: `/api/aeggis/v4/${id}/wms`,
            params: {
              LAYERS: String(l.layerId),
              VERSION: "1.3.0",
              RANDOM: 0.7870716989640726,
            },
            serverType: "geoserver",
            transition: 0,
            tileGrid: new TileGrid({
              tileSize: [512, 512],
              extent: projExtent,
              resolutions: resolutions,
            }),
          });

          tileLayer = new TileLayer({ source, visible: isVisible });
          const layers = map.getLayers();
          const vectorLayer = vectorLayerRef.current;
          if (vectorLayer) {
            const idx = layers.getArray().indexOf(vectorLayer);
            if (idx >= 0) layers.insertAt(idx, tileLayer);
            else map.addLayer(tileLayer);
          } else {
            map.addLayer(tileLayer);
          }

          wmsByIdRef.current.set(id, tileLayer);
          wmsSourcesRef.current.set(id, source);
        } else {
          tileLayer.setVisible(isVisible);
        }
      }
    })();
  }, [wmsLayers, visible]);

  useEffect(() => {
    (async () => {
      const [
        { default: Feature },
        { default: Point },
        { fromLonLat },
        { Circle, Fill, Stroke, Style },
      ] = await Promise.all([
        import("ol/Feature"),
        import("ol/geom/Point"),
        import("ol/proj"),
        import("ol/style"),
      ]);

      const source = vectorSourceRef.current;
      const layer = vectorLayerRef.current;
      if (!source || !layer) return;

      layer.setStyle((feature) => {
        const isSelected = feature.get("id") === selectedId;
        return new Style({
          image: new Circle({
            radius: isSelected ? 9 : 7,
            fill: new Fill({ color: isSelected ? "#18181b" : "#3f3f46" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
        });
      });

      source.clear();

      for (const o of markers) {
        const f = new Feature({
          geometry: new Point(fromLonLat(o.coords)),
          id: o.id,
        });
        source.addFeature(f);
      }

      source.changed();
    })();
  }, [markers, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const obj = markers.find((o) => o.id === selectedId);
    if (!obj) return;

    (async () => {
      const [{ fromLonLat }] = await Promise.all([import("ol/proj")]);
      const map = mapRef.current;
      if (!map) return;
      map.getView().animate({
        center: fromLonLat(obj.coords),
        zoom: Math.max(map.getView().getZoom() ?? DEFAULT_ZOOM, 13),
        duration: 300,
      });
    })();
  }, [selectedId, markers]);

  return (
    <div className="relative flex-1 bg-zinc-100">
      <div ref={containerRef} className="absolute inset-0" />
      {/* <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-white/90 backdrop-blur border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500">
        {visible.size} слоёв · {markers.length} маркеров
      </div> */}
    </div>
  );
}

function mapGfiJson(raw: unknown, layerId: string): GeoObject[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const features =
    (o.features as unknown[]) ??
    ((o.data as Record<string, unknown> | undefined)?.features as unknown[]) ??
    [];

  if (!Array.isArray(features) || features.length === 0) return [];

  const out: GeoObject[] = [];
  for (let idx = 0; idx < features.length; idx++) {
    const rec = features[idx] as Record<string, unknown>;
    const props = (rec.properties ??
      rec.attributes ??
      rec.fields ??
      {}) as Record<string, unknown>;
    const geom = rec.geometry as Record<string, unknown> | undefined;

    const idRaw = (rec.id ?? props.id ?? props.objectId ?? idx) as
      | string
      | number;
    const id = `${layerId}-${String(idRaw)}`;

    const coords = extractLonLat(geom, props);
    if (!coords) continue;

    const title =
      (props.display_name as string) ??
      (props.name as string) ??
      (props.title as string) ??
      (props.label as string) ??
      (props.cad_number as string) ??
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

    out.push({
      id: `gfi-${id}`,
      title: String(title).slice(0, 120),
      subtitle: subtitle || `Слой ${layerId}`,
      layerId,
      coords,
      address:
        (props.address as string) ??
        (props.readable_address as string) ??
        undefined,
      props: Object.keys(flat).length ? flat : { id: String(idRaw) },
    });
  }
  return out;
}

function extractLonLat(
  geom: Record<string, unknown> | undefined,
  props: Record<string, unknown>,
): [number, number] | null {
  if (!geom) {
    const x = (props.x ?? props.lon ?? props.longitude) as number | undefined;
    const y = (props.y ?? props.lat ?? props.latitude) as number | undefined;
    if (typeof x === "number" && typeof y === "number") {
      if (Math.abs(x) > 180) return toLonLat3857(x, y);
      return [x, y];
    }
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
    if (ring?.length) {
      let sx = 0;
      let sy = 0;
      for (const [x, y] of ring) {
        sx += x;
        sy += y;
      }
      return is3857
        ? toLonLat3857(sx / ring.length, sy / ring.length)
        : [sx / ring.length, sy / ring.length];
    }
  }

  if (type === "MultiPolygon" && Array.isArray(coords)) {
    const poly = (coords as number[][][][])[0];
    const ring = poly?.[0];
    if (ring?.length) {
      let sx = 0;
      let sy = 0;
      for (const [x, y] of ring) {
        sx += x;
        sy += y;
      }
      return is3857
        ? toLonLat3857(sx / ring.length, sy / ring.length)
        : [sx / ring.length, sy / ring.length];
    }
  }

  return null;
}

function toLonLat3857(x: number, y: number): [number, number] {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}
