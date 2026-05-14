/**
 * Helper to get image source from base64 stored in DB.
 * No fallback - only uses base64 from database.
 */
export function getImageSrc(imageBase64?: string): string {
    if (!imageBase64) {
        return '';
    }
    if (imageBase64.startsWith('data:')) {
        return imageBase64;
    }
    return `data:image/jpeg;base64,${imageBase64}`;
}
