export class CreateProductionDto {
  planning_production_id: number;

  machine_id: number;

  qty_actual: number;

  qty_hour: number;

  status: number;

  line_stop_total: number;
}
