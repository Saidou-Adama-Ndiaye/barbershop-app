import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';


import { UsersModule }         from './modules/users/users.module';
import { AuditModule }         from './modules/audit/audit.module';
import { AuthModule }          from './modules/auth/auth.module';
import { PacksModule }         from './modules/packs/packs.module';
import { OrdersModule }        from './modules/orders/orders.module';
import { ServicesModule }      from './modules/services/services.module';
import { BookingsModule }      from './modules/bookings/bookings.module';
import { PaymentsModule }      from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule }       from './modules/storage/storage.module';
import { FormationsModule }    from './modules/formations/formations.module';
import { AdminModule } from './modules/admin/admin.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.local' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:        'postgres',
        host:        config.get<string>('DB_HOST',     'localhost'),
        port:        config.get<number>('DB_PORT',     5432),
        username:    config.get<string>('DB_USERNAME'),
        password:    config.get<string>('DB_PASSWORD'),
        database:    config.get<string>('DB_NAME'),
        entities:    [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging:     config.get('NODE_ENV') === 'development',
        ssl:         false,
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'default', ttl: 60000, limit: 300 },
        { name: 'auth',    ttl: 900000, limit: 10  },
      ],
    }),

    ScheduleModule.forRoot(),
    StorageModule,
    UsersModule,
    AuditModule,
    AuthModule,
    PacksModule,
    OrdersModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    FormationsModule,
    AdminModule,
  ],

  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}