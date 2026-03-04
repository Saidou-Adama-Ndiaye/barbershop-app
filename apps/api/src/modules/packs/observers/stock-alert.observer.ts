import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  UpdateEvent,
} from 'typeorm';
import { Product } from '../entities/product.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
@EventSubscriber()
export class StockAlertObserver implements EntitySubscriberInterface<Product> {
  private readonly logger = new Logger(StockAlertObserver.name);
  private readonly STOCK_THRESHOLD = 5;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    // Enregistrement manuel requis avec NestJS
    dataSource.subscribers.push(this);
  }

  // Écouter uniquement l'entité Product
  listenTo() {
    return Product;
  }

  // Déclenché APRÈS chaque UPDATE sur Product
  async afterUpdate(event: UpdateEvent<Product>): Promise<void> {
    const entity = event.entity as Product;

    if (!entity) return;

    // Vérifier si stockQty vient de passer sous le seuil
    const stockQty = entity.stockQty;
    if (stockQty === undefined || stockQty === null) return;

    if (stockQty < this.STOCK_THRESHOLD) {
      this.logger.warn(
        `⚠️ Stock bas : "${entity.name}" — ${stockQty} unités restantes`,
      );

      // Email admin
      const adminEmail = this.configService.get<string>(
        'ADMIN_EMAIL',
        'admin@barbershop.local',
      );

      // Fire-and-forget
      this.notificationsService
        .sendEmail({
          to: adminEmail,
          subject: `⚠️ Stock bas : ${entity.name} (${stockQty} unités)`,
          template: 'stock-alert',
          data: {
            productName: entity.name,
            stockQty,
            threshold: this.STOCK_THRESHOLD,
            sku: entity.sku ?? 'N/A',
            alertDate: new Date().toLocaleDateString('fr-SN'),
          },
        })
        .catch((err) =>
          this.logger.error(`Erreur envoi alerte stock : ${err.message}`),
        );
    }
  }
}