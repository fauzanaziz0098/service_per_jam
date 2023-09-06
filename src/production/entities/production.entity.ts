import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Production {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  planning_production_id: number;

  @Column({ nullable: true })
  machine_id: number;

  @Column({ nullable: true })
  qty_actual: number;

  @Column({ nullable: true })
  qty_hour: number;

  @Column({ nullable: true })
  status: number;

  @Column({ nullable: true })
  line_stop_total: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
