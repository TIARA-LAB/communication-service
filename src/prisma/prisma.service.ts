import dotenv from 'dotenv';
dotenv.config();
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('❌ DATABASE_URL is missing in .env');
    }

    // Instead of createPool, we pass the connection string directly 
    // to the adapter configuration object.
    const adapter = new PrismaMariaDb({ 
      url: connectionString 
    } as any); 

    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('🚀 Database Connected (Single Connection)');
    } catch (error) {
      this.logger.error('❌ Connection Failed. Is your Docker DB running?');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}