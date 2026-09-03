"use client";

import type { MapLayer } from "@/entities/map-layer/model/types";

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
  const isVisible = hasChildren
    ? (layer.children?.some((c) => visible.has(c.id)) ?? false) ||
      visible.has(layer.id)
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
          onChange={() => {
            if (hasChildren && layer.children) {
              const allOn = layer.children.every((c) => visible.has(c.id));
              layer.children.forEach((c) => {
                if (allOn && visible.has(c.id)) onToggle(c.id);
                if (!allOn && !visible.has(c.id)) onToggle(c.id);
              });
            } else {
              onToggle(layer.id);
            }
          }}
          className="h-4 w-4 accent-zinc-900"
        />

        <span className="flex-1 text-sm text-zinc-800 truncate">
          {layer.title}
        </span>

        {layer.count !== undefined && (
          <span className="text-xs text-zinc-400">{layer.count}</span>
        )}
        {hasChildren && layer.children && (
          <span className="text-xs text-zinc-400">{layer.children.length}</span>
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
