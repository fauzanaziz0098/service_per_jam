import { Injectable } from '@nestjs/common';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';

@Injectable()
export class NotificationWhatsappService {
  create(createNotificationWhatsappDto: CreateNotificationWhatsappDto) {
    return 'This action adds a new notificationWhatsapp';
  }

  findAll() {
    return `This action returns all notificationWhatsapp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} notificationWhatsapp`;
  }

  update(id: number, updateNotificationWhatsappDto: UpdateNotificationWhatsappDto) {
    return `This action updates a #${id} notificationWhatsapp`;
  }

  remove(id: number) {
    return `This action removes a #${id} notificationWhatsapp`;
  }
}
