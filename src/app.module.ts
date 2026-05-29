import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [WhatsappModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
