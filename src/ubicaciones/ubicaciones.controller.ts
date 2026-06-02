import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { UbicacionesService } from './ubicaciones.service';
import { DiaSemana } from '@prisma/client';

@Controller('ubicaciones')
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Get()
  async obtenerTodas() {
    return this.ubicacionesService.obtenerTodas();
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.ubicacionesService.obtenerPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body()
    data: {
      nombre: string;
      latitud: number;
      longitud: number;
      SAP: string;
      urlOriginal?: string;
      vendedorLid?: string | null;
      rutaId?: string | null;
      diasVisita?: DiaSemana[];
    },
  ) {
    return this.ubicacionesService.crear(data);
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body()
    data: {
      nombre?: string;
      latitud?: number;
      longitud?: number;
      SAP?: string;
      urlOriginal?: string;
      vendedorLid?: string | null;
      rutaId?: string | null;
      diasVisita?: DiaSemana[];
    },
  ) {
    return this.ubicacionesService.actualizar(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string) {
    await this.ubicacionesService.eliminar(id);
  }
}
