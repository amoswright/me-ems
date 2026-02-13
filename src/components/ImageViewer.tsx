import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

interface ImageViewerProps {
  images: Array<{
    src: string;
    title: string;
  }>;
  children: React.ReactElement;
}

export function ImageViewer({ images, children }: ImageViewerProps) {
  return (
    <PhotoProvider
      speed={() => 300}
      easing={(type) => (type === 2 ? 'cubic-bezier(0.36, 0, 0.66, -0.56)' : 'cubic-bezier(0.34, 1.56, 0.64, 1)')}
    >
      {images.map((image, index) => (
        <PhotoView key={index} src={image.src}>
          {children}
        </PhotoView>
      ))}
    </PhotoProvider>
  );
}
