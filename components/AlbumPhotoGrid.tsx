'use client';

import Image from 'next/image';
import { useState } from 'react';
import Lightbox from './Lightbox';
import LikeButton from './LikeButton';

export default function AlbumPhotoGrid({
  photos,
}: {
  photos: { src: string; alt: string }[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
            onClick={() => setLightboxIndex(idx)}
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
            {/* Like button overlay — bottom-right corner */}
            <div
              className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <LikeButton
                targetType="photo"
                targetId={photo.src}
                className="text-xs"
              />
            </div>
          </div>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={(index) => setLightboxIndex(index)}
        />
      )}
    </>
  );
}
