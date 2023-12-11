import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ArticleModule } from './article/article.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ArticleModule,
    PrismaModule,
    JwtModule,
    UserModule,
    ProfileModule,
  ],
})
export class AppModule {}
