import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';
import { UpdateUserDto } from './dto';

// Protected Route
@UseGuards(JwtGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  getUser(@GetUser() user: User, @GetUser('token') token: string) {
    const { email, userName, bio, image } = user;
    return { user: { email, token, userName, bio, image } };
  }

  @Put()
  updateUser(
    @GetUser('id') userId: number,
    @Body() dto: UpdateUserDto,
    @GetUser('token') token: string,
  ) {
    return this.userService.updateUser(userId, dto, token);
  }
}
