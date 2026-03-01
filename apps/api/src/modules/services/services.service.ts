// .\.\apps\api\src\modules\services\services.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Service | null> {
    return this.serviceRepository.findOne({
      where: { id, isActive: true },
    });
  }
}