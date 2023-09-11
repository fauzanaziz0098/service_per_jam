import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateNotificationWhatsappDto } from './dto/create-notification-whatsapp.dto';
import { UpdateNotificationWhatsappDto } from './dto/update-notification-whatsapp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationWhatsapp } from './entities/notification-whatsapp.entity';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';
import axios from 'axios';

@Injectable()
export class NotificationWhatsappService {
  private client: mqtt.MqttClient;
  constructor(
    @InjectRepository(NotificationWhatsapp)
    private readonly notificationWhatsappRepository: Repository<NotificationWhatsapp>,
  ) {
    this.initializeMqttClient();
  }

  private initializeMqttClient() {
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
        this.sendNotification(JSON.parse(message.toString()));
      }
    });

    this.client.on('error', (error) => {
      console.log('Connection failed:', error);
    });
  }

  private subscribeToTopic() {
    const machineId = [1];
    machineId.map((id) => {
      this.client.subscribe(`MC${id}:PLAN:RPA`, { qos: 2 }, (err) => {
        if (err) {
          console.log(`Error subscribe topic : MC${id}:PLAN:RPA`, err);
        }
      });
    });
  }

  async sendNotification(message) {
    const users = await this.notificationWhatsappRepository.find({
      where: { client_id: String(message.clientId) },
    });

    users.map(async (user) => {
      const token =
        'iP3ss9y7PvTQZg0YfJqhKYBdKEubqAwCDJuLzoK7AclvRNPtIEJRwHlIc0zLrLTk';
      const phone = user.contact_number;
      const messageWa = `From: Matra Hillindo Teknologi \nTo: ${user.contact_name} \nMessage: Testing`;
      const { data } = await axios.get(
        `https://jogja.wablas.com/api/send-message?phone=${phone}&message=${encodeURIComponent(
          messageWa,
        )}&token=${token}`,
      );
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
      if (createNotificationWhatsappDto.is_group == false) {
        createNotificationWhatsappDto.contact_number =
          '+62' + createNotificationWhatsappDto.contact_number;
      }
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
