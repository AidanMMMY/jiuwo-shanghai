'use client';

import Image from 'next/image';
import { useState } from 'react';
import Lightbox from './Lightbox';

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
            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer"
            onClick={() => setLightboxIndex(idx)}
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
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
