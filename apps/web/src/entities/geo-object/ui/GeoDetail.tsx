"use client";

import { useQuery } from "@tanstack/react-query";
import type { GeoObject } from "../model/types";
import { objTitle } from "../model/types";
import { cardSource, cardValue, fetchCardSettings } from "@/shared/api/nspd";

export function GeoDetail({ obj }: { obj: GeoObject }) {
  const { data: settings } = useQuery({
    queryKey: ["card-settings", obj.categoryId],
    queryFn: () => fetchCardSettings(obj.categoryId!),
    enabled: !!obj.categoryId,
  });

  const src = cardSource(obj);

  const head = settings?.title
    .map((t) => [t.prefix, cardValue(t, src)].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" ");

  const rows = settings?.card
    .map((f) => ({ name: f.keyName, value: cardValue(f, src), pad: f.padding }))
    .filter((r) => r.value != null);

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {head || objTitle(obj)}
        </h2>
      </div>
      <div className="rounded-lg border border-zinc-200 overflow-hidden text-zinc-900">
        <div className="px-3 py-2 text-xs font-medium bg-zinc-50 border-b border-zinc-200">
          Информация
        </div>
        {rows && rows.length > 0 ? (
          <dl className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <div
                key={r.name}
                className="flex justify-between gap-3 px-3 py-2 text-sm"
              >
                <dt className={`text-zinc-500${r.pad ? " pl-6" : ""}`}>
                  {r.name}
                </dt>
                <dd className="font-medium text-zinc-900 text-right">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <dl className="divide-y divide-zinc-100">
            {Object.entries(obj.props).map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-2 text-sm">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="font-medium text-zinc-900">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
