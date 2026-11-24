# Fotos de demonstração

## Idosos

`idoso01.jpg` a `idoso50.jpg` são 50 retratos sintéticos de pessoas idosas,
gerados pelo recurso integrado de imagens e preparados em JPEG de 160 por
160 pixels. Índices ímpares representam mulheres; pares, homens.
O comando `npm run db:seed:fotos-idosos` preenche apenas fotos ausentes,
em `FotoIdoso` ou, no acesso próprio, em `FotoPerfil`.

Prompt usado no gerador integrado para o atlas dos idosos:

> Use case: photorealistic-natural. Asset type: a single portrait atlas for
> fictional elderly people in an elder-care app demonstration. Create one
> landscape contact sheet of EXACTLY 10 columns and 5 rows, 50 evenly sized
> square portrait cells, perfectly regular grid with no borders, no gutters
> and no text. Each cell contains one entirely fictional Brazilian older
> adult, aged 70 to 88, a centered complete head and shoulders portrait with
> the full face and chin visible, plain pale gray background, soft studio
> lighting, friendly natural expression, realistic wrinkles and gray or
> white hair, diverse Brazilian skin tones and hairstyles, ordinary clothing.
> EVERY row alternates woman in columns 1,3,5,7,9 and man in columns 2,4,6,8,10.
> All 50 people must be different. All cells have identical framing and
> enough room around the head for extracting individual profile photos.
> No celebrities, no real identifiable people, no numbers, no watermarks.
> Render high-resolution photographic texture. Overall image aspect ratio
> 2:1; grid 10 columns by 5 rows exactly.

## Cuidadores e responsáveis

As 100 fotos JPEG são retratos sintéticos de pessoas fictícias, gerados com
o recurso integrado de geração de imagens. Não foram coletadas fotos de
pessoas reais. Os arquivos são usados por `npm run db:seed:usuarios` e
armazenados em `FotoPerfil.conteudo`, sem serviços de imagens externos.

`cuidador01.jpg` a `cuidador50.jpg` representam cuidadores adultos;
`responsavel01.jpg` a `responsavel50.jpg` representam familiares adultos.
Em cada grupo, índices ímpares representam mulheres e pares, homens,
acompanhando os nomes fictícios. Os retratos foram extraídos do atlas
gerado e preparados em JPEG de 160 por 160 pixels.

Prompt usado no gerador integrado:

> Use case: photorealistic-natural. Asset type: one contact-sheet portrait
> atlas for fictional Brazilian user accounts in a local elder-care demo
> database. Create a single square image containing an EXACT uniform 10
> columns by 10 rows grid, 100 square cells, no gutters, no borders, no
> text, no numbers, no watermarks. Every cell contains exactly one centered,
> distinct entirely fictional adult person, a realistic head-and-shoulders
> studio portrait, looking at camera, head fully inside its cell, plain
> pale gray background, soft natural light, friendly expression, ordinary
> neutral clothes, diverse Brazilian skin tones and hairstyles. Grid
> structure MUST be perfectly regular so each cell can be mechanically
> extracted. The first FIVE rows are caregivers ages 25-55; last FIVE rows
> are responsible family members ages 35-60. Within EVERY row alternate a
> woman in columns 1,3,5,7,9 and a man in columns 2,4,6,8,10. Do not depict
> identifiable real people or celebrities. Render sharp natural
> photographic portraits. The single atlas is the deliverable asset;
> 100 unique fictional portraits evenly spaced and consistently framed
> in the exact regular 10x10 layout.
