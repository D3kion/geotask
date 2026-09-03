/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, type SidebarView } from "@/widgets/sidebar/ui/Sidebar";
import { MapView } from "@/widgets/map-view/ui/MapView";
import type { GeoObject } from "@/entities/geo-object/model/types";
import {
  buildLayerTree,
  fetchThemes,
  fetchThemeTree,
  searchGeoportal,
} from "@/shared/api/nspd";
import type { SearchTypeId } from "@/shared/api/nspd";
import type { MapLayer } from "@/entities/map-layer/model/types";

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchTypeId>(1);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selection, setSelection] = useState<GeoObject[]>([]);
  const [detail, setDetail] = useState<GeoObject | null>(null);

  const [datasetId, setDatasetId] = useState<string>("");
  const [visible, setVisible] = useState<Set<string>>(() => new Set<string>());
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const {
    data: themesData,
    isLoading: themesLoading,
    error: themesErrorRaw,
  } = useQuery({
    queryKey: ["themes"],
    queryFn: fetchThemes,
  });
  const themes = themesData ?? null;
  const themesError = themesErrorRaw
    ? themesErrorRaw instanceof Error
      ? themesErrorRaw.message
      : String(themesErrorRaw)
    : null;

  useEffect(() => {
    if (!themes || themes.length === 0) return;
    const firstId = String(themes[0]!.id);
    if (!datasetId || !themes.some((t) => String(t.id) === datasetId)) {
      setDatasetId(firstId);
    }
  }, [themes, datasetId]);

  const numericDatasetId = Number(datasetId);
  const treeEnabled = !!datasetId && !Number.isNaN(numericDatasetId);

  const {
    data: treeData,
    isLoading: treeLoading,
    error: treeErrorRaw,
  } = useQuery({
    queryKey: ["tree", datasetId],
    queryFn: () => fetchThemeTree(numericDatasetId),
    enabled: treeEnabled,
  });

  const treeError = treeErrorRaw
    ? treeErrorRaw instanceof Error
      ? treeErrorRaw.message
      : String(treeErrorRaw)
    : null;

  const wmsLayers = useMemo(() => treeData?.layers ?? [], [treeData]);

  const layerTree: MapLayer[] = useMemo(() => {
    if (!treeData) return [];
    if (!treeData.layers.length) return [];
    const built = buildLayerTree(treeData.layers, treeData.tree);
    return built.length
      ? built
      : treeData.layers.map((l) => ({ id: String(l.layerId), title: l.title }));
  }, [treeData]);

  useEffect(() => {
    if (!treeData) {
      if (!treeEnabled) {
        setVisible(new Set<string>());
        setExpanded(new Set<string>());
      }
      return;
    }
    setVisible(new Set<string>());

    const expandIds = new Set<string>();
    const walk = (nodes: MapLayer[]) => {
      for (const n of nodes)
        if (n.children?.length) {
          expandIds.add(n.id);
          walk(n.children);
        }
    };
    const built = buildLayerTree(treeData.layers, treeData.tree);
    const target = built.length
      ? built
      : treeData.layers.map((l) => ({ id: String(l.layerId), title: l.title }));
    walk(target);
    setExpanded(expandIds.size ? expandIds : new Set(target.map((b) => b.id)));
  }, [treeData, treeEnabled]);

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["search", submittedQuery, searchType],
    queryFn: () => searchGeoportal(submittedQuery.trim(), searchType),
    enabled: submittedQuery.trim().length >= 2,
  });
  const searchResults = useMemo(() => searchData ?? [], [searchData]);

  function handleSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSubmittedQuery(q);
    setDetail(null);
    setSelection([]);
  }

  const markers: GeoObject[] = useMemo(() => {
    if (detail) return [detail];
    if (submittedQuery.trim().length >= 2) return searchResults;
    if (selection.length > 0) return selection;
    return [];
  }, [detail, submittedQuery, searchResults, selection]);

  const view: SidebarView = useMemo(() => {
    if (detail) return { mode: "detail", object: detail };
    const sq = submittedQuery.trim();
    if (sq.length >= 2)
      return { mode: "search", results: searchResults, query: sq };
    if (selection.length > 0) return { mode: "selection", objects: selection };
    return { mode: "layers" };
  }, [detail, submittedQuery, searchResults, selection]);

  const datasetsForSidebar = useMemo(() => {
    if (themes && themes.length > 0) {
      return themes.map((t) => ({ id: String(t.id), title: t.name }));
    }
    return [] as { id: string; title: string }[];
  }, [themes]);

  function handleQueryChange(v: string) {
    setQuery(v);
  }

  function handleClearSearch() {
    setQuery("");
    setSubmittedQuery("");
    setDetail(null);
    setSelection([]);
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
    if (submittedQuery) {
      setSubmittedQuery("");
      return;
    }
    setQuery("");
    setSelection([]);
  }

  function handleMapPick(objs: GeoObject[]) {
    setQuery("");
    setSubmittedQuery("");
    setDetail(null);
    setSelection(objs);
  }

  function handleMapSelect(obj: GeoObject) {
    setQuery("");
    setSubmittedQuery("");
    setSelection([]);
    setDetail(obj);
  }

  const isLoading = themesLoading || treeLoading || searchLoading;
  const error = themesError ?? treeError;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar
        view={view}
        query={query}
        onQueryChange={handleQueryChange}
        onClearSearch={handleClearSearch}
        onSearch={handleSearch}
        searchType={searchType}
        onSearchTypeChange={(v) => setSearchType(v)}
        datasets={datasetsForSidebar}
        datasetId={datasetId}
        onDatasetChange={(id) => {
          setDatasetId(id);
          setDetail(null);
          setSelection([]);
          setSubmittedQuery("");
          setQuery("");
        }}
        layers={layerTree}
        visible={visible}
        onToggleLayer={handleToggleLayer}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onSelectObject={handleSelectObject}
        onBack={handleBack}
        isLoading={isLoading}
        error={error}
        wmsLayers={wmsLayers}
      />
      <MapView
        wmsLayers={wmsLayers}
        visible={visible}
        markers={markers}
        selectedId={detail?.id ?? undefined}
        onPick={handleMapPick}
        onSelect={handleMapSelect}
      />
    </div>
  );
}
