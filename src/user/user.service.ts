import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto';
import * as argon from 'argon2';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateUser(userId: number, dto: UpdateUserDto) {
    // generate the password
    const hash = dto.password ? await argon.hash(dto.password) : undefined;

    delete dto.password;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto, password: hash },
      select: { email: true, userName: true, bio: true, image: true },
    });
    return { user: user };
  }
}
