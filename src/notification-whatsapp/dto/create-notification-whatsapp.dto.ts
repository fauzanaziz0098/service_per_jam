import { IsNotEmpty } from 'class-validator';

export class CreateNotificationWhatsappDto {
  // @IsNotEmpty()
  client_id: string;

  @IsNotEmpty()
  contact_name: string;

  @IsNotEmpty()
  contact_number: string;
  
  is_group: boolean;
  is_line_stops_1?: boolean;
  is_line_stops_10?: boolean;
  is_line_stops_20?: boolean;
  is_line_stops_30?: boolean;
}
