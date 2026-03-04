// apps\api\src\modules\users\users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserAddress } from './entities/user-address.entity';
import { Wishlist } from './entities/wishlist.entity';
import { Pack } from '../packs/entities/pack.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAddress, Wishlist, Pack]),
    StorageModule,
  ],
  controllers: [UsersController, WishlistController],
  providers: [UsersService, WishlistService],
  exports: [UsersService, WishlistService],
})
export class UsersModule {}