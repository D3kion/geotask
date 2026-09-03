export const API_BASE = "";

export const NSPD_ENDPOINTS = {
  themes: "/api/geoportal/v1/layers-theme",
  tree: "/api/geoportal/v1/layers-theme-tree",
  search: "/api/geoportal/v2/search/geoportal",
  wms: (layerId: string | number) => `/api/aeggis/v4/${layerId}/wms`,
  cardSettings: (categoryId: string | number) =>
    `/api/geoportal/v1/geom-card-display-settings/${categoryId}`,
  authStatus: "/api/auth/status",
} as const;
