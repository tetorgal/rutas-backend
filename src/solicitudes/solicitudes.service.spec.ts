import { Test, TestingModule } from '@nestjs/testing';
import { SolicitudesService } from './solicitudes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  solicitudAcceso: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  vendedor: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  ruta: {
    findUnique: jest.fn(),
  },
};

describe('SolicitudesService', () => {
  let service: SolicitudesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SolicitudesService>(SolicitudesService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerTodas', () => {
    it('should return all solicitudes', async () => {
      const result = [{ lid: '123', nombreWa: 'JuanWa', estado: 'PENDIENTE' }];
      prisma.solicitudAcceso.findMany.mockResolvedValue(result);

      expect(await service.obtenerTodas()).toEqual(result);
      expect(prisma.solicitudAcceso.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { fecha: 'desc' },
      });
    });

    it('should filter solicitudes by status', async () => {
      const result = [{ lid: '123', nombreWa: 'JuanWa', estado: 'PENDIENTE' }];
      prisma.solicitudAcceso.findMany.mockResolvedValue(result);

      expect(await service.obtenerTodas('PENDIENTE')).toEqual(result);
      expect(prisma.solicitudAcceso.findMany).toHaveBeenCalledWith({
        where: { estado: 'PENDIENTE' },
        orderBy: { fecha: 'desc' },
      });
    });
  });

  describe('aprobar', () => {
    it('should approve a solicitud and upsert vendedor successfully', async () => {
      const solicitud = { lid: '123', nombreWa: 'JuanWa', estado: 'PENDIENTE' };
      const vendedor = {
        lid: '123',
        nombreReal: 'Juan Perez',
        telefono: '123',
        activo: true,
      };

      prisma.solicitudAcceso.findUnique.mockResolvedValue(solicitud);
      prisma.solicitudAcceso.update.mockResolvedValue({
        ...solicitud,
        estado: 'APROBADO',
      });
      prisma.vendedor.upsert.mockResolvedValue(vendedor);

      const res = await service.aprobar('123', {
        nombreReal: 'Juan Perez',
        telefono: '123',
      });
      expect(res).toEqual({
        solicitudLid: '123',
        estado: 'APROBADO',
        vendedor,
      });

      expect(prisma.solicitudAcceso.update).toHaveBeenCalledWith({
        where: { lid: '123' },
        data: { estado: 'APROBADO' },
      });

      expect(prisma.vendedor.upsert).toHaveBeenCalledWith({
        where: { lid: '123' },
        update: {
          nombreReal: 'Juan Perez',
          telefono: '123',
          activo: true,
        },
        create: {
          lid: '123',
          nombreReal: 'Juan Perez',
          telefono: '123',
          activo: true,
          rutaActualId: undefined,
        },
        include: {
          rutaActual: true,
        },
      });
    });

    it('should throw NotFoundException if solicitud does not exist', async () => {
      prisma.solicitudAcceso.findUnique.mockResolvedValue(null);
      await expect(service.aprobar('123', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rechazar', () => {
    it('should reject a solicitud and deactivate vendedor if exists', async () => {
      const solicitud = { lid: '123', nombreWa: 'JuanWa', estado: 'PENDIENTE' };
      prisma.solicitudAcceso.findUnique.mockResolvedValue(solicitud);
      prisma.solicitudAcceso.update.mockResolvedValue({
        ...solicitud,
        estado: 'RECHAZADO',
      });
      prisma.vendedor.findUnique.mockResolvedValue({
        lid: '123',
        activo: true,
      });

      const res = await service.rechazar('123');
      expect(res).toEqual({
        solicitudLid: '123',
        estado: 'RECHAZADO',
        desactivadoVendedor: true,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { lid: '123' },
        data: { activo: false },
      });
    });

    it('should throw NotFoundException if solicitud does not exist', async () => {
      prisma.solicitudAcceso.findUnique.mockResolvedValue(null);
      await expect(service.rechazar('123')).rejects.toThrow(NotFoundException);
    });
  });
});
