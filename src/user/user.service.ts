import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async updateUser(userId: number, dto: UpdateUserDto, token: string) {
    // generate the password
    const hash = dto.password ? await argon.hash(dto.password) : undefined;

    // update user
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { ...dto, password: hash },
        select: {
          email: true,
          userName: true,
          bio: true,
          image: true,
        },
      });
      // return updated user
      return { user: { ...user, token } };
    } catch (error) {
      // if user credentials are taken
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        } else {
          throw error;
        }
      }
    }
  }
}
