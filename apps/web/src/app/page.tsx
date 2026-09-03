/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar, type SidebarView } from "@/widgets/sidebar/ui/Sidebar";
import { MapView } from "@/widgets/map-view/ui/MapView";
import type { GeoObject } from "@/entities/geo-object/model/types";
import type { NspdLayer, NspdTheme } from "@/shared/api/nspd";
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

  const [themes, setThemes] = useState<NspdTheme[] | null>(null);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState<string>("");

  const [wmsLayers, setWmsLayers] = useState<NspdLayer[]>([]);
  const [layerTree, setLayerTree] = useState<MapLayer[]>([]);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  const [visible, setVisible] = useState<Set<string>>(() => new Set<string>());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>());

  const [searchType, setSearchType] = useState<SearchTypeId>(1);
  const [searchResults, setSearchResults] = useState<GeoObject[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selection, setSelection] = useState<GeoObject[]>([]);
  const [detail, setDetail] = useState<GeoObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchThemes();
        if (cancelled) return;
        if (fetched.length > 0) {
          setThemes(fetched);
          setThemesError(null);
          const firstId = String(fetched[0]!.id);
          setDatasetId((prev) => (prev && fetched.some((t) => String(t.id) === prev) ? prev : firstId));
        } else {
          setThemesError(null);
        }
      } catch (e) {
        if (!cancelled) setThemesError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!datasetId) return;

    let cancelled = false;
    setTreeLoading(true);
    setTreeError(null);

    (async () => {
      try {
        const numericId = Number(datasetId);
        if (Number.isNaN(numericId)) {
          if (!cancelled) {
            setWmsLayers([]);
            setLayerTree([]);
            setVisible(new Set<string>());
            setExpanded(new Set<string>());
          }
          return;
        }

        const { layers, tree } = await fetchThemeTree(numericId);
        if (cancelled) return;

        if (!layers.length) {
          setTreeError("Слоев нет");
          setWmsLayers([]);
          setLayerTree([]);
          setVisible(new Set<string>());
          setExpanded(new Set<string>());
          return;
        }

        setWmsLayers(layers);

        const built = buildLayerTree(layers, tree);
        setLayerTree(built.length ? built : layers.map((l) => ({ id: String(l.layerId), title: l.title })));

        setVisible(new Set<string>());

        const expandIds = new Set<string>();
        const walk = (nodes: MapLayer[]) => {
          for (const n of nodes)
            if (n.children?.length) {
              expandIds.add(n.id);
              walk(n.children);
            }
        };
        walk(built);
        setExpanded(expandIds.size ? expandIds : new Set(built.map((b) => b.id)));
      } catch (e) {
        if (!cancelled) {
          setTreeError(e instanceof Error ? e.message : String(e));
          setWmsLayers([]);
          setLayerTree([]);
          setVisible(new Set<string>());
        }
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const t = setTimeout(async () => {
      try {
        const results = await searchGeoportal(q, searchType);
        if (cancelled) return;
        setSearchResults(results);
      } catch {
        if (cancelled) return;
        setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchType]);

  const markers: GeoObject[] = useMemo(() => {
    if (detail) return [detail];
    if (query.trim().length >= 2) return searchResults;
    if (selection.length > 0) return selection;
    return [];
  }, [detail, query, searchResults, selection]);

  const view: SidebarView = useMemo(() => {
    if (detail) return { mode: "detail", object: detail };
    const q = query.trim();
    if (q.length >= 2) return { mode: "search", results: searchResults, query: q };
    if (selection.length > 0) return { mode: "selection", objects: selection };
    return { mode: "layers" };
  }, [detail, query, searchResults, selection]);

  const datasetsForSidebar = useMemo(() => {
    if (themes && themes.length > 0) {
      return themes.map((t) => ({ id: String(t.id), title: t.name }));
    }
    return [] as { id: string; title: string }[];
  }, [themes]);

  function handleQueryChange(v: string) {
    setQuery(v);
    if (v.trim().length > 0) {
      setDetail(null);
      setSelection([]);
    }
  }

  function handleClearSearch() {
    setQuery("");
    setSearchResults([]);
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
    setSearchResults([]);
    setSelection([]);
  }

  function handleMapPick(objs: GeoObject[]) {
    setQuery("");
    setSearchResults([]);
    setDetail(null);
    setSelection(objs);
  }

  function handleMapSelect(obj: GeoObject) {
    setQuery("");
    setSearchResults([]);
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
        searchType={searchType}
        onSearchTypeChange={(v) => setSearchType(v)}
        datasets={datasetsForSidebar}
        datasetId={datasetId}
        onDatasetChange={(id) => {
          setDatasetId(id);
          setDetail(null);
          setSelection([]);
          setSearchResults([]);
          setQuery("");
        }}
        layers={layerTree}
        visible={visible}
        onToggleLayer={handleToggleLayer}
        expanded={expanded}
        onToggleExpand={handleToggleExpand}
        onSelectObject={handleSelectObject}
        onBack={handleBack}
        isLoading={treeLoading || searchLoading}
        error={themesError ?? treeError}
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
