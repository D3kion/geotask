import type { GeoObject } from "../model/types";
import { objTitle } from "../model/types";

export function GeoListItem({
  obj,
  onClick,
}: {
  obj: GeoObject;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50 transition-colors bg-white"
    >
      <div className="text-sm font-medium leading-none text-zinc-900">
        {objTitle(obj)}
      </div>
    </button>
  );
}
