import { Test, TestingModule } from '@nestjs/testing';
import { VendedoresService } from './vendedores.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrismaService = {
  vendedor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ruta: {
    findUnique: jest.fn(),
  },
};

describe('VendedoresService', () => {
  let service: VendedoresService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendedoresService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VendedoresService>(VendedoresService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerTodos', () => {
    it('should return all vendedores with their routes', async () => {
      const result = [{ lid: '123', nombreReal: 'Juan', activo: true }];
      prisma.vendedor.findMany.mockResolvedValue(result);

      expect(await service.obtenerTodos()).toEqual(result);
      expect(prisma.vendedor.findMany).toHaveBeenCalledWith({
        include: { rutaActual: true },
        orderBy: { creadoEn: 'desc' },
      });
    });
  });

  describe('obtenerPorLid', () => {
    it('should return a vendedor if found', async () => {
      const result = { lid: '123', nombreReal: 'Juan', activo: true };
      prisma.vendedor.findUnique.mockResolvedValue(result);

      expect(await service.obtenerPorLid('123')).toEqual(result);
      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { lid: '123' },
        include: { rutaActual: true },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPorLid('123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('crear', () => {
    it('should create a new vendedor successfully', async () => {
      const dto = { lid: '123', nombreReal: 'Juan', telefono: '555' };
      prisma.vendedor.findUnique.mockResolvedValue(null);
      prisma.vendedor.create.mockResolvedValue({ ...dto, activo: true });

      const res = await service.crear(dto);
      expect(res).toEqual({ ...dto, activo: true });
      expect(prisma.vendedor.create).toHaveBeenCalledWith({
        data: {
          lid: '123',
          nombreReal: 'Juan',
          telefono: '555',
          activo: true,
          rutaActualId: undefined,
        },
        include: { rutaActual: true },
      });
    });

    it('should throw BadRequestException if lid is missing', async () => {
      await expect(
        service.crear({ lid: '', nombreReal: 'Juan' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vendedor already exists', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ lid: '123' });
      await expect(
        service.crear({ lid: '123', nombreReal: 'Juan' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
