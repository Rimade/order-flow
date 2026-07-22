import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload';

type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
};

@Injectable()
export class AuthService {
  private readonly bcryptRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    return this.issueTokens(storedToken.user.id, storedToken.user.email);
  }

  async logout(dto: RefreshTokenDto): Promise<{ ok: true }> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });

    return { ok: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokensResponse> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.createRefreshToken(userId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
      },
    };
  }

  private async createRefreshToken(userId: string) {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawToken);
    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiry() {
    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    const days = Number.parseInt(expiresIn.replace('d', ''), 10);

    if (Number.isNaN(days)) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must use format like 7d');
    }

    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
