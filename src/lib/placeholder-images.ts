
import data from './placeholder-images.json';
import type { ImagePlaceholder } from './types';

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

export function getPlaceholderImageUrls(): string[] {
  // Return all image URLs from the JSON data for the service worker to cache.
  return data.placeholderImages.map(img => img.imageUrl);
}
