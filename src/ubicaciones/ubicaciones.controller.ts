import { Controller, Get } from '@nestjs/common';
import { UbicacionesService } from './ubicaciones.service';

@Controller('ubicaciones')
export class UbicacionesController {
  constructor(private ubicacionesService: UbicacionesService) {}

  @Get()
  async obtenerTodas() {
    return this.ubicacionesService.obtenerTodas();
  }
}
