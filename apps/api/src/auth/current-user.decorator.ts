import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data, context: ExecutionContext) => {
    const ctx = context.switchToHttp();
    return ctx.getRequest().user;
  },
);
