import {
  CallHandler,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR, ModuleRef, ContextIdFactory } from '@nestjs/core';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Observable } from 'rxjs';

/**
 * This interface will be used to generate the initial data loader.                
 * The concrete implementation should be added as a provider to your module.
 */
export interface NestDataLoader<ID, Type> {
  /**
   * Should return a new instance of dataloader each time
   */
  generateDataLoader(): DataLoader<ID, Type>;
}

/**
 * Context key where get loader function will be stored.
 * This class should be added to your module providers like so:
 * {
 *     provide: APP_INTERCEPTOR,
 *     useClass: DataLoaderInterceptor,
 * },
 */
const NEST_LOADER_CONTEXT_KEY: string = "NEST_LOADER_CONTEXT_KEY";

@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
  constructor(private readonly moduleRef: ModuleRef) { }
  /**
   * @inheritdoc
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    let ctx = getContext(context);

    if (ctx && ctx[NEST_LOADER_CONTEXT_KEY] === undefined) {
      ctx[NEST_LOADER_CONTEXT_KEY] = {
        contextId: ContextIdFactory.create(),
        getLoader: (type: string) : Promise<NestDataLoader<any, any>> => {
          if (ctx[type] === undefined) {
            try {           
              ctx[type] = (async () => { 
                return (await this.moduleRef.resolve<NestDataLoader<any, any>>(type, ctx[NEST_LOADER_CONTEXT_KEY].contextId, { strict: false }))
                  .generateDataLoader();
              })();
            } catch (e) {
              throw new InternalServerErrorException(`The loader ${type} is not provided` + e);
            }
          }
          return ctx[type];
        }
      };
    }
    return next.handle();
  }
}

function getContext(context: ExecutionContext & { [p: string]: any }) {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest();
  } else {
    return GqlExecutionContext.create(context).getContext();
  }
}

/**
 * The decorator to be used within your graphql method.
 */
export const Loader = createParamDecorator(async (data: any, context: ExecutionContext & { [key: string]: any }) => {
  let ctx = getContext(context);

  if (ctx[NEST_LOADER_CONTEXT_KEY] === undefined) {
    throw new InternalServerErrorException(`
            You should provide interceptor ${DataLoaderInterceptor.name} globally with ${APP_INTERCEPTOR}
          `);
  }
  return await ctx[NEST_LOADER_CONTEXT_KEY].getLoader(data);
});
