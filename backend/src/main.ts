
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global exception filter for consistent error payloads
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe with structured error factory
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
      exceptionFactory: (validationErrors = []) => {
        const errors: Record<string, string> = {};
        for (const error of validationErrors) {
          if (error.constraints) {
            // Pick first constraint error message
            errors[error.property] = Object.values(error.constraints)[0];
          }
        }
        return new BadRequestException({
          success: false,
          message: 'Validation failed.',
          errors,
        });
      },
    }),
  );

  // Swagger OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Pharmatrack API')
    .setDescription(
      'REST API documentation for Pharmatrack patient & pharmacy registration, authentication, and services.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Pharmatrack backend running on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

await bootstrap();
