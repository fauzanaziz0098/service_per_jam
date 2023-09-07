import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Production } from './entities/production.entity';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as mqtt from 'mqtt';
import { VariablePlanningProduction } from 'src/interface/variableProduction.interface';
import * as moment from 'moment';

@Injectable()
export class ProductionService {
  private client: mqtt.MqttClient;
  // private messageSave: VariablePlanningProduction = null;
  constructor(
    @InjectRepository(Production)
    private readonly productionRepository: Repository<Production>,
  ) {
    // this.initializeMqttClient();
  }

  // MQTT

  // private initializeMqttClient() {
  //   const connectUrl = process.env.MQTT_CONNECTION;

  //   this.client = mqtt.connect(connectUrl, {
  //     clientId: `mqtt_nest_${Math.random().toString(16).slice(3)}`,
  //     clean: true,
  //     connectTimeout: 4000,
  //     username: '',
  //     password: '',
  //     reconnectPeriod: 1000,
  //   });

  //   this.client.on('connect', () => {
  //     console.log('MQTT client connected');
  //   });

  //   this.subscribeToTopic();

  //   this.client.on('message', (topic, message) => {
  //     if (message) {
  //       // this.messageSave = JSON.parse(message.toString());
  //       // this.publish();
  //       // this.publishMessage(topic, JSON.parse(message.toString()));
  //       // this.saveEveryFiveLastMinute(topic, JSON.parse(message.toString()));
  //     }
  //   });

  //   this.client.on('error', (error) => {
  //     console.log('Connection failed:', error);
  //   });
  // }

  private subscribeToTopic() {
    const machineId = [1];
    machineId.map((id) => {
      this.client.subscribe(`MC${id}:TEST:RPA`, { qos: 2 }, (err) => {
        if (err) {
          console.log(`Error subscribe topic : MC${id}:PLAN:RPA`, err);
        }
      });
    });
  }

  async getActivePlanAPI(client: string) {
    try {
      return (
        await axios.post(
          `${process.env.SERVICE_PLAN}/planning-production/active-plan-api`,
          { client: client },
        )
      ).data.data;
    } catch (error) {
      // throw new HttpException('No Active Plan', HttpStatus.NOT_FOUND);
      return null;
    }
  }

  async callMessageMqtt() {
    return new Promise((resolve, reject) => {
      const connectUrl = process.env.MQTT_CONNECTION;

      this.client = mqtt.connect(connectUrl, {
        clientId: `mqtt_nest_${Math.random().toString(16).slice(3)}`,
        clean: true,
        connectTimeout: 4000,
        username: '',
        password: '',
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        console.log('MQTT client connected');
      });

      this.subscribeToTopic();

      this.client.on('message', (topic, message) => {
        if (message) {
          const messageReceive = JSON.parse(message.toString());
          resolve(messageReceive);
        } else {
          reject(new Error('Empty message received'));
        }
      });
    });
  }

  // @Cron('55-59 * * * * *')
  @Cron('55-59 59 * * * *')
  async saveEveryFiveLastMinute() {
    const message: any = await this.callMessageMqtt();

    const planActive = await this.getActivePlanAPI(String(message.clientId));
    if (planActive) {
      const lastProduction = await this.productionRepository
        .createQueryBuilder('production')
        .where('planning_production_id =:planActiveId', {
          planActiveId: planActive.id,
        })
        .getMany();
      let totalQtyActualBefore = 0;
      if (lastProduction.length > 0) {
        lastProduction
          .filter(
            (item) => moment(item.created_at, 'HH:mm:ss').format('ss') == '59',
          )
          .map((item) => {
            totalQtyActualBefore += +item.qty_actual;
          });
      }

      const production = new Production();
      production.planning_production_id = planActive.id;
      production.machine_id = planActive.machine.id;
      production.qty_hour = Number(message.qty_hour);
      production.qty_actual = Number(message.qty_actual) - totalQtyActualBefore;
      production.status = 9;
      production.line_stop_total = message.line_stop_total
        ? Number(message.line_stop_total)
        : null;
      await this.productionRepository.save(production);

      console.log('run function last 5 second in an hour');
    }
  }

  findAll() {
    return this.productionRepository.find();
  }
}
