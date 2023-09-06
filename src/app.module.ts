import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ProductionModule } from './production/production.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ScheduleModule.forRoot(), ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        // url: configService.get('DATABASE_URL'),
        host: configService.get<string>('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..'),
    }),

    ConfigModule.forRoot({
      envFilePath: `${process.cwd()}/.env.${process.env.NODE_ENV}`,
    }),

    AuthModule,
    ProductionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
