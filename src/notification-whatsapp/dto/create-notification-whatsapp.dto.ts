import { IsNotEmpty } from 'class-validator';

export class CreateNotificationWhatsappDto {
  @IsNotEmpty()
  client_id: string;

  @IsNotEmpty()
  contact_name: string;

  @IsNotEmpty()
  contact_number: string;

  is_group: boolean;
}
