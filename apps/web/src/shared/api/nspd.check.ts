import assert from "node:assert/strict";
import {
  buildLayerTree,
  cardSource,
  cardValue,
  mapGfiJsonToGeoObjects,
  parseCardSettings,
  pickPath,
} from "./nspd";
import type { NspdLayer } from "./nspd";
import type { GeoObject } from "../../entities/geo-object/model/types";
import { MAX_BULK_LAYERS, leafIds } from "../../entities/map-layer/model/types";
import type { MapLayer } from "../../entities/map-layer/model/types";

// Пример ответа geom-card-display-settings (кадастровый квартал)
const SETTINGS = {
  title: [{ prefix: "Кадастровый квартал", keyValue: "properties.options.cad_num", defaultValue: "-" }],
  card: [
    { keyName: "Тип", keyValue: "properties.options.obj_kind_value", keyType: "text", padding: false, defaultValue: "Кадастровый квартал", showEmpty: true, arrayJsonParamsShow: {} },
    { keyName: "Наименование", keyValue: "properties.options.name", keyType: "text", padding: false, defaultValue: "-", showEmpty: false, arrayJsonParamsShow: {} },
    { keyName: "Учетный номер", keyValue: "properties.options.cad_num", keyType: "text", padding: false, defaultValue: "-", showEmpty: true, arrayJsonParamsShow: {} },
    { keyName: "с границами", keyValue: "properties.options.cnt_land_geom", keyType: "number", padding: true, defaultValue: "0", showEmpty: true, arrayJsonParamsShow: {} },
  ],
};

const FEATURE = {
  properties: {
    category: 1,
    categoryName: "Кадастровый квартал",
    options: { cad_num: "77:01:0001001", cnt_land_geom: 5 },
  },
};

function run(): void {
  // pickPath: вложенный путь и промахи
  assert.equal(pickPath(FEATURE, "properties.options.cad_num"), "77:01:0001001");
  assert.equal(pickPath(FEATURE, "properties.options.missing"), undefined);
  assert.equal(pickPath(null, "properties.options.cad_num"), undefined);

  // parseCardSettings: прямой ответ и конверты {data}, {data:{data}}
  assert.deepEqual(parseCardSettings(SETTINGS)?.card.length, 4);
  assert.deepEqual(parseCardSettings({ data: SETTINGS })?.card.length, 4);
  assert.deepEqual(parseCardSettings({ data: { data: SETTINGS } })?.title.length, 1);
  assert.equal(parseCardSettings({ foo: 1 }), null);
  assert.equal(parseCardSettings({ data: { title: [], card: [] } }), null);

  const s = parseCardSettings(SETTINGS)!;

  // cardValue: значение, дефолт при showEmpty, скрытие при showEmpty=false
  assert.equal(cardValue(s.card[2]!, FEATURE), "77:01:0001001");
  assert.equal(cardValue(s.card[0]!, FEATURE), "Кадастровый квартал");
  assert.equal(cardValue(s.card[3]!, FEATURE), "5");
  assert.equal(cardValue(s.card[1]!, FEATURE), "-");
  assert.equal(
    cardValue({ keyValue: "properties.options.nope", showEmpty: false }, FEATURE),
    null,
  );

  // Заголовок карточки: "префикс + значение"
  const head = s.title
    .map((t) => [t.prefix, cardValue(t, FEATURE)].filter(Boolean).join(" "))
    .join(" ");
  assert.equal(head, "Кадастровый квартал 77:01:0001001");

  // Дерево слоёв: id среди сиблингов уникальны (ключи React)
  const layers = [
    { layerId: 1, title: "A" },
    { layerId: 2, title: "B" },
    { layerId: 3, title: "C" },
  ] as NspdLayer[];
  const nodes = buildLayerTree(layers, {
    layers: [1],
    folders: [{ id: 10, name: "F", layers: [2, 2] }],
  });
  const rootIds = nodes.map((n) => n.id);
  assert.deepEqual(rootIds, ["10", "1", "3"]);
  assert.deepEqual(
    nodes[0]!.children!.map((c) => c.id),
    ["2"],
  );

  // GFI с клика по карте: имя из name_by_doc, категория и raw насквозь
  const gfi = {
    features: [
      {
        id: 1,
        geometry: null,
        properties: {
          x: 37.6,
          y: 55.7,
          name_by_doc: "Здание школы",
          name: "Школа",
          category: 5,
          categoryName: "ООПТ",
          cad_num: "77:01:1",
        },
      },
      {
        id: 2,
        geometry: null,
        properties: { x: 37.7, y: 55.8, name: "Без докум-имени" },
      },
    ],
  };
  const gobjs = mapGfiJsonToGeoObjects(gfi, "100", { categoryId: 9 });
  assert.equal(gobjs[0]!.title, "Здание школы");
  assert.equal(gobjs[0]!.categoryId, "5");
  assert.equal(gobjs[0]!.categoryName, "ООПТ");
  assert.deepEqual(
    pickPath(gobjs[0]!.raw, "properties.cad_num"),
    "77:01:1",
  );
  // Нет name_by_doc — fallback; нет категории в props — из мета слоя
  assert.equal(gobjs[1]!.title, "Без докум-имени");
  assert.equal(gobjs[1]!.categoryId, "9");
  assert.equal(gobjs[1]!.categoryName, undefined);

  // cardSource: пути "properties.options.*" резолвятся в обоих формах
  assert.equal(
    pickPath(cardSource(gobjs[0]!), "properties.options.cad_num"),
    "77:01:1",
  );
  const optRaw = { properties: { options: { a: 1 } } };
  const flatObj = {
    id: "g",
    title: "t",
    subtitle: "",
    layerId: "1",
    coords: [0, 0],
    props: { cad_num: "1" },
  } as GeoObject;
  const optObj = { ...flatObj, raw: optRaw };
  assert.equal(cardSource(optObj), optRaw);
  assert.deepEqual(cardSource(flatObj), {
    properties: { options: { cad_num: "1" } },
  });

  // Реальная форма GFI: всё вложено в properties.options
  const nested = {
    features: [
      {
        id: 7,
        geometry: null,
        properties: {
          x: 37.6,
          y: 55.7,
          options: {
            name_by_doc: "Корпус по документу",
            cad_num: "77:02:3",
            category: 4,
          },
        },
      },
    ],
  };
  const nobj = mapGfiJsonToGeoObjects(nested, "200")[0]!;
  assert.equal(nobj.title, "Корпус по документу");
  assert.equal(nobj.categoryId, "4");
  assert.equal(
    pickPath(cardSource(nobj), "properties.options.name_by_doc"),
    "Корпус по документу",
  );

  // Папки: считаются все дочерние слои, bulk-тоггл только до лимита
  const folder = {
    id: "f",
    title: "F",
    children: [
      { id: "a", title: "A" },
      {
        id: "g",
        title: "G",
        children: [
          { id: "b", title: "B" },
          { id: "c", title: "C" },
        ],
      },
    ],
  } as MapLayer;
  assert.deepEqual(leafIds(folder), ["a", "b", "c"]);
  assert.deepEqual(leafIds({ id: "a", title: "A" } as MapLayer), ["a"]);
  assert.equal(MAX_BULK_LAYERS, 5);
}

if (import.meta.main) {
  run();
}
