import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // generate jwt token
  async signToken(user: User) {
    const { id, email, userName, bio, image } = user;
    const payload = { sub: id, email };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '250m',
      secret: secret,
    });

    const jwt = `bearer ${token}`;
    return { user: { email, token: jwt, userName, bio, image } };
  }

  //* REGISTER
  async register(dto: RegisterDto) {
    // generate pw
    const hash = await argon.hash(dto.password);
    // save the new user in the db
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          userName: dto.userName,
          following: { create: {} },
        },
      });

      // return the saved user
      return this.signToken(user);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        } else {
          throw error;
        }
      }
    }
  }

  //* LOGIN
  async login(dto: LoginDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    // if user does not exist throw exception
    if (!user) {
      throw new ForbiddenException('Incorrect Credentials');
    }

    // compare passwords
    const pwMatches = await argon.verify(user.password, dto.password);

    // if password incorrect throw exception
    if (!pwMatches) {
      throw new ForbiddenException('Incorrect Credentials');
    }
    // send back the user
    return this.signToken(user);
  }
}
