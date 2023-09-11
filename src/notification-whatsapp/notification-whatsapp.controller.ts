import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotificationWhatsappService } from './notification-whatsapp.service';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';

@Controller('notification-whatsapp')
export class NotificationWhatsappController {
  constructor(private readonly notificationWhatsappService: NotificationWhatsappService) {}

  @Post()
  create(@Body() createNotificationWhatsappDto: CreateNotificationWhatsappDto) {
    return this.notificationWhatsappService.create(createNotificationWhatsappDto);
  }

  @Get()
  findAll() {
    return this.notificationWhatsappService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationWhatsappService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotificationWhatsappDto: UpdateNotificationWhatsappDto) {
    return this.notificationWhatsappService.update(+id, updateNotificationWhatsappDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationWhatsappService.remove(+id);
  }
}
