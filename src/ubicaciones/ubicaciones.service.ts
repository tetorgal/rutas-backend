import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiaSemana } from '@prisma/client';

@Injectable()
export class UbicacionesService {
  constructor(private prisma: PrismaService) {}

  async obtenerTodas() {
    return this.prisma.ubicacionReportada.findMany({
      include: {
        ruta: true,
        vendedor: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtenerPorId(id: string) {
    const ubicacion = await this.prisma.ubicacionReportada.findUnique({
      where: { id },
      include: {
        ruta: true,
        vendedor: true,
      },
    });

    if (!ubicacion) {
      throw new NotFoundException(`Ubicación con ID ${id} no encontrada`);
    }

    return ubicacion;
  }

  async crear(data: {
    nombre: string;
    latitud: number;
    longitud: number;
    SAP: string;
    urlOriginal?: string;
    vendedorLid?: string | null;
    rutaId?: string | null;
    diasVisita?: DiaSemana[];
  }) {
    if (data.rutaId) {
      const rutaExiste = await this.prisma.ruta.findUnique({ where: { id: data.rutaId } });
      if (!rutaExiste) {
        throw new NotFoundException(`La ruta con ID ${data.rutaId} no existe`);
      }
    }

    return this.prisma.ubicacionReportada.create({
      data: {
        nombre: data.nombre,
        latitud: data.latitud,
        longitud: data.longitud,
        SAP: data.SAP,
        urlOriginal: data.urlOriginal ?? '',
        vendedorLid: data.vendedorLid || null,
        rutaId: data.rutaId || null,
        diasVisita: data.diasVisita || [],
      },
      include: {
        ruta: true,
        vendedor: true,
      },
    });
  }

  async actualizar(
    id: string,
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
    const existe = await this.prisma.ubicacionReportada.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException(`Ubicación con ID ${id} no encontrada`);
    }

    if (data.rutaId) {
      const rutaExiste = await this.prisma.ruta.findUnique({ where: { id: data.rutaId } });
      if (!rutaExiste) {
        throw new NotFoundException(`La ruta con ID ${data.rutaId} no existe`);
      }
    }

    return this.prisma.ubicacionReportada.update({
      where: { id },
      data: {
        nombre: data.nombre,
        latitud: data.latitud,
        longitud: data.longitud,
        SAP: data.SAP,
        urlOriginal: data.urlOriginal,
        vendedorLid: data.vendedorLid === null ? null : data.vendedorLid,
        rutaId: data.rutaId === null ? null : data.rutaId,
        diasVisita: data.diasVisita,
      },
      include: {
        ruta: true,
        vendedor: true,
      },
    });
  }

  async eliminar(id: string) {
    const existe = await this.prisma.ubicacionReportada.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException(`Ubicación con ID ${id} no encontrada`);
    }

    return this.prisma.ubicacionReportada.delete({
      where: { id },
    });
  }
}
