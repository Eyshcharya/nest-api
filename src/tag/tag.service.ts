import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  async getTags() {
    const tags = await this.prisma.tag.findMany({
      select: { tag: true },
    });
    if (tags) {
      return { tags: tags };
    }
  }
}
