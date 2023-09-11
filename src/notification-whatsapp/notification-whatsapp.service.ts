import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationWhatsapp } from './entities/notification-whatsapp.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationWhatsappService {
  constructor(
    @InjectRepository(NotificationWhatsapp)
    private readonly notificationWhatsappRepository: Repository<NotificationWhatsapp>,
  ) {}

  async create(
    createNotificationWhatsappDto: CreateNotificationWhatsappDto,
    client_id: string,
  ) {
    const existName = await this.notificationWhatsappRepository.findOne({
      where: {
        contact_name: createNotificationWhatsappDto.contact_name,
        client_id: client_id,
      },
    });

    if (!existName) {
      if (createNotificationWhatsappDto.is_group == false) {
        createNotificationWhatsappDto.contact_number =
          '+62' + createNotificationWhatsappDto.contact_number;
      }
      return this.notificationWhatsappRepository.save(
        createNotificationWhatsappDto,
      );
    }
    throw new HttpException('Name already exist!', HttpStatus.BAD_REQUEST);
  }

  findAll(client_id: string) {
    return this.notificationWhatsappRepository.find({
      where: { client_id: client_id },
    });
  }

  async findOne(id: number) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });
    if (id) {
      return notificationWhatsapp;
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }

  async update(
    id: number,
    updateNotificationWhatsappDto: UpdateNotificationWhatsappDto,
  ) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });

    if (notificationWhatsapp) {
      await this.notificationWhatsappRepository.update(
        id,
        updateNotificationWhatsappDto,
      );
      return this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }

  async remove(id: number) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });

    if (notificationWhatsapp) {
      await this.notificationWhatsappRepository.delete(id);
      return 'Notifcation whatsapp deleted';
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
