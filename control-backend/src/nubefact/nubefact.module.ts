import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NubefactService } from '../nubefact/nubefact.service';

@Module({
    imports: [PrismaModule],
    providers: [NubefactService],
    exports: [NubefactService],
})
export class NubefactModule { }
