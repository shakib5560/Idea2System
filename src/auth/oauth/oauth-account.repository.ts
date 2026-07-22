import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenEncryptionService } from '../../common/crypto/token-encryption.service';
import { OAuthAccount } from '@prisma/client';

export interface CreateOAuthAccountData {
  userId: string;
  provider: 'google' | 'github';
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
}

export interface UpdateOAuthTokensData {
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  scope?: string | null;
}

@Injectable()
export class OAuthAccountRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: TokenEncryptionService,
  ) {}

  async findByProvider(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthAccount | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
    });

    if (!account) return null;

    return this.decryptTokens(account);
  }

  async findByUserId(userId: string): Promise<OAuthAccount[]> {
    const accounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
    });

    return accounts.map((acc) => this.decryptTokens(acc));
  }

  async findById(id: string): Promise<OAuthAccount | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: { id },
    });

    if (!account) return null;

    return this.decryptTokens(account);
  }

  async create(data: CreateOAuthAccountData): Promise<OAuthAccount> {
    const encryptedAccessToken = this.encryption.encrypt(data.accessToken);
    const encryptedRefreshToken = this.encryption.encrypt(data.refreshToken);

    const account = await this.prisma.oAuthAccount.create({
      data: {
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        scope: data.scope,
      },
    });

    return this.decryptTokens(account);
  }

  async updateTokens(
    id: string,
    data: UpdateOAuthTokensData,
  ): Promise<OAuthAccount> {
    const updateData: any = {
      accessTokenExpiresAt: data.accessTokenExpiresAt,
    };

    if (data.accessToken !== undefined) {
      updateData.accessToken = this.encryption.encrypt(data.accessToken);
    }

    if (data.refreshToken !== undefined) {
      updateData.refreshToken = this.encryption.encrypt(data.refreshToken);
    }

    if (data.scope !== undefined) {
      updateData.scope = data.scope;
    }

    const account = await this.prisma.oAuthAccount.update({
      where: { id },
      data: updateData,
    });

    return this.decryptTokens(account);
  }

  async clearTokens(id: string): Promise<OAuthAccount> {
    const account = await this.prisma.oAuthAccount.update({
      where: { id },
      data: {
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
      },
    });

    return this.decryptTokens(account);
  }

  private decryptTokens(account: OAuthAccount): OAuthAccount {
    return {
      ...account,
      accessToken: this.encryption.decrypt(account.accessToken),
      refreshToken: this.encryption.decrypt(account.refreshToken),
    };
  }
}
