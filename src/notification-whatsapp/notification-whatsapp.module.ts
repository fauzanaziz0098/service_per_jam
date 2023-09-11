import { Module } from '@nestjs/common';
import { NotificationWhatsappService } from './notification-whatsapp.service';
import { NotificationWhatsappController } from './notification-whatsapp.controller';

@Module({
  controllers: [NotificationWhatsappController],
  providers: [NotificationWhatsappService]
})
export class NotificationWhatsappModule {}
