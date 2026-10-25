import { dadosImagemPerfil } from '../common/imagens.js';
import { incluirFotoIdoso, apresentarIdoso } from '../idoso/idoso-foto.js';
import { cpfValido } from '../common/pessoas.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Prisma, Parentesco } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CadastroDto, LoginDto } from './cadastro.dto.js';

export type Identidade = {
  id: number;
  tipoUsuario: string;
  responsavelId: number | null;
  cuidadorId: number | null;
  sessaoId: string;
};
export type Imagem = { mimetype: string; buffer: Buffer };
export type Pdf = { originalname: string; mimetype: string; buffer: Buffer };
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const usuarioSeguro = {
  id: true,
  nome: true,
  nomeSocial: true,
  email: true,
  telefone2: true,
  tipoUsuario: true,
  status: true,
  termosAceitosEm: true,
} as const;

export { cpfValido } from '../common/pessoas.js';

@Injectable()
export class AuthService {
  private readonly senhaDummy = bcrypt.hash('credencial-invalida', 12);
  constructor(private readonly prisma: PrismaService) {}

  async cadastro(dto: CadastroDto, pdf?: Pdf) {
    if (Buffer.byteLength(dto.senha, 'utf8') > 72)
      throw new BadRequestException('Senha deve ter no máximo 72 bytes.');
    for (const pessoa of [dto, ...(dto.idoso ? [dto.idoso] : [])]) {
      if (!cpfValido(pessoa.cpf))
        throw new BadRequestException('CPF inválido.');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(pessoa.dataNascimento) ||
        new Date(pessoa.dataNascimento) > new Date() ||
        new Date(pessoa.dataNascimento).getUTCFullYear() < 1900
      )
        throw new BadRequestException('Data de nascimento inválida.');
      if (!pessoa.nome.trim())
        throw new BadRequestException('Nome obrigatório.');
    }
    for (const endereco of [
      dto.endereco,
      ...(dto.idoso ? [dto.idoso.endereco] : []),
    ]) {
      if (
        !endereco ||
        ![
          endereco.rua,
          endereco.numero,
          endereco.bairro,
          endereco.cidade,
        ].every((value) => typeof value === 'string' && value.trim())
      )
        throw new BadRequestException('Endereço completo obrigatório.');
    }
    if (dto.perfil === 'responsavel' && !dto.idoso)
      throw new BadRequestException('Informe o idoso e o parentesco.');
    if (dto.perfil !== 'responsavel' && dto.idoso)
      throw new BadRequestException(
        'Dados de idoso incompatíveis com o perfil.',
      );
    const personalizados = dto.servicosPersonalizados ?? [];
    if (dto.servicoIds.length + personalizados.length > 50)
      throw new BadRequestException('Selecione até 50 serviços.');
    if (!dto.servicoIds.length && !personalizados.length)
      throw new BadRequestException(
        'Selecione ou adicione pelo menos um serviço.',
      );
    if (
      new Set(
        personalizados.map((s) => s.nome.trim().toLocaleLowerCase('pt-BR')),
      ).size !== personalizados.length
    )
      throw new BadRequestException('Não repita serviços personalizados.');
    if (dto.perfil === 'cuidador') {
      if (
        !pdf ||
        pdf.buffer.length > 5 * 1024 * 1024 ||
        pdf.buffer.subarray(0, 5).toString() !== '%PDF-'
      )
        throw new BadRequestException('Envie um currículo PDF de até 5 MB.');
      const ids = dto.ofertas?.map((oferta) => oferta.servicoId) ?? [];
      if (
        ids.length !== dto.servicoIds.length ||
        new Set(ids).size !== ids.length ||
        !dto.servicoIds.every((id) => ids.includes(id))
      )
        throw new BadRequestException(
          'Informe preço e duração de todos os serviços.',
        );
    } else if (pdf || dto.ofertas?.length || personalizados.length)
      throw new BadRequestException(
        'Ofertas e currículo são exclusivos de cuidadores.',
      );
    const senhaHash = await bcrypt.hash(dto.senha, 12);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const servicos = await tx.servico.count({
          where: { id: { in: dto.servicoIds }, ativo: true, catalogo: true },
        });
        if (servicos !== dto.servicoIds.length)
          throw new BadRequestException(
            'Selecione serviços ativos do catálogo.',
          );
        const duplicado =
          personalizados.length &&
          (await tx.servico.findFirst({
            where: {
              catalogo: true,
              OR: personalizados.map((s) => ({
                nome: { equals: s.nome.trim(), mode: 'insensitive' as const },
              })),
            },
          }));
        if (duplicado)
          throw new BadRequestException(
            'Selecione o serviço existente no catálogo em vez de duplicá-lo.',
          );
        const usuario = await tx.usuario.create({
          data: {
            nome: dto.nome.trim(),
            nomeSocial: dto.nomeSocial?.trim() || null,
            email: dto.email,
            senhaHash,
            tipoUsuario: dto.perfil === 'cuidador' ? 'CUIDADOR' : 'RESPONSAVEL',
            telefone2: dto.telefone2 || null,
            termosAceitosEm: new Date(),
            preferencias: {
              create: dto.servicoIds.map((servicoId) => ({ servicoId })),
            },
          },
          select: usuarioSeguro,
        });
        const endereco = await tx.endereco.create({
          data: { ...dto.endereco, estado: dto.endereco.estado.toUpperCase() },
        });
        const perfil = {
          usuarioId: usuario.id,
          enderecoId: endereco.id,
          telefone: dto.telefone,
          cpf: dto.cpf,
          dataNascimento: new Date(dto.dataNascimento),
        };
        if (dto.perfil === 'cuidador') {
          await tx.cuidador.create({
            data: {
              ...perfil,
              cuidadorServicos: {
                create: [
                  ...(dto.ofertas ?? []).map(({ servicoId, ...oferta }) => ({
                    ...oferta,
                    servico: { connect: { id: servicoId } },
                  })),
                  ...personalizados.map((item) => ({
                    preco: item.preco,
                    duracaoMinutos: item.duracaoMinutos,
                    servico: {
                      create: {
                        nome: item.nome.trim(),
                        descricao: item.descricao?.trim(),
                        catalogo: false,
                      },
                    },
                  })),
                ],
              },
              curriculo: {
                create: {
                  nome: pdf!.originalname.slice(0, 255),
                  conteudo: new Uint8Array(pdf!.buffer),
                },
              },
            },
          });
        } else {
          const responsavel = await tx.responsavel.create({ data: perfil });
          const pessoa = dto.perfil === 'idoso' ? dto : dto.idoso!;
          const enderecoId =
            dto.perfil === 'idoso'
              ? endereco.id
              : (
                  await tx.endereco.create({
                    data: {
                      ...dto.idoso!.endereco,
                      estado: dto.idoso!.endereco.estado.toUpperCase(),
                    },
                  })
                ).id;
          const idoso = await tx.idoso.create({
            data: {
              nome: pessoa.nome.trim(),
              nomeSocial: pessoa.nomeSocial?.trim() || null,
              cpf: pessoa.cpf,
              ...(dto.perfil === 'idoso' && { telefone: dto.telefone }),
              dataNascimento: new Date(pessoa.dataNascimento),
              enderecoId,
            },
          });
          await tx.responsavelIdoso.create({
            data: {
              responsavelId: responsavel.id,
              idosoId: idoso.id,
              parentesco:
                dto.perfil === 'idoso'
                  ? Parentesco.PROPRIO
                  : dto.idoso!.parentesco,
              responsavelPrincipal: true,
            },
          });
        }
        return {
          usuario,
          message: 'Cadastro salvo. Entre com seu e-mail e senha.',
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('E-mail, CPF ou vínculo já cadastrado.');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    const valida = await bcrypt.compare(
      dto.senha,
      usuario?.senhaHash ?? (await this.senhaDummy),
    );
    if (!usuario || !valida || usuario.status !== 'ATIVO')
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    const token = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.sessao.create({
      data: { usuarioId: usuario.id, tokenHash: hashToken(token), expiraEm },
    });
    return { token, expiraEm, usuario: await this.me(usuario.id) };
  }

