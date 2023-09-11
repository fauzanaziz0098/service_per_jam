import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  findAll() {
    return this.productionService.findAll();
  }

  @Post('stopped')
  async saveWhileStopped(@Body() createProductionDto: CreateProductionDto) {
    console.log(createProductionDto, 'plan stop saved');
    return this.productionService.saveWhileStopped(createProductionDto);
  }

  @Get('last-production')
  async getLastProduction() {
    return this.productionService.getLastProduction();
  }
}
