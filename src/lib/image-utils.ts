export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
    image.src = url
  })

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation)

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string | null> {
  const image = await createImage(imageSrc)
  if (![pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, rotation].every(Number.isFinite) ||
      pixelCrop.width <= 0 || pixelCrop.height <= 0 || pixelCrop.x < 0 || pixelCrop.y < 0 ||
      image.width * image.height > 80000000) throw new Error('La imagen o el recorte son demasiado grandes.');
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = getRadianAngle(rotation)

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // Draw directly into a bounded crop; never allocate a full rotated canvas.
  const scale = Math.min(1, 2048 / Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = Math.max(1, Math.round(pixelCrop.width * scale))
  canvas.height = Math.max(1, Math.round(pixelCrop.height * scale))
  ctx.scale(scale, scale)
  ctx.translate(-pixelCrop.x, -pixelCrop.y)

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  // As Base64 string
  return canvas.toDataURL('image/jpeg');

  // As Blob
  // return new Promise((resolve, reject) => {
  //   canvas.toBlob((file) => {
  //     resolve(URL.createObjectURL(file))
  //   }, 'image/jpeg')
  // })
}
