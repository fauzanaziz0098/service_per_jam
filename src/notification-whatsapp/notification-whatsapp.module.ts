import { Module } from '@nestjs/common';
import { NotificationWhatsappService } from './notification-whatsapp.service';
import { NotificationWhatsappController } from './notification-whatsapp.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationWhatsapp } from './entities/notification-whatsapp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationWhatsapp])],
  controllers: [NotificationWhatsappController],
  providers: [NotificationWhatsappService],
  exports: [NotificationWhatsappService],
})
export class NotificationWhatsappModule {}
