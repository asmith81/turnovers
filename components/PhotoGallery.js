import { useRef, useState } from 'react';
import { compressImage, getBase64Size } from '../lib/imageCompression';

export default function PhotoGallery({ photos, onPhotosChange }) {
  const fileInputRef = useRef(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    setIsCompressing(true);
    
    try {
      const compressedPhotos = [];
      
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            // Compress image (800px max, 60% quality)
            const compressedBase64 = await compressImage(file, {
              maxWidth: 800,
              maxHeight: 800,
              quality: 0.6
            });
            
            const sizeKB = getBase64Size(compressedBase64);
            
            const newPhoto = {
              id: Date.now() + Math.random(),
              url: compressedBase64,
              name: file.name,
              timestamp: new Date().toISOString(),
              caption: '',
              sizeKB: sizeKB
            };
            
            compressedPhotos.push(newPhoto);
          } catch (error) {
            console.error('Failed to compress image:', file.name, error);
            // Continue with other images
          }
        }
      }
      
      if (compressedPhotos.length > 0) {
        onPhotosChange([...photos, ...compressedPhotos]);
      }
    } finally {
      setIsCompressing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current.click();
  };

  const deletePhoto = (photoId) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const updateCaption = (photoId, caption) => {
    onPhotosChange(photos.map(p => 
      p.id === photoId ? { ...p, caption } : p
    ));
  };

  return (
    <div className="photo-gallery">
      <div className="gallery-header">
        <h3>📷 Photos ({photos.length})</h3>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button onClick={handleCameraCapture} className="btn btn-primary">
            📸 Add Photo
          </button>
        </div>
      </div>

      {isCompressing && (
        <div className="compressing-banner">
          ⏳ Compressing images...
        </div>
      )}

      {photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <p>No photos yet</p>
          <p className="empty-hint">Take photos of the job site to include in the assessment</p>
          <button onClick={handleCameraCapture} className="btn btn-primary" disabled={isCompressing}>
            📸 Take Photo
          </button>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map(photo => (
            <div 
              key={photo.id} 
              className="photo-card"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="photo-thumbnail">
                <img src={photo.url} alt={photo.name} />
              </div>
              <div className="photo-info">
                <div className="photo-name">{photo.name}</div>
                {photo.sizeKB && (
                  <div className="photo-size">{photo.sizeKB} KB</div>
                )}
                {photo.caption && (
                  <div className="photo-caption">{photo.caption}</div>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photo.id);
                }}
                className="delete-button"
                title="Delete photo"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="modal" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.name}
              className="modal-image"
            />
            <div className="modal-info">
              <div className="modal-name">{selectedPhoto.name}</div>
              <div className="modal-timestamp">
                {new Date(selectedPhoto.timestamp).toLocaleString()}
              </div>
              <textarea
                placeholder="Add a caption..."
                value={selectedPhoto.caption}
                onChange={(e) => updateCaption(selectedPhoto.id, e.target.value)}
                className="caption-input"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .photo-gallery {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        h3 {
          margin: 0;
          color: #333;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4CAF50;
          color: white;
        }

        .btn-primary:hover {
          background: #45a049;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #666;
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 8px 0;
        }

        .empty-hint {
          font-size: 14px;
          color: #999;
          margin-bottom: 24px;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .photo-card {
          position: relative;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
        }

        .photo-card:hover {
          border-color: #2196F3;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .photo-thumbnail {
          width: 100%;
          height: 200px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .photo-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-info {
          padding: 12px;
        }

        .photo-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .photo-size {
          font-size: 11px;
          color: #999;
          margin-bottom: 2px;
        }

        .photo-caption {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .compressing-banner {
          padding: 12px;
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 6px;
          color: #856404;
          font-weight: 600;
          text-align: center;
          margin-bottom: 16px;
        }

        .delete-button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(244, 67, 54, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-button:hover {
          background: #f44336;
          transform: scale(1.1);
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          max-height: 90vh;
          overflow: auto;
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 20px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .modal-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .modal-info {
          padding: 20px;
        }

        .modal-name {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .modal-timestamp {
          font-size: 14px;
          color: #666;
          margin-bottom: 16px;
        }

        .caption-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .caption-input:focus {
          outline: none;
          border-color: #2196F3;
        }

        @media (max-width: 768px) {
          .photo-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }

          .photo-thumbnail {
            height: 150px;
          }
        }
      `}</style>
    </div>
  );
}

