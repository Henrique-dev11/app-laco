import { BadRequestException } from '@nestjs/common';

/** A assinatura do arquivo determina o formato, independentemente do MIME enviado. */
export function dadosImagemPerfil(imagem?: { buffer: Buffer }) {
  const b = imagem?.buffer;
  const mime =
    b && b.length > 12
      ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
        ? 'image/jpeg'
        : b
              .subarray(0, 8)
              .equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
              )
          ? 'image/png'
          : b.subarray(0, 4).toString('latin1') === 'RIFF' &&
              b.subarray(8, 12).toString('latin1') === 'WEBP'
            ? 'image/webp'
            : null
      : null;
  if (!b || !mime || b.length > 3 * 1024 * 1024)
    throw new BadRequestException(
      'Envie uma foto JPEG, PNG ou WebP de até 3 MB.',
    );
  return { mime, conteudo: new Uint8Array(b) };
}
