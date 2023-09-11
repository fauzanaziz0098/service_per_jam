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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
