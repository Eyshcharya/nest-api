import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  // GET PROFILE
  async getProfile(userName: string) {
    // check if the current user follow the targeted user
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
    if (profile) {
      return { profile: { ...profile, following: false } };
    }
    return { message: 'user does not exist' };
  }

  // FOLLOW USER
  async followUser(userId: number, targetedUserName: string) {
    // check if the current user follow the targeted user
    const isFollowing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        following: {
          has: targetedUserName,
        },
      },
    });

    const targetedProfile = await this.prisma.user.findFirst({
      where: {
        userName: targetedUserName,
      },
      select: {
        userName: true,
        bio: true,
        image: true,
      },
    });

    if (isFollowing) {
      // return the profile
      return { profile: { ...targetedProfile, following: true } };
    } else {
      // follow the targeted user
      try {
        const updatedProfile = await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            following: {
              push: targetedUserName,
            },
          },
        });
        // return the profile
        if (updatedProfile) {
          return { profile: { ...targetedProfile, following: true } };
        } else {
          return { message: 'Failed to follow the user' };
        }
      } catch (error) {
        throw new Error(error);
      }
    }
  }

  // UNFOLLOW USER
  async unfollowUser(userId: number, targetedUserName: string) {
    // check if the current user follow the targeted user
    const isFollowing = await this.prisma.user.findFirst({
      where: {
        id: userId,
        following: {
          has: targetedUserName,
        },
      },
      select: {
        following: true,
      },
    });

    const targetedProfile = await this.prisma.user.findFirst({
      where: {
        userName: targetedUserName,
      },
      select: {
        userName: true,
        bio: true,
        image: true,
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
            following: {
              set: isFollowing.following.filter(
                (user) => user !== targetedUserName,
              ),
            },
          },
        });
        if (updatedProfile) {
          // return the profile
          return { profile: { ...targetedProfile, following: false } };
        } else {
          return { message: 'Failed to unfollow the user' };
        }
      } catch (error) {
        throw new Error(error);
      }
    } else {
      // return the profile
      return { profile: { ...targetedProfile, following: false } };
    }
  }
}
