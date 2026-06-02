import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { RutasService } from './rutas.service';

@Controller('rutas')
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  @Get()
  async obtenerTodas() {
    return this.rutasService.obtenerTodas();
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.rutasService.obtenerPorId(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() data: { nombre: string; colorHex?: string }) {
    return this.rutasService.crear(data);
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() data: { nombre?: string; colorHex?: string },
  ) {
    return this.rutasService.actualizar(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: string) {
    await this.rutasService.eliminar(id);
  }
}
