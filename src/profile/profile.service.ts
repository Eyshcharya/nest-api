import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // //* GET PROFILE
  async getProfile(userName: string) {
    try {
      // find user
      const profile = await this.prisma.user.findFirst({
        where: {
          userName: userName,
        },
        select: {
          userName: true,
          bio: true,
          image: true,
        },
      });

      if (!profile) {
        // return 404
        throw new NotFoundException('Resource Not Found');
      }

      // return profile
      return { profile: { ...profile, following: false } };
    } catch (error) {
      // return error
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new NotFoundException('Resource Not Found');
      } else {
        throw error;
      }
    }
  }

  // FOLLOW USER
  async checkUser(userId: number, targetedUserName: string) {
    // get targetProfile
    const targetedProfile = await this.prisma.user.findFirst({
      where: {
        userName: targetedUserName,
      },
      select: {
        id: true,
        userName: true,
        bio: true,
        image: true,
      },
    });

    if (!targetedProfile) {
      // return 404
      throw new NotFoundException('Resource Not Found');
    }

    // check if the current user follow the targeted user
    const isFollowing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        followingUsers: {
          has: targetedProfile.id,
        },
      },
    });

    if (isFollowing) {
      // return the profile
      delete targetedProfile.id;
      return { profile: { ...targetedProfile, following: true } };
    } else {
      // follow the targeted user
      try {
        const updatedProfile = await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            followingUsers: {
              push: targetedProfile.id,
            },
          },
        });
        // return the profile
        if (updatedProfile) {
          delete targetedProfile.id;
          return { profile: { ...targetedProfile, following: true } };
        } else {
          return new UnprocessableEntityException(
            `Failed to follow user: ${targetedUserName}`,
          );
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  }

  // UNFOLLOW USER
  async unfollowUser(userId: number, targetedUserName: string) {
    const targetedProfile = await this.prisma.user.findFirst({
      where: {
        userName: targetedUserName,
      },
      select: {
        id: true,
        userName: true,
        bio: true,
        image: true,
      },
    });

    if (!targetedProfile) {
      // return 404
      throw new NotFoundException('Resource Not Found');
    }

    // check if the current user follow the targeted user
    const isFollowing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        followingUsers: {
          has: targetedProfile.id,
        },
      },
      select: {
        followingUsers: true,
      },
    });

    if (isFollowing) {
      try {
        // unfollow the targeted user
        const updatedProfile = await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            followingUsers: {
              set: isFollowing.followingUsers.filter(
                (user) => user !== targetedProfile.id,
              ),
            },
          },
        });
        if (updatedProfile) {
          // return the profile
          delete targetedProfile.id;
          return { profile: { ...targetedProfile, following: false } };
        } else {
          return new UnprocessableEntityException(
            `Failed to unfollow user: ${targetedUserName}`,
          );
        }
      } catch (error) {
        throw new Error(error);
      }
    } else {
      // return the profile
      delete targetedProfile.id;
      return { profile: { ...targetedProfile, following: false } };
    }
  }
}
