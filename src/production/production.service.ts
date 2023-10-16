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

  private async resetHour(machineId, value) {
    let message = {
      Hour: [value]
    }
    const sendMessage = JSON.stringify(message)
    this.client.publish(`MC${machineId}:DR:RPA`,sendMessage,{ qos: 2, retain: true },
      (error) => {
        if (error) {
          console.error('Error publishing message:', error);
        }
      },
    );

  }

  private subscribeToTopic(machineId) {
    this.client.subscribe(`MC${machineId}:PLAN:RPA`, { qos: 2 }, (err) => {
      if (err) {
        console.log(`Error subscribe topic : MC${machineId}:PLAN:RPA`, err);
      }
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

  async callMessageMqtt(machineId) {
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

      this.subscribeToTopic(machineId);

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

    const getAllActivePlan = await this.getAllActivePlan()
    if (getAllActivePlan.length > 0) {
      getAllActivePlan.map(async(plan) => {
        
        const message: any = await this.callMessageMqtt(plan.machine.id);
    
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
          production.client_id = planActive.client_id;
          production.machine_id = planActive.machine.id;
          production.qty_hour = Number(message.qty_hour);
          production.qty_actual = Number(message.qty_actual) - totalQtyActualBefore;
          production.status = 9;
          production.line_stop_total = message.line_stop_total
            ? Number(message.line_stop_total)
            : null;
          await this.productionRepository.save(production);
    
          console.log('run function last 5 second in an hour');

          // reset hour mqtt
          this.resetHour(planActive.machine.id, true)
          setTimeout(() => {
            this.resetHour(planActive.machine.id, false)
          }, 2000)
        }
      })
    }
  }

   async saveWhileStopped(createProductionDto: string, clientId: string) {
    const planActive = await this.getActivePlanAPI(clientId);
    try {
      const message: any = await this.callMessageMqtt(planActive.machine.id);

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
              (item) =>
                moment(item.created_at, 'HH:mm:ss').format('ss') == '59',
            )
            .map((item) => {
              totalQtyActualBefore += +item.qty_actual;
            });
        }

        const production = new Production();
        production.planning_production_id = planActive.id;
        production.client_id = planActive.client_id;
        production.machine_id = planActive.machine.id;
        production.qty_hour = Number(message.qty_hour);
        production.qty_actual =
          Number(message.qty_actual) - totalQtyActualBefore;
        production.status = 9;
        production.line_stop_total = message.line_stop_total
          ? Number(message.line_stop_total)
          : null;

        await this.productionRepository.save(production);
        return 'Stopped Plan Saved';
      }
    } catch (error) {
      console.log(error);
    }
  }

  findAll() {
    return this.productionRepository.find();
  }

  async getLastProduction(id: number) {
    const lastData = this.productionRepository.findOne({
      where: { planning_production_id: +id },
      order: { id: 'DESC' },
    });

    return lastData;
  }

  async dataActive(clientId: string, planning_id: number) {
    // const production = await this.productionRepository.find({
    //   where: { client_id: clientId, planning_production_id: planning_id },
    // });

    // const productionMap = production.filter(item => (
    //   moment(item.created_at).format("ss") == '59'
    // )).map((item) => {
    //   return {
    //     ...item,
    //     time: moment(item.created_at).format('HH:mm:ss'),
    //     time_start: `${moment(item.created_at).format('HH')}:00`
    //   };
    // }).sort((a, b) => {
    //   return a.time.localeCompare(b.time);
    // });
    // return productionMap;

    const production = await this.productionRepository.find({
      where: { client_id: clientId, planning_production_id: planning_id },
    });
  
    const productionMap = production
      .filter(item => moment(item.created_at).format('ss') === '59')
      .reduce((accumulator: Record<string, any>, item) => { // Specify the type of the accumulator
        const hour = moment(item.created_at).format('HH');
        if (!accumulator[hour] || accumulator[hour].time !== '59:59') {
          accumulator[hour] = {
            ...item,
            time: moment(item.created_at).format('HH:mm:ss'),
            time_start: `${hour}:00`,
          };
        }
        return accumulator;
      }, {});
  
    // Convert the grouped object back to an array
    const resultArray = Object.values(productionMap);
  
    // Sort the result by time
    resultArray.sort((a, b) => a.time.localeCompare(b.time));
  
    return resultArray;
  }

  async getAllActivePlan() {
    try {
      return (
        await axios.get(`${process.env.SERVICE_PLAN}/planning-production/find-all-active`)
      ).data.data;
    } catch (error) {
      // throw new HttpException('No Active Plan', HttpStatus.NOT_FOUND);
      return [];
    }
  }
}
