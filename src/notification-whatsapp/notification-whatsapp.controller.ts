import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationWhatsappService } from './notification-whatsapp.service';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('notification-whatsapp')
export class NotificationWhatsappController {
  constructor(
    private readonly notificationWhatsappService: NotificationWhatsappService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createNotificationWhatsappDto: CreateNotificationWhatsappDto,
    @Req() req: Request,
  ) {
    createNotificationWhatsappDto.client_id = req.user['client']
    return this.notificationWhatsappService.create(
      createNotificationWhatsappDto,
      req.user['client'],
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req: Request) {
    return this.notificationWhatsappService.findAll(req.user['client']);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationWhatsappService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNotificationWhatsappDto: UpdateNotificationWhatsappDto,
  ) {
    return this.notificationWhatsappService.update(
      +id,
      updateNotificationWhatsappDto,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationWhatsappService.remove(+id);
  }
}
