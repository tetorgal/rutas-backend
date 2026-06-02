import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';

@Injectable()
export class VendedoresService {
  constructor(private prisma: PrismaService) {}

  async obtenerTodos() {
    return this.prisma.vendedor.findMany({
      include: {
        rutaActual: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async obtenerPorLid(lid: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { lid },
      include: {
        rutaActual: true,
      },
    });

    if (!vendedor) {
      throw new NotFoundException(`Vendedor con LID ${lid} no encontrado`);
    }

    return vendedor;
  }

  async crear(createVendedorDto: CreateVendedorDto) {
    const { lid, nombreReal, telefono, activo, rutaActualId } =
      createVendedorDto;

    if (!lid) {
      throw new BadRequestException('El campo lid es requerido');
    }
    if (!nombreReal) {
      throw new BadRequestException('El campo nombreReal es requerido');
    }

    const existe = await this.prisma.vendedor.findUnique({
      where: { lid },
    });

    if (existe) {
      throw new BadRequestException(`El vendedor con LID ${lid} ya existe`);
    }

    // Si se pasa rutaActualId, verificar que exista la ruta
    if (rutaActualId) {
      const rutaExiste = await this.prisma.ruta.findUnique({
        where: { id: rutaActualId },
      });
      if (!rutaExiste) {
        throw new NotFoundException(`La ruta con ID ${rutaActualId} no existe`);
      }
    }

    return this.prisma.vendedor.create({
      data: {
        lid,
        nombreReal,
        telefono,
        activo: activo ?? true,
        rutaActualId,
      },
      include: {
        rutaActual: true,
      },
    });
  }

  async actualizar(lid: string, updateVendedorDto: UpdateVendedorDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { lid },
    });

    if (!vendedor) {
      throw new NotFoundException(`Vendedor con LID ${lid} no encontrado`);
    }

    const { nombreReal, telefono, activo, rutaActualId } = updateVendedorDto;

    // Si se actualiza rutaActualId, verificar que exista
    if (rutaActualId !== undefined && rutaActualId !== null) {
      const rutaExiste = await this.prisma.ruta.findUnique({
        where: { id: rutaActualId },
      });
      if (!rutaExiste) {
        throw new NotFoundException(`La ruta con ID ${rutaActualId} no existe`);
      }
    }

    return this.prisma.vendedor.update({
      where: { lid },
      data: {
        nombreReal,
        telefono,
        activo,
        rutaActualId,
      },
      include: {
        rutaActual: true,
      },
    });
  }

  async eliminar(lid: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { lid },
    });

    if (!vendedor) {
      throw new NotFoundException(`Vendedor con LID ${lid} no encontrado`);
    }

    return this.prisma.vendedor.delete({
      where: { lid },
    });
  }
}
