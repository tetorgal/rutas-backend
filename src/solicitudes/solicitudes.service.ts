import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AprobarSolicitudDto } from './dto/aprobar-solicitud.dto';

@Injectable()
export class SolicitudesService {
  constructor(private prisma: PrismaService) {}

  async obtenerTodas(estado?: string) {
    const whereClause = estado ? { estado: estado.toUpperCase() } : {};
    return this.prisma.solicitudAcceso.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
    });
  }

  async obtenerPorLid(lid: string) {
    const solicitud = await this.prisma.solicitudAcceso.findUnique({
      where: { lid },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con LID ${lid} no encontrada`);
    }

    return solicitud;
  }

  async aprobar(lid: string, aprobarSolicitudDto: AprobarSolicitudDto) {
    const solicitud = await this.prisma.solicitudAcceso.findUnique({
      where: { lid },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con LID ${lid} no encontrada`);
    }

    const { nombreReal, telefono, rutaActualId } = aprobarSolicitudDto;

    // Verificar si la ruta existe si es proporcionada
    if (rutaActualId) {
      const rutaExiste = await this.prisma.ruta.findUnique({
        where: { id: rutaActualId },
      });
      if (!rutaExiste) {
        throw new NotFoundException(`La ruta con ID ${rutaActualId} no existe`);
      }
    }

    // 1. Actualizar el estado de la solicitud a APROBADO
    await this.prisma.solicitudAcceso.update({
      where: { lid },
      data: { estado: 'APROBADO' },
    });

    // 2. Crear o activar el vendedor
    const nombreVendedor =
      nombreReal || solicitud.nombreWa || 'Vendedor Autogestionado';
    const telVendedor = telefono || lid;

    const vendedor = await this.prisma.vendedor.upsert({
      where: { lid },
      update: {
        nombreReal: nombreVendedor,
        telefono: telVendedor,
        activo: true,
        ...(rutaActualId ? { rutaActualId } : {}),
      },
      create: {
        lid,
        nombreReal: nombreVendedor,
        telefono: telVendedor,
        activo: true,
        rutaActualId,
      },
      include: {
        rutaActual: true,
      },
    });

    return {
      solicitudLid: lid,
      estado: 'APROBADO',
      vendedor,
    };
  }

  async rechazar(lid: string) {
    const solicitud = await this.prisma.solicitudAcceso.findUnique({
      where: { lid },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con LID ${lid} no encontrada`);
    }

    // 1. Actualizar el estado de la solicitud a RECHAZADO
    await this.prisma.solicitudAcceso.update({
      where: { lid },
      data: { estado: 'RECHAZADO' },
    });

    // 2. Si el vendedor existe, desactivarlo
    const vendedorExiste = await this.prisma.vendedor.findUnique({
      where: { lid },
    });

    if (vendedorExiste) {
      await this.prisma.vendedor.update({
        where: { lid },
        data: { activo: false },
      });
    }

    return {
      solicitudLid: lid,
      estado: 'RECHAZADO',
      desactivadoVendedor: !!vendedorExiste,
    };
  }

  async eliminar(lid: string) {
    const solicitud = await this.prisma.solicitudAcceso.findUnique({
      where: { lid },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con LID ${lid} no encontrada`);
    }

    return this.prisma.solicitudAcceso.delete({
      where: { lid },
    });
  }
}
