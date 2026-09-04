/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useRef } from "react";
import type { GeoObject } from "@/entities/geo-object/model/types";
import type { NspdLayer } from "@/shared/api/nspd";
import { mapGfiJsonToGeoObjects } from "@/shared/api/nspd";
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
              const objs = mapGfiJsonToGeoObjects(json, String(l.layerId), {
                categoryId: l.categoryId,
              });
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
