import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { AprobarSolicitudDto } from './dto/aprobar-solicitud.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  async obtenerTodas(@Query('estado') estado?: string) {
    return this.solicitudesService.obtenerTodas(estado);
  }

  @Get(':lid')
  async obtenerPorLid(@Param('lid') lid: string) {
    return this.solicitudesService.obtenerPorLid(lid);
  }

  @Post(':lid/aprobar')
  @HttpCode(HttpStatus.OK)
  async aprobar(
    @Param('lid') lid: string,
    @Body() aprobarSolicitudDto: AprobarSolicitudDto,
  ) {
    return this.solicitudesService.aprobar(lid, aprobarSolicitudDto);
  }

  @Post(':lid/rechazar')
  @HttpCode(HttpStatus.OK)
  async rechazar(@Param('lid') lid: string) {
    return this.solicitudesService.rechazar(lid);
  }

  @Delete(':lid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('lid') lid: string) {
    await this.solicitudesService.eliminar(lid);
  }
}
