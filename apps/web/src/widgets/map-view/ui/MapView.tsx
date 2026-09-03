"use client";

import { useEffect, useRef } from "react";
import type { GeoObject } from "@/entities/geo-object/model/types";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/shared/config/map";

export function MapView({
  objects,
  selectedId,
  onPick,
  onSelect,
}: {
  objects: GeoObject[];
  selectedId?: string;
  onPick: (objs: GeoObject[]) => void;
  onSelect: (obj: GeoObject) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const vectorSourceRef = useRef<unknown>(null);
  const vectorLayerRef = useRef<unknown>(null);
  const onPickRef = useRef(onPick);
  const onSelectRef = useRef(onSelect);
  const objectsRef = useRef(objects);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let map: InstanceType<typeof import("ol/Map").default> | null = null;
    let disposed = false;

    (async () => {
      const [
        { default: Map },
        { default: View },
        { default: TileLayer },
        { default: VectorLayer },
        { default: OSM },
        { default: VectorSource },
        { fromLonLat, toLonLat },
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
      vectorSourceRef.current = vectorSource;

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const isSelected = feature.get("id") === selectedIdRef.current;
          return new Style({
            image: new Circle({
              radius: isSelected ? 9 : 7,
              fill: new Fill({ color: isSelected ? "#18181b" : "#3f3f46" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          });
        },
      });
      vectorLayerRef.current = vectorLayer;

      map = new Map({
        target: containerRef.current,
        layers: [new TileLayer({ source: new OSM() }), vectorLayer],
        view: new View({
          center: fromLonLat(DEFAULT_CENTER),
          zoom: DEFAULT_ZOOM,
        }),
      });

      mapRef.current = map;

      map.on("singleclick", (evt) => {
        const lonLat = toLonLat(evt.coordinate) as [number, number];
        const [lon, lat] = lonLat;

        const nearby = objectsRef.current.filter((o) => {
          const dLon = o.coords[0] - lon;
          const dLat = o.coords[1] - lat;
          return Math.hypot(dLon, dLat) < 0.018;
        });

        if (nearby.length === 0) {
          onPickRef.current([]);
          return;
        }

        if (nearby.length === 1) {
          onSelectRef.current(nearby[0]!);
        } else {
          onPickRef.current(nearby);
        }
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

      const source = vectorSourceRef.current as unknown as
        | import("ol/source/Vector").default
        | null;
      const layer = vectorLayerRef.current as
        | import("ol/layer/Vector").default
        | null;
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

      for (const o of objects) {
        const f = new Feature({
          geometry: new Point(fromLonLat(o.coords)),
          id: o.id,
        });
        source.addFeature(f);
      }

      source.changed();
    })();
  }, [objects, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;

    (async () => {
      const [{ fromLonLat }] = await Promise.all([import("ol/proj")]);
      const map = mapRef.current as import("ol/Map").default | null;
      if (!map) return;
      map.getView().animate({
        center: fromLonLat(obj.coords),
        zoom: Math.max(map.getView().getZoom() ?? DEFAULT_ZOOM, 13),
        duration: 300,
      });
    })();
  }, [selectedId, objects]);

  return (
    <div className="relative flex-1 bg-zinc-100">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Оверлей с подсказкой */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 backdrop-blur border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 shadow-sm">
        Клик по маркеру — карточка · клик по карте — список рядом
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-white/90 backdrop-blur border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500">
        {objects.length} объектов на карте
      </div>
    </div>
  );
}
