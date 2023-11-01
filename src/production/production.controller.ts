import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  findAll() {
    return this.productionService.findAll();
  }

  @Post('stopped')
  async saveWhileStopped(@Body('planning_production_id') planningId, @Body('clientId') clientId, @Body('machine') machine) {
    console.log(planningId, clientId, machine, 'plan stop saved');
    return this.productionService.saveWhileStopped(planningId, clientId, machine);
  }

  @Get('last-production/:id')
  async getLastProduction(@Param('id') id: number) {
    return this.productionService.getLastProduction(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('data-active/:id')
  dataActive(@Req() req: Request, @Param('id') id: number) {
    return this.productionService.dataActive(req?.user['client'], +id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('data-active-new/:machineId')
  dataActiveNew(@Req() req: Request, @Param('machineId') machineId) {
    return this.productionService.dataActiveNew(req?.user['client'], machineId);
  }
}
