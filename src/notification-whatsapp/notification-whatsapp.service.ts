import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationWhatsapp } from './entities/notification-whatsapp.entity';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import axios from 'axios';
import { VariablePlanningProduction } from 'src/interface/variableProduction.interface';
import { VariableNotificationWhatsapp } from 'src/interface/variableNotificationWhatsapp';

@Injectable()
export class NotificationWhatsappService {
  private client: mqtt.MqttClient;
  constructor(
    @InjectRepository(NotificationWhatsapp)
    private readonly notificationWhatsappRepository: Repository<NotificationWhatsapp>,
  ) {
    this.initializeMqttClient();
  }

  private async initializeMqttClient() {
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

    const getPlanActiveAll = await this.getAllActivePlan()

    if (getPlanActiveAll.length != 0) {
      getPlanActiveAll.map(plan => {
        this.subscribeToTopic(plan.machine.id);
        
        this.client.on('message', (topic, message) => {
          if (topic.split(":")[0]?.replace("MC", "") == plan.machine.id) {
            this.sendNotification(JSON.parse(message.toString()), plan.client_id);
          }
        });
      })
    }


    this.client.on('error', (error) => {
      console.log('Connection failed:', error);
    });
  }

  private subscribeToTopic(machineId) {
    this.client.subscribe(`MC${machineId}:NLS:RPA`, { qos: 2 }, (err) => {
      if (err) {
        console.log(`Error subscribe topic : MC${machineId}:NLS:RPA`, err);
      }
    });
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

  async sendNotification(message: VariableNotificationWhatsapp, client_id) {
    const users = await this.notificationWhatsappRepository.find({
      where: { client_id: client_id },
    });

    users.map(async (user) => {
      const token = 'iP3ss9y7PvTQZg0YfJqhKYBdKEubqAwCDJuLzoK7AclvRNPtIEJRwHlIc0zLrLTk';
      const phone = user.contact_number;

      // const lineStop = axios.get(`${process.env.SERVICE_LOSS_TIME}/line-stop/${message.IsActive[0]}/${client_id}`)

      let messageWa = `VISUAL CONTROL SYSTEM RPA
      \n\n--INFORMASI LINE STOP--
      \n\nLINE STOP SAAT INI TELAH MENCAPAI *${message.TimeLS[0]} MENIT*
      \n\nTidak perlu membalas pesan ini, jika ada sesuatu yang terkait dengan sistem hubungi bagian terdekat di tempat anda.
      \n\nSalam Hormat,
      \n*PT MATRA HILLINDO TEKNOLOGI*`
      if (message.TimeLS[0] == 1 && user.is_line_stops_1) {
        await axios.get(`https://jogja.wablas.com/api/send-message?phone=${phone}&message=${encodeURIComponent(messageWa)}&token=${token}`);
      }
      if (message.TimeLS[0] == 10 && user.is_line_stops_10) {
        await axios.get(`https://jogja.wablas.com/api/send-message?phone=${phone}&message=${encodeURIComponent(messageWa)}&token=${token}`);
      }
      if (message.TimeLS[0] == 20 && user.is_line_stops_20) {
        await axios.get(`https://jogja.wablas.com/api/send-message?phone=${phone}&message=${encodeURIComponent(messageWa)}&token=${token}`);
      }
      if (message.TimeLS[0] == 30 && user.is_line_stops_30) {
        await axios.get(`https://jogja.wablas.com/api/send-message?phone=${phone}&message=${encodeURIComponent(messageWa)}&token=${token}`);
      }
    });
  }

  async create(
    createNotificationWhatsappDto: CreateNotificationWhatsappDto,
    client_id: string,
  ) {
    const existName = await this.notificationWhatsappRepository.findOne({
      where: {
        contact_name: createNotificationWhatsappDto.contact_name,
        client_id: client_id,
      },
    });

    if (!existName) {
      createNotificationWhatsappDto.contact_number =
        '+62' + createNotificationWhatsappDto.contact_number;

      return this.notificationWhatsappRepository.save(
        createNotificationWhatsappDto,
      );
    }
    throw new HttpException('Name already exist!', HttpStatus.BAD_REQUEST);
  }

  findAll(client_id: string) {
    return this.notificationWhatsappRepository.find({
      where: { client_id: client_id },
    });
  }

  async findOne(id: number) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });
    if (id) {
      return notificationWhatsapp;
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }

  async update(
    id: number,
    updateNotificationWhatsappDto: UpdateNotificationWhatsappDto,
  ) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });

      if (updateNotificationWhatsappDto.contact_number != "" && !updateNotificationWhatsappDto.contact_number.includes("+62")) {
        updateNotificationWhatsappDto.contact_number =
        '+62' + updateNotificationWhatsappDto.contact_number;
      }
    if (notificationWhatsapp) {
      await this.notificationWhatsappRepository.update(
        id,
        updateNotificationWhatsappDto,
      );
      return this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }

  async remove(id: number) {
    const notificationWhatsapp =
      await this.notificationWhatsappRepository.findOne({
        where: { id: id },
      });

    if (notificationWhatsapp) {
      await this.notificationWhatsappRepository.delete(id);
      return 'Notifcation whatsapp deleted';
    }
    throw new HttpException(
      'Notification whatsapp not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
