/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoObject } from "../model/types";
import { GeoListItem } from "./GeoListItem";

export function GeoGroupedList({
  objects,
  getLayerTitle,
  onSelect,
}: {
  objects: GeoObject[];
  getLayerTitle?: (layerId: string) => string | undefined;
  onSelect: (o: GeoObject) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, GeoObject[]>();
    for (const o of objects) {
      const key = o.layerId || "unknown";
      const arr = map.get(key);
      if (arr) arr.push(o);
      else map.set(key, [o]);
    }
    return [...map.entries()].sort((a, b) => {
      const ta = getLayerTitle?.(a[0]) ?? a[0];
      const tb = getLayerTitle?.(b[0]) ?? b[0];
      return ta.localeCompare(tb, "ru");
    });
  }, [objects, getLayerTitle]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.map(([k]) => k)),
  );

  useEffect(() => {
    setExpanded(new Set(groups.map(([k]) => k)));
  }, [groups]);

  return (
    <div className="space-y-2">
      {groups.map(([layerId, items]) => {
        const rawTitle = getLayerTitle?.(layerId);
        const fallback =
          items[0]?.subtitle?.split("·")[0]?.trim() ||
          items[0]?.subtitle ||
          layerId;
        const title =
          rawTitle && rawTitle !== layerId ? rawTitle : fallback || layerId;
        const isOpen = expanded.has(layerId);
        const open = expanded.size === 0 ? true : isOpen;

        return (
          <div
            key={layerId}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <button
              onClick={() => {
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (prev.size === 0 && groups.length > 0) {
                    groups.forEach(([k]) => next.add(k));
                  }
                  if (next.has(layerId)) next.delete(layerId);
                  else next.add(layerId);
                  return next;
                });
              }}
              className="flex w-full items-center gap-2 bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
            >
              <span className="grid h-5 w-5 place-items-center rounded text-[10px] text-zinc-500">
                {open ? "▾" : "▸"}
              </span>
              <span className="flex-1 text-sm font-medium text-zinc-800">
                {title}
              </span>
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                {items.length}
              </span>
            </button>

            {open && (
              <div className="space-y-1.5 p-1.5">
                {items.map((o) => (
                  <GeoListItem key={o.id} obj={o} onClick={() => onSelect(o)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
