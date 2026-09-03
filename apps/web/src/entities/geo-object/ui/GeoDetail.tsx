import type { GeoObject } from "../model/types";

export function GeoDetail({ obj }: { obj: GeoObject }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{obj.title}</h2>
        <p className="text-xs text-zinc-500 mt-1">{obj.subtitle}</p>
        {obj.address && (
          <p className="text-sm text-zinc-600 mt-2">{obj.address}</p>
        )}
      </div>
      <div className="rounded-lg border border-zinc-200 overflow-hidden text-zinc-900">
        <div className="px-3 py-2 text-xs font-medium bg-zinc-50 border-b border-zinc-200">
          Свойства
        </div>
        <dl className="divide-y divide-zinc-100">
          {Object.entries(obj.props).map(([k, v]) => (
            <div key={k} className="flex justify-between px-3 py-2 text-sm">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="font-medium text-zinc-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
