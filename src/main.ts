import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as dotenv from 'dotenv';

async function bootstrap() {
  // Load environment variables early
  dotenv.config();

  // Use NestExpressApplication to unlock static file serving
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Enable CORS for frontend integration (Vite/React/Next.js)
  app.enableCors();

  // 2. Serve the uploads folder publicly
  // This allows you to access files at http://localhost:3000/uploads/filename.jpg
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 3. Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Profeynex Communication Service')
    .setDescription('Real-time Messaging API with POSTGRESQL, Redis, and WebSocket support')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  prefix: '/uploads/',
});

  // 4. Start the Server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log('---');
  console.log(` Server is running on: http://localhost:${port}`);
  console.log(` Swagger Docs: http://localhost:${port}/api/docs`);
  console.log('---');
}

void bootstrap();