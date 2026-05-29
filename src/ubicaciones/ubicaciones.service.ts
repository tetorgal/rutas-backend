import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UbicacionesService {
  constructor(private prisma: PrismaService) {}

  async obtenerTodas() {
    return this.prisma.ubicacionReportada.findMany({
      orderBy: { creadoEn: 'desc' },
    });
  }
}
