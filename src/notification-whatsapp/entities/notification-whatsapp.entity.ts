import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class NotificationWhatsapp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: string;

  @Column()
  contact_name: string;

  @Column()
  contact_number: string;

  @Column({ default: false })
  is_group: boolean;

  @Column({default: false})
  is_line_stops_1: boolean;

  @Column({default: false})
  is_line_stops_10: boolean;

  @Column({default: false})
  is_line_stops_20: boolean;

  @Column({default: false})
  is_line_stops_30: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
