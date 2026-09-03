export type MapLayer = {
  id: string;
  title: string;
  count?: number;
  children?: MapLayer[];
};

export type DatasetOption = {
  id: string;
  title: string;
};
