import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationWhatsappDto } from './create-notification-whatsapp.dto';

export class UpdateNotificationWhatsappDto extends PartialType(CreateNotificationWhatsappDto) {}
