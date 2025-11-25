/**
 * Image compression utilities
 * Based on lessons from PHOTO_UPLOAD_LESSONS_LEARNED.md
 */

/**
 * Compress an image file to reduce size
 * @param {File} file - Image file to compress
 * @param {object} options - Compression options
 * @returns {Promise<string>} Base64 encoded compressed image
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.6,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        const compressedBase64 = canvas.toDataURL(outputFormat, quality);
        
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Get compressed size estimate in KB
 * @param {string} base64String - Base64 encoded image
 * @returns {number} Size in KB
 */
export function getBase64Size(base64String) {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const padding = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0;
  const sizeInBytes = (base64Length * 3 / 4) - padding;
  return Math.round(sizeInBytes / 1024);
}

