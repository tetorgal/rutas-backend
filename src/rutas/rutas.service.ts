import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RutasService {
  constructor(private prisma: PrismaService) {}

  async obtenerTodas() {
    return this.prisma.ruta.findMany({
      include: {
        vendedores: true,
        ubicaciones: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerPorId(id: string) {
    const ruta = await this.prisma.ruta.findUnique({
      where: { id },
      include: {
        vendedores: true,
        ubicaciones: true,
      },
    });
    if (!ruta) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }
    return ruta;
  }

  async crear(data: { nombre: string; colorHex?: string }) {
    return this.prisma.ruta.create({
      data: {
        nombre: data.nombre,
        colorHex: data.colorHex ?? '#3B82F6',
      },
    });
  }

  async actualizar(id: string, data: { nombre?: string; colorHex?: string }) {
    const existe = await this.prisma.ruta.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }
    return this.prisma.ruta.update({
      where: { id },
      data: {
        nombre: data.nombre,
        colorHex: data.colorHex,
      },
    });
  }

  async eliminar(id: string) {
    const existe = await this.prisma.ruta.findUnique({ where: { id } });
    if (!existe) {
      throw new NotFoundException(`Ruta con ID ${id} no encontrada`);
    }
    return this.prisma.ruta.delete({ where: { id } });
  }
}