  async autenticar(token: string): Promise<Identidade> {
    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: { include: { responsavel: true, cuidador: true } } },
    });
    if (
      !sessao ||
      sessao.expiraEm <= new Date() ||
      sessao.usuario.status !== 'ATIVO'
    )
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    return {
      id: sessao.usuarioId,
      tipoUsuario: sessao.usuario.tipoUsuario,
      responsavelId: sessao.usuario.responsavel?.id ?? null,
      cuidadorId: sessao.usuario.cuidador?.id ?? null,
      sessaoId: sessao.id,
    };
  }

  async me(id: number) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: {
        ...usuarioSeguro,
        responsavel: {
          include: {
            endereco: true,
            responsavelIdosos: {
              include: { idoso: { include: incluirFotoIdoso } },
            },
          },
        },
        cuidador: {
          include: {
            endereco: true,
            cuidadorServicos: { include: { servico: true } },
            curriculo: { select: { id: true, nome: true, createdAt: true } },
          },
        },
        preferencias: { include: { servico: true } },
        foto: { select: { updatedAt: true } },
      },
    });
    return {
      ...usuario,
      perfil: usuario.responsavel?.responsavelIdosos.some(
        (vinculo) => vinculo.parentesco === 'PROPRIO',
      )
        ? 'IDOSO_INDEPENDENTE'
        : usuario.tipoUsuario,
      responsavel: usuario.responsavel
        ? {
            ...usuario.responsavel,
            responsavelIdosos: usuario.responsavel.responsavelIdosos.map(
              (vinculo) => ({
                ...vinculo,
                idoso: apresentarIdoso(vinculo.idoso),
              }),
            ),
          }
        : null,
    };
  }

  /** Aceita JPEG, PNG ou WebP e valida o conteúdo antes de gravar. */
  async salvarFoto(usuarioId: number, imagem?: Imagem) {
    const dados = dadosImagemPerfil(imagem);
    const foto = await this.prisma.fotoPerfil.upsert({
      where: { usuarioId },
      create: { usuarioId, ...dados },
      update: dados,
      select: { updatedAt: true },
    });
    return { fotoVersao: foto.updatedAt };
  }

  removerFoto(usuarioId: number) {
    return this.prisma.fotoPerfil.deleteMany({ where: { usuarioId } });
  }

  logout(sessaoId: string) {
    return this.prisma.sessao.deleteMany({ where: { id: sessaoId } });
  }
  async curriculo(id: number) {
    const arquivo = await this.prisma.curriculo.findUnique({
      where: { cuidadorId: id },
    });
    if (!arquivo) throw new NotFoundException('Currículo não encontrado.');
    return arquivo;
  }
}
