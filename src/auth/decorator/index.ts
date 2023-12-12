import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Get the Authorization header from the request
    const authHeader = request.headers.authorization;
    // Get the User
    const user = request.user;
    if (data && data === 'token') {
      return authHeader;
    }
    if (data) {
      return request.user[data];
    }
    return user;
  },
);
