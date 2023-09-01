import { useState, useEffect } from 'react';
import placeholderImage from '../../../assets/img/noimage.png';

interface ImgProps {
  img_path?: string;
  img_title?: string;
  img_style?: string;
}

function CustomImage({ img_path, img_title, img_style }: ImgProps) {
  const [isImage, setIsImage] = useState(placeholderImage);

  useEffect(() => {
    setIsImage(placeholderImage);
    if (img_path) {
      const image = new Image();
      image.src = img_path;
      image.onload = () => {
        setIsImage(img_path);
      };
    }
  }, [img_path]);

  return (
    <div className={img_style}>
      <img src={isImage} alt={img_title} className={`${img_style}__img`} />
    </div>
  );
}

export default CustomImage;
