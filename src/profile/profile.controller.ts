import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';

@Controller('profiles')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get(':username')
  getProfile(@Param('username') userName: string) {
    return this.profileService.getProfile(userName);
  }

  @UseGuards(JwtGuard)
  @Post(':username/follow')
  followUser(
    @GetUser('id') userId: number,
    @Param('username') targetedUserName: string,
  ) {
    return this.profileService.followUser(userId, targetedUserName);
  }

  @UseGuards(JwtGuard)
  @Delete(':username/follow')
  unfollowUser(
    @GetUser('id') userId: number,
    @Param('username') targetedUserName: string,
  ) {
    return this.profileService.unfollowUser(userId, targetedUserName);
  }
}
