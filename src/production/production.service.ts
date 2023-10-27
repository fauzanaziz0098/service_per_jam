import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Production } from './entities/production.entity';
import { Between, Repository } from 'typeorm';
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

  private hour = 7;
  async dataActiveNew(clientId: string) {
    const planningMachine = await this.getActivePlanAPI(clientId)
    
    if (!planningMachine) {
      throw new HttpException("No Plan Active Now", HttpStatus.BAD_REQUEST);
    }
    // Estimation as datetimeout
    const estimation = (planningMachine?.qty_planning * planningMachine?.product?.cycle_time) / 60
    const dateTimeOut = moment(planningMachine.date_time_in).add(estimation, "minute").endOf('hour')

    const all = await (await Promise.all(this.range(0, 23)?.map(async (value) => {
      const dateTimeIn = moment(planningMachine.date_time_in).startOf("hour");
      if (moment(moment(planningMachine.date_time_in).hour(this.hour).add(value, 'hour'), 'YYYY-MM-DD HH:mm:ss').isBetween(moment(dateTimeIn, 'YYYY-MM-DD HH:mm:ss'), moment(dateTimeOut, 'YYYY-MM-DD HH:mm:ss'))) {
        const Hms = moment(moment(planningMachine.date_time_in).hour(this.hour).minute(0).second(0).add(value, 'hour'), 'HH:mm:ss');
        let totalHour = 0;
        const startTime = Hms.clone().startOf('hour');
        const endTime = Hms.clone().endOf('hour');

        if (moment(startTime).isSameOrBefore(moment(planningMachine.date_time_in))) {
          totalHour = moment(endTime).add(1, 'second').diff(moment(planningMachine.date_time_in), 'minute');
        } else {
          if (moment(endTime).isSameOrAfter(moment(planningMachine.date_time_out))) {
            totalHour = moment(planningMachine.date_time_out).diff(moment(startTime), 'minute');
          } else {
            totalHour = moment(endTime).add(1, 'second').diff(moment(startTime), 'minute');
          }
        }

        if (totalHour == 59) {
          totalHour = 60;
        }

        const totalNoPlanMachine = planningMachine.shift.no_plan_machine_id.filter(item => (item?.day?.toLowerCase() == moment().format('dddd')?.toLowerCase())).map(noPlanMachine => {
          const timeStart = Hms.clone().startOf('hour').format('HH:mm:ss');
          const timeEnd = Hms.clone().endOf('hour').format('HH:mm:ss');
          
          if (noPlanMachine.day == moment().format('dddd').toLowerCase()) {
            if (moment(noPlanMachine.time_in, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss')) && moment(noPlanMachine.time_out, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss'))) {
              // if (moment(dateTimeOut, 'HH').format('HH') == moment(Hms, 'HH').format('HH')) {
              //   return 0;
              // }
              // if (moment(planningMachine.date_time_in).format('HH') == moment(Hms, 'HH').format('HH')) {
              //   return 0;
              // }
              return (moment(noPlanMachine.time_out, 'HH:mm:ss').diff(moment(noPlanMachine.time_in, 'HH:mm:ss'), 'minute'));
            } else {
              if (moment(noPlanMachine.time_in, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss'))) {
                return (moment(timeEnd, 'HH:mm:ss').add(1, 'second')).diff(moment(noPlanMachine.time_in, 'HH:mm:ss'),'minute');
              }
              if (moment(noPlanMachine.time_out, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss'))) {
                return (moment(noPlanMachine.time_out).diff(moment(timeStart, 'HH:mm:ss')));
              }
                return 0;
            }
          }
        }).reduce((total, value) => total + value, 0);

        // console.log(totalNoPlanMachine);
        

        let production = await this.productionRepository.findOne({
          where: {
            planning_production_id: planningMachine.id,
            updated_at: Between(moment(planningMachine.date_time_in).set('hour', this.hour).add(value, 'hour').startOf('hour').toDate(), moment(planningMachine.date_time_in).set('hour', this.hour).add(value, 'hour').endOf('hour').toDate()),
          },
          order: {
            updated_at: 'DESC',
          },
        });

        if (!production) {
          production = await this.productionRepository.findOne({
            where: {
              planning_production_id: planningMachine.id, // Assuming you have a relation to the PlanningMachine
              created_at: Between(
                moment(planningMachine.date_time_in)
                  .hour(this.hour)
                  .add(value, 'hour')
                  .startOf('hour')
                  .toDate(),
                moment(planningMachine.date_time_in)
                  .hour(this.hour)
                  .add(value, 'hour')
                  .endOf('hour')
                  .toDate()
              ),
            },
            order: {
              created_at: 'DESC',
            },
          });
        }

        
        let time = moment(planningMachine.date_time_in)?.hour(this.hour)?.minute(0)?.add(value, 'hour').format('HH:mm');
        let duration = 60 - (moment(time, 'HH').format('HH') == moment(planningMachine.date_time_in).format('HH') ? moment(planningMachine.date_time_in).get('minute') : 0) - totalNoPlanMachine
        
        let target = Math.round((totalHour - totalNoPlanMachine) * planningMachine.qty_per_minute);
        let actual = production ? production.qty_actual : 0;
        if (actual == 0) {
          actual = 0.000001;
        }
        if (target == 0) {
          target = 0.000001;
        }
        let percentage = Math.round(actual / target * 100);
        let timeStart = moment(moment(planningMachine.date_time_in).format("HH")).isSame(moment(time, 'HH'));
        if (actual == 0.000001) {
          actual = 0;
        }
        if (target == 0.000001) {
          target = 0;
        }
        if (target < 0) {
          target = 0;
        }
        return { time, duration, target, actual, percentage, time_start: timeStart, shift: planningMachine.shift.name };
      }
    })))?.map((value, key) => {
      if (value != null) {
        return value
      } else {
        let time = moment().hour(7)?.minute(0).add(key, 'hour').format('HH:mm')
        let duration = 0
        let target = 0
        let actual = 0
        let percentage = 0
        let time_start = false
        if (target < 0) {
          target = 0
        }
        return {time, duration, target, actual, percentage,time_start, shift: planningMachine.shift.name}
      }
    })
        
    const active =  await Promise.all(this.range(0, moment(dateTimeOut).endOf('hour').diff(moment(planningMachine.date_time_in).startOf('hour'), 'hour'))?.map(async value => {
      const Hms = moment(planningMachine.date_time_in).minute(0).second(0).add(value, 'hour')
      let totalHour = 0
      const startTime = Hms.clone().startOf('hour').format('HH:mm:ss')
      const endTime = Hms.clone().endOf('hour').format('HH:mm:ss')

      if (moment(startTime, 'HH:mm:ss').isSameOrBefore(moment(planningMachine.date_time_in))) {
        totalHour = moment(endTime, 'HH:mm:ss').add(1, 'second').diff(moment(planningMachine.date_time_in), 'minute')
      } else {
        if (moment(endTime, 'HH:mm:ss').isSameOrAfter(moment(dateTimeOut))) {
          totalHour = moment(dateTimeOut, 'HH:mm:ss').diff(moment(startTime, 'HH:mm:ss'), 'minute')
        } else {
          totalHour = moment(endTime, 'HH:mm:ss').add(1, 'second').diff(moment(startTime, 'HH:mm:ss'), 'minute')
        }
      }

      if (totalHour == 59) {
        totalHour = 60
      }

      const totalNoPlan = planningMachine.shift.no_plan_machine_id?.map(noPlanMachine => {
        const timeStart = Hms.clone().startOf('hour').format('HH:mm:ss')
        const timeEnd = Hms.clone().endOf('hour').format('HH:mm:ss')
        if (moment(noPlanMachine.time_in, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss'))) {
          if (dateTimeOut.format("HH") == Hms.format('HH')) {
            return 0
          }
          if (moment(planningMachine.date_time_in).format('HH') == Hms.format('HH')) {
            return 0
          }
          return moment(noPlanMachine.time_out, 'HH:mm:ss').diff(moment(noPlanMachine.time_in, 'HH:mm:ss'), 'minute')
        } else {
          if (moment(noPlanMachine.time_in, 'HH:mm:ss').isBetween(moment(timeStart, 'HH:mm:ss'), moment(timeEnd, 'HH:mm:ss'))) {
            return moment(timeEnd, 'HH:mm:ss').add(1, 'second').diff(moment(noPlanMachine.time_in, 'HH:mm:ss'), 'minute')
          }
          return 0
        }
      })?.reduce((total, value) => total + value, 0)
      
      let production = await this.productionRepository.findOne({
        where: {
          planning_production_id: planningMachine.id,
          updated_at: Between(moment(planningMachine.date_time_in).add(value, 'hour').startOf('hour').toDate(),moment(planningMachine.date_time_in).add(value, 'hour').endOf('hour').toDate()),
        },
        order: {
          updated_at: 'DESC',
        },
      })
      if (!production) {
        production =  await this.productionRepository.findOne({
          where: {
            planning_production_id: planningMachine.id,
            created_at: Between(moment(planningMachine.date_time_in).add(value, 'hour').startOf('hour').toDate(), moment(planningMachine.date_time_in).add(value, 'hour').endOf('hour').toDate()),
          },
          order: {
            created_at: 'DESC',
          },
        })
      }

      const time = moment(planningMachine.date_time_in).minute(0).add(value, 'hour').format('HH:mm')
      let target = Math.round((totalHour - totalNoPlan) * planningMachine.qty_per_minute)
      let actual = production ? production.qty_actual : 0
      if (actual == 0) {
        actual = 0.000001;
      }
      if (target == 0) {
          target = 0.000001;
      }
      const percentage = Math.round(actual / target * 100)
      let timeStart = moment(moment(planningMachine.date_time_in).format("HH")).isSame(moment(time, 'HH'))
      
      if (actual == 0.000001) {
        actual = 0;
      }
      if (target == 0.000001) {
          target = 0;
      }
      if (target < 0) {
          target = 0;
      }
      return {time, target, actual, percentage, timeStart, shift: planningMachine.shift.name}
    }))
    
    // console.log({all, active, planningMachineActive: planningMachine});
    
    return {all, active, planningMachineActive: planningMachine}
    
  }

  range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
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

  async getAllPlanByClient(client: string) {
    try {
      return (
        await axios.get(
          `${process.env.SERVICE_PLAN}/planning-production/all-plan-client/${client}`
        )
      ).data.data;
    } catch (error) {
      // throw new HttpException('No Active Plan', HttpStatus.NOT_FOUND);
      return null;
    }
  }
}
