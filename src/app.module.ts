import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PrismaModule } from './prisma/prisma.module';
import { UbicacionesModule } from './ubicaciones/ubicaciones.module';
import { VendedoresModule } from './vendedores/vendedores.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { RutasModule } from './rutas/rutas.module';

@Module({
  imports: [
    WhatsappModule,
    PrismaModule,
    UbicacionesModule,
    VendedoresModule,
    SolicitudesModule,
    RutasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
