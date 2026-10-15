/**
 * Compressão de imagem no navegador, antes de qualquer upload.
 *
 * - Redimensiona para caber em `ladoMaximo` (ou recorta o centro em quadrado, p/ foto de perfil).
 * - Re-encoda em WebP (fallback JPEG se o navegador não gerar WebP).
 * - O re-encode descarta o EXIF, inclusive a localização GPS da foto (LGPD).
 *
 * O back-end valida e comprime de novo — isto aqui é economia de banda/espaço, não segurança.
 */
export interface OpcoesCompressao {
  /** Maior lado da imagem final, em px. */
  ladoMaximo: number;
  /** 0 a 1. */
  qualidade?: number;
  /** Recorta o centro em quadrado antes de redimensionar (foto de perfil). */
  quadrado?: boolean;
}

export class ImagemInvalidaError extends Error {}

export async function comprimirImagem(arquivo: File, opcoes: OpcoesCompressao): Promise<File> {
  const { ladoMaximo, qualidade = 0.8, quadrado = false } = opcoes;

  let bitmap: ImageBitmap;
  try {
    // respeita a orientação do celular (foto "deitada") antes de descartar o EXIF
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  } catch {
    throw new ImagemInvalidaError('Não foi possível ler esta imagem. Use uma foto em JPG, PNG ou WebP.');
  }

  try {
    // área de origem (recorte central quando quadrado)
    const ladoRecorte = Math.min(bitmap.width, bitmap.height);
    const sx = quadrado ? (bitmap.width - ladoRecorte) / 2 : 0;
    const sy = quadrado ? (bitmap.height - ladoRecorte) / 2 : 0;
    const sw = quadrado ? ladoRecorte : bitmap.width;
    const sh = quadrado ? ladoRecorte : bitmap.height;

    // nunca amplia, só reduz
    const escala = Math.min(1, ladoMaximo / Math.max(sw, sh));
    const largura = Math.round(sw * escala);
    const altura = Math.round(sh * escala);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ImagemInvalidaError('Seu navegador não conseguiu processar a imagem.');
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, largura, altura);

    let blob = await paraBlob(canvas, 'image/webp', qualidade);
    // Navegadores sem encoder WebP devolvem PNG silenciosamente
    if (!blob || blob.type !== 'image/webp') {
      blob = await paraBlob(canvas, 'image/jpeg', qualidade);
    }
    if (!blob) {
      throw new ImagemInvalidaError('Não foi possível comprimir a imagem.');
    }

    const extensao = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const nomeBase = arquivo.name.replace(/\.[^.]+$/, '') || 'imagem';
    return new File([blob], `${nomeBase}.${extensao}`, { type: blob.type, lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

/** "1,2 MB", "48 KB" — para mostrar ao usuário. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
