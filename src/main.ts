import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:3001',
      // 'https://turnos.vecinoscomprometidos.com',
      // 'https://turnos-oficinas.vecinoscomprometidos.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });
  await app.listen(process.env.PORT ?? 3000);
  // Habilitar peticiones desde el frontend
}
bootstrap();
