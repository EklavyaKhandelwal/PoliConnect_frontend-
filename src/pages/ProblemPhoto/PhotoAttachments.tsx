import { useTranslation } from "react-i18next";
import { usePhotoPreviewUrls } from "./usePhotoPreviewUrls";

interface PhotoAttachmentsProps {
  photos: File[];
}

const PhotoAttachments = ({ photos }: PhotoAttachmentsProps) => {
  const { t } = useTranslation("common");
  const urls = usePhotoPreviewUrls(photos);

  if (photos.length === 0) return null;

  return (
    <div className="mb-4 flex justify-end">
      <div className="max-w-[70%]">
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo, index) => urls[index] && (
            <img
              key={`${photo.name}-${photo.lastModified}-${index}`}
              src={urls[index]}
              alt={t("problemPhoto.photoNumber", { number: index + 1 })}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
        </div>
        <p className="mt-1.5 text-right text-xs text-slate-500">
          {t("problemPhoto.photoCountShort", { count: photos.length })}{" "}
          <span aria-label={t("problemPhoto.sent")}>✓✓</span>
        </p>
      </div>
    </div>
  );
};

export default PhotoAttachments;
