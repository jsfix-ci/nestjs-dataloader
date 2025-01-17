import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { NestDataLoader } from '../../..';
import { AccountService } from './account.service';
import { Account } from './account.entity';

@Injectable()
export class AccountLoader implements NestDataLoader<Account['id'], Account> {
  constructor(private readonly accountService: AccountService) {}

  generateDataLoader(): DataLoader<Account['id'], Account> {
    return new DataLoader<string, Account>(keys =>
      this.accountService.findByIds(keys)
    );
  }
}
