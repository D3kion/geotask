import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { NspdService } from './nspd.service.js';

@Controller()
export class NspdController {
  constructor(private readonly nspd: NspdService) {}

  @Get('api/geoportal/v1/layers-theme')
  layersTheme(@Query() q: Record<string, string>, @Res() res: Response) {
    return this.nspd.proxy('/api/geoportal/v1/layers-theme', q, res);
  }

  @Get('api/geoportal/v1/layers-theme-tree')
  layersThemeTree(@Query() q: Record<string, string>, @Res() res: Response) {
    return this.nspd.proxy('/api/geoportal/v1/layers-theme-tree', q, res);
  }

  @Get('api/aeggis/v4/:layerId/wms')
  wms(
    @Param('layerId') layerId: string,
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.nspd.proxy(
      `/api/aeggis/v4/${encodeURIComponent(layerId)}/wms`,
      q,
      res,
    );
  }

  @Get('api/geoportal/v2/search/geoportal')
  search(@Query() q: Record<string, string>, @Res() res: Response) {
    return this.nspd.proxy('/api/geoportal/v2/search/geoportal', q, res);
  }

  @Get('api/geoportal/v1/geom-card-display-settings/:categoryId')
  cardSettings(
    @Param('categoryId') categoryId: string,
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    return this.nspd.proxy(
      `/api/geoportal/v1/geom-card-display-settings/${encodeURIComponent(categoryId)}`,
      q,
      res,
    );
  }
}
