export type TransformDirection = 'encrypt' | 'decrypt';

interface CurveBuffer {
  positions: Int32Array;
  nextIndex: number;
  canvasWidth: number;
}

const generate2d = (
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  curve: CurveBuffer
) => {
  const width = Math.abs(ax + ay);
  const height = Math.abs(bx + by);
  const majorX = Math.sign(ax);
  const majorY = Math.sign(ay);
  const orthogonalX = Math.sign(bx);
  const orthogonalY = Math.sign(by);

  if (height === 1) {
    for (let index = 0; index < width; index += 1) {
      curve.positions[curve.nextIndex] = x + y * curve.canvasWidth;
      curve.nextIndex += 1;
      x += majorX;
      y += majorY;
    }
    return;
  }

  if (width === 1) {
    for (let index = 0; index < height; index += 1) {
      curve.positions[curve.nextIndex] = x + y * curve.canvasWidth;
      curve.nextIndex += 1;
      x += orthogonalX;
      y += orthogonalY;
    }
    return;
  }

  let halfAx = Math.floor(ax / 2);
  let halfAy = Math.floor(ay / 2);
  let halfBx = Math.floor(bx / 2);
  let halfBy = Math.floor(by / 2);
  const halfWidth = Math.abs(halfAx + halfAy);
  const halfHeight = Math.abs(halfBx + halfBy);

  if (2 * width > 3 * height) {
    if (halfWidth % 2 === 1 && width > 2) {
      halfAx += majorX;
      halfAy += majorY;
    }

    generate2d(x, y, halfAx, halfAy, bx, by, curve);
    generate2d(
      x + halfAx,
      y + halfAy,
      ax - halfAx,
      ay - halfAy,
      bx,
      by,
      curve
    );
    return;
  }

  if (halfHeight % 2 === 1 && height > 2) {
    halfBx += orthogonalX;
    halfBy += orthogonalY;
  }

  generate2d(x, y, halfBx, halfBy, halfAx, halfAy, curve);
  generate2d(
    x + halfBx,
    y + halfBy,
    ax,
    ay,
    bx - halfBx,
    by - halfBy,
    curve
  );
  generate2d(
    x + (ax - majorX) + (halfBx - orthogonalX),
    y + (ay - majorY) + (halfBy - orthogonalY),
    -halfBx,
    -halfBy,
    -(ax - halfAx),
    -(ay - halfAy),
    curve
  );
};

const gilbert2d = (width: number, height: number) => {
  const curve: CurveBuffer = {
    positions: new Int32Array(width * height),
    nextIndex: 0,
    canvasWidth: width,
  };

  if (width >= height) {
    generate2d(0, 0, width, 0, 0, height, curve);
  } else {
    generate2d(0, 0, 0, height, width, 0, curve);
  }

  return curve.positions;
};

const loadImage = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('无法读取当前图片'));
    image.src = src;
  });
};

const encodeCanvas = (canvas: HTMLCanvasElement, mimeType: string) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('无法生成处理后的图片'));
        return;
      }

      if (blob.type !== mimeType) {
        reject(new Error(`当前浏览器不支持保持 ${mimeType} 格式导出`));
        return;
      }

      resolve(blob);
    }, mimeType);
  });
};

/**
 * Reorders an image's pixels along a Gilbert space-filling curve and encodes
 * the result with the requested MIME type.
 */
export const transformImage = async (
  src: string,
  direction: TransformDirection,
  mimeType: string
) => {
  const image = await loadImage(src);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持图片处理');
  }

  context.drawImage(image, 0, 0);
  const sourceData = context.getImageData(0, 0, width, height);
  const targetData = new ImageData(width, height);
  const sourcePixels = new Uint32Array(sourceData.data.buffer);
  const targetPixels = new Uint32Array(targetData.data.buffer);
  const curve = gilbert2d(width, height);
  const pixelCount = width * height;
  const offset = Math.round(((Math.sqrt(5) - 1) / 2) * pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    const sourceIndex = curve[index];
    const shiftedIndex = curve[(index + offset) % pixelCount];

    if (direction === 'encrypt') {
      targetPixels[shiftedIndex] = sourcePixels[sourceIndex];
    } else {
      targetPixels[sourceIndex] = sourcePixels[shiftedIndex];
    }
  }

  context.putImageData(targetData, 0, 0);
  return await encodeCanvas(canvas, mimeType);
};
