// .\.\apps\api\src\modules\packs\dto\update-pack.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePackDto } from './create-pack.dto';

export class UpdatePackDto extends PartialType(CreatePackDto) {}