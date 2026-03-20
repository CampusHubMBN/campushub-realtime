import { Test, TestingModule } from '@nestjs/testing';
import { PresenceResolver } from './presence.resolver';
import { PresenceService } from './presence.service';

describe('PresenceResolver', () => {
  let resolver: PresenceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PresenceResolver, PresenceService],
    }).compile();

    resolver = module.get<PresenceResolver>(PresenceResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
