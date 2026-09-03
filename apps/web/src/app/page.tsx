"use client";

import { useMemo, useState } from "react";
import { Sidebar, type SidebarView } from "@/widgets/sidebar/ui/Sidebar";
import { MapView } from "@/widgets/map-view/ui/MapView";
import { MOCK_DATASETS, MOCK_LAYERS, MOCK_OBJECTS } from "@/shared/lib/mock";
import type { GeoObject } from "@/entities/geo-object/model/types";

function allLeafIds() {
  const ids: string[] = [];
  for (const l of MOCK_LAYERS) {
    if (l.children) for (const c of l.children) ids.push(c.id);
    else ids.push(l.id);
  }
  return ids;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [datasetId, setDatasetId] = useState<string>(MOCK_DATASETS[0]!.id);
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(allLeafIds()),
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(MOCK_LAYERS.map((l) => l.id)),
  );

  const [selection, setSelection] = useState<GeoObject[]>([]);
  const [detail, setDetail] = useState<GeoObject | null>(null);

  const visibleObjects = useMemo(
    () => MOCK_OBJECTS.filter((o) => visible.has(o.layerId)),
    [visible],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return visibleObjects.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.subtitle.toLowerCase().includes(q) ||
        o.address?.toLowerCase().includes(q) ||
        Object.values(o.props).some((v) => v.toLowerCase().includes(q)),
    );
  }, [query, visibleObjects]);

  const view: SidebarView = useMemo(() => {
    if (detail) return { mode: "detail", object: detail };
    const q = query.trim();
    if (q.length > 0)
      return { mode: "search", results: searchResults, query: q };
    if (selection.length > 0) return { mode: "selection", objects: selection };
    return { mode: "layers" };
  }, [detail, query, searchResults, selection]);

  function handleQueryChange(v: string) {
    setQuery(v);
    if (v.trim().length > 0) {
      setDetail(null);
      setSelection([]);
    }
  }

  function handleClearSearch() {
    setQuery("");
    setDetail(null);
  }

  function handleToggleLayer(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectObject(obj: GeoObject) {
    setDetail(obj);
  }

  function handleBack() {
    if (detail) {
      setDetail(null);
      return;
    }
    setQuery("");
    setSelection([]);
  }

  function handleMapPick(objs: GeoObject[]) {
    setQuery("");
    setDetail(null);
    setSelection(objs.filter((o) => visible.has(o.layerId)));
  }

  function handleMapSelect(obj: GeoObject) {
    setQuery("");
    setSelection([]);
    setDetail(obj);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar
        view={view}
        query={query}
        onQueryChange={handleQueryChange}
        onClearSearch={handleClearSearch}
        datasets={MOCK_DATASETS}
        datasetId={datasetId}
        onDatasetChange={setDatasetId}
        layers={MOCK_LAYERS}
        visible={visible}
        onToggleLayer={handleToggleLayer}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onSelectObject={handleSelectObject}
        onBack={handleBack}
      />
      <MapView
        objects={visibleObjects}
        selectedId={detail?.id ?? undefined}
        onPick={handleMapPick}
        onSelect={handleMapSelect}
      />
    </div>
  );
}
