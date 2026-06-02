import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VendedoresService } from './vendedores.service';
import { CreateVendedorDto } from './dto/create-vendedor.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';

@Controller('vendedores')
export class VendedoresController {
  constructor(private readonly vendedoresService: VendedoresService) {}

  @Get()
  async obtenerTodos() {
    return this.vendedoresService.obtenerTodos();
  }

  @Get(':lid')
  async obtenerPorLid(@Param('lid') lid: string) {
    return this.vendedoresService.obtenerPorLid(lid);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() createVendedorDto: CreateVendedorDto) {
    return this.vendedoresService.crear(createVendedorDto);
  }

  @Put(':lid')
  async actualizar(
    @Param('lid') lid: string,
    @Body() updateVendedorDto: UpdateVendedorDto,
  ) {
    return this.vendedoresService.actualizar(lid, updateVendedorDto);
  }

  @Delete(':lid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('lid') lid: string) {
    await this.vendedoresService.eliminar(lid);
  }
}
