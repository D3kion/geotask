"use client";

import type { MapLayer } from "@/entities/map-layer/model/types";
import { MAX_BULK_LAYERS, leafIds } from "@/entities/map-layer/model/types";

export function LayerTree({
  layers,
  visible,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  layers: MapLayer[];
  visible: Set<string>;
  onToggle: (id: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {layers.map((l) => (
        <LayerNode
          key={l.id}
          layer={l}
          depth={0}
          visible={visible}
          onToggle={onToggle}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
}

function LayerNode({
  layer,
  depth,
  visible,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  layer: MapLayer;
  depth: number;
  visible: Set<string>;
  onToggle: (id: string) => void;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = !!layer.children?.length;
  const isExpanded = expanded.has(layer.id);
  const leaves = hasChildren ? leafIds(layer) : [];
  const bulkOff = leaves.length > MAX_BULK_LAYERS;
  const isVisible = hasChildren
    ? leaves.some((id) => visible.has(id))
    : visible.has(layer.id);

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(layer.id)}
            className="h-5 w-5 grid place-items-center rounded hover:bg-zinc-200 text-xs text-zinc-600"
            aria-label={isExpanded ? "Свернуть" : "Развернуть"}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}

        <input
          type="checkbox"
          checked={isVisible}
          disabled={bulkOff}
          title={
            bulkOff
              ? `Слоёв много (${leaves.length}) — включайте по одному`
              : undefined
          }
          onChange={() => {
            if (!hasChildren) {
              onToggle(layer.id);
              return;
            }
            const allOn = leaves.every((id) => visible.has(id));
            for (const id of leaves) {
              if (allOn && visible.has(id)) onToggle(id);
              if (!allOn && !visible.has(id)) onToggle(id);
            }
          }}
          className="h-4 w-4 accent-zinc-900 disabled:opacity-40"
        />

        <span className="flex-1 text-sm text-zinc-800 truncate">
          {layer.title}
        </span>

        {layer.count !== undefined && (
          <span className="text-xs text-zinc-400">{layer.count}</span>
        )}
        {hasChildren && (
          <span className="text-xs text-zinc-400">{leaves.length}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {layer.children!.map((c) => (
            <LayerNode
              key={c.id}
              layer={c}
              depth={depth + 1}
              visible={visible}
              onToggle={onToggle}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
