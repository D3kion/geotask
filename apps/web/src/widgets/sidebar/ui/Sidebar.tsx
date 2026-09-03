"use client";

import type { GeoObject } from "@/entities/geo-object/model/types";
import type { MapLayer } from "@/entities/map-layer/model/types";
import { GeoListItem } from "@/entities/geo-object/ui/GeoListItem";
import { GeoDetail } from "@/entities/geo-object/ui/GeoDetail";
import { SearchInput } from "@/features/search/ui/SearchInput";
import { LayerTree } from "@/features/layer-tree/ui/LayerTree";
import { SEARCH_TYPES, type SearchTypeId } from "@/shared/api/nspd";

export type SidebarView =
  | { mode: "layers" }
  | { mode: "search"; results: GeoObject[]; query: string }
  | { mode: "selection"; objects: GeoObject[] }
  | { mode: "detail"; object: GeoObject };

export function Sidebar({
  view,
  query,
  onQueryChange,
  onClearSearch,
  searchType,
  onSearchTypeChange,
  datasets,
  datasetId,
  onDatasetChange,
  layers,
  visible,
  onToggleLayer,
  expanded,
  onToggleExpand,
  onSelectObject,
  onBack,
  isLoading,
  error,
}: {
  view: SidebarView;
  query: string;
  onQueryChange: (v: string) => void;
  onClearSearch: () => void;
  searchType: SearchTypeId;
  onSearchTypeChange: (id: SearchTypeId) => void;
  datasets: readonly { id: string; title: string }[];
  datasetId: string;
  onDatasetChange: (id: string) => void;
  layers: MapLayer[];
  visible: Set<string>;
  onToggleLayer: (id: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectObject: (o: GeoObject) => void;
  onBack: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-r border-zinc-200 bg-white">
      {/* Header для не-layers режимов */}
      {view.mode !== "layers" && (
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-3">
          <button
            onClick={onBack}
            className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 text-zinc-400"
          >
            ← Назад
          </button>
          <span className="text-sm font-medium text-zinc-900">
            {view.mode === "search" && `Результаты · ${view.results.length}`}
            {view.mode === "selection" && `Выбрано · ${view.objects.length}`}
            {view.mode === "detail" && view.object.title}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Режим: слои (дефолт) */}
        {view.mode === "layers" && (
          <div className="space-y-4 p-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchInput
                  value={query}
                  onChange={onQueryChange}
                  onClear={onClearSearch}
                />
              </div>
              <select
                value={searchType}
                onChange={(e) => onSearchTypeChange(Number(e.target.value) as SearchTypeId)}
                className="w-[150px] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                aria-label="Тип поиска"
              >
                {SEARCH_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
                Набор данных
              </label>
              {datasets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-center">
                  {isLoading ? (
                    <span className="text-xs text-zinc-400">Загрузка наборов…</span>
                  ) : error ? (
                    <span className="text-xs text-amber-700">Не удалось загрузить наборы</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Нет доступных наборов данных</span>
                  )}
                </div>
              ) : (
                <select
                  value={datasetId}
                  onChange={(e) => onDatasetChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                  Слои
                </span>
                {isLoading && <span className="text-xs text-zinc-400">Загрузка…</span>}
              </div>
              {error ? (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  API недоступен: {error.slice(0, 160)}
                </div>
              ) : null}
              {layers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center">
                  {isLoading ? (
                    <span className="text-xs text-zinc-400">Загрузка слоёв…</span>
                  ) : error ? (
                    <span className="text-xs text-zinc-500">Слои недоступны</span>
                  ) : !datasetId ? (
                    <span className="text-xs text-zinc-500">Выберите набор данных</span>
                  ) : (
                    <span className="text-xs text-zinc-500">В этом наборе нет слоёв</span>
                  )}
                </div>
              ) : (
                <LayerTree
                  layers={layers}
                  visible={visible}
                  onToggle={onToggleLayer}
                  expanded={expanded}
                  onToggleExpand={onToggleExpand}
                />
              )}
            </div>

            <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-3">
              Клик по карте — выбор объектов. Поиск — фильтр по названию и
              адресу.
            </p>
          </div>
        )}

        {/* Режим: результаты поиска */}
        {view.mode === "search" && (
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchInput
                  value={query}
                  onChange={onQueryChange}
                  onClear={onClearSearch}
                />
              </div>
              <select
                value={searchType}
                onChange={(e) => onSearchTypeChange(Number(e.target.value) as SearchTypeId)}
                className="w-[150px] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                aria-label="Тип поиска"
              >
                {SEARCH_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {isLoading && (
              <div className="text-xs text-zinc-400">Ищем в НСПД…</div>
            )}
            {view.results.length === 0 && !isLoading ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                Ничего не найдено по «{view.query}»
              </div>
            ) : (
              <div className="space-y-2">
                {view.results.map((o) => (
                  <GeoListItem
                    key={o.id}
                    obj={o}
                    onClick={() => onSelectObject(o)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Режим: выбор с карты (тот же список что и поиск) */}
        {view.mode === "selection" && (
          <div className="p-3 space-y-2">
            {view.objects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                Нет объектов в этой точке — попробуйте кликнуть ближе к маркеру
              </div>
            ) : (
              view.objects.map((o) => (
                <GeoListItem
                  key={o.id}
                  obj={o}
                  onClick={() => onSelectObject(o)}
                />
              ))
            )}
          </div>
        )}

        {/* Режим: карточка объекта */}
        {view.mode === "detail" && (
          <div className="p-3">
            <GeoDetail obj={view.object} />
          </div>
        )}
      </div>

      {/* Футер с подсказкой */}
      <div className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-400 flex justify-between">
        <span>{visible.size} слоёв включено</span>
        <span className="hidden sm:inline">OpenLayers · OSM</span>
      </div>
    </aside>
  );
}
