import { BadRequestException } from '@nestjs/common';
export function cpfValido(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = Array.from(cpf.slice(0, tamanho)).reduce(
      (total, digito, i) => total + Number(digito) * (tamanho + 1 - i),
      0,
    );
    const digito = (soma * 10) % 11;
    if ((digito === 10 ? 0 : digito) !== Number(cpf[tamanho])) return false;
  }
  return true;
}

export function validarPessoa(dto: {
  cpf?: string | null;
  dataNascimento?: string;
}) {
  if (dto.cpf != null && !cpfValido(dto.cpf))
    throw new BadRequestException('CPF inválido.');
  if (dto.dataNascimento !== undefined) {
    const data = new Date(dto.dataNascimento);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dto.dataNascimento) ||
      !Number.isFinite(data.getTime()) ||
      data.toISOString().slice(0, 10) !== dto.dataNascimento ||
      data > new Date() ||
      data.getUTCFullYear() < 1900
    )
      throw new BadRequestException('Data de nascimento inválida.');
  }
}
