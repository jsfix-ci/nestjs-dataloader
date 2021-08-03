import * as DataLoader from 'dataloader';
import { Loader } from '../../../index';
import { Account } from './account.entity';
import { AccountLoader } from './account.loader';
import { Controller, Get } from '@nestjs/common';

@Controller('accounts')
export class AccountController{
  @Get()
  public getAccounts(
    @Loader(AccountLoader.name)
    accountLoader: DataLoader<Account["id"], Account>
  ): Promise<(Account | Error)[]> {
    return accountLoader.loadMany(['9']);
  }
}
