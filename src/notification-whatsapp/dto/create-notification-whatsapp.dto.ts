import { IsNotEmpty } from 'class-validator';

export class CreateNotificationWhatsappDto {
  @IsNotEmpty()
  client_id: string;

  @IsNotEmpty()
  contact_name: string;

  @IsNotEmpty()
  contact_number: string;

  planning_machine_end: boolean;

  is_other_10_minutes: boolean;

  is_group: boolean;
}
