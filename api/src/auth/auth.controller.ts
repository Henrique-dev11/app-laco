import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  PipeTransform,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { Request, Response } from 'express';
import { AuthService, type Pdf } from './auth.service.js';
import { CadastroDto, LoginDto } from './cadastro.dto.js';
import { Public, type Autenticado } from './session.guard.js';

@Injectable()
class CadastroPipe implements PipeTransform {
  transform(body: unknown) {
    try {
      const dados =
        body && typeof body === 'object' && 'dados' in body
          ? (JSON.parse(String(body.dados)) as unknown)
          : body;
      if (!dados || typeof dados !== 'object' || Array.isArray(dados))
        throw new Error();
      const dto = plainToInstance(CadastroDto, dados);
      const errors = validateSync(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length)
        throw new BadRequestException(
          errors.flatMap((error) =>
            Object.values(
              error.constraints ?? { nested: `Verifique ${error.property}.` },
            ),
          ),
        );
      return dto;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Dados de cadastro inválidos.');
    }
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('cadastro')
  @UseInterceptors(
    FileInterceptor('curriculo', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
    }),
  )
  cadastro(@Body(new CadastroPipe()) dto: unknown, @UploadedFile() pdf?: Pdf) {
    return this.auth.cadastro(dto as CadastroDto, pdf);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me') me(@Req() req: Autenticado) {
    return this.auth.me(req.usuario.id);
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Autenticado) {
    await this.auth.logout(req.usuario.sessaoId);
  }

  @Get('curriculo')
  async curriculo(@Req() req: Request & Autenticado, @Res() res: Response) {
    if (!req.usuario.cuidadorId)
      throw new BadRequestException('Perfil cuidador necessário.');
    const arquivo = await this.auth.curriculo(req.usuario.cuidadorId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="curriculo.pdf"',
      'Cache-Control': 'no-store',
    });
    res.send(Buffer.from(arquivo.conteudo));
  }
}
