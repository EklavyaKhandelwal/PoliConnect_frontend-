import { useRef, useState } from "react";
import { FiCamera, FiClipboard, FiImage, FiPlus, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { usePhotoPreviewUrls } from "./usePhotoPreviewUrls";

interface PhotoStepProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: () => void;
}

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const PhotoStep = ({ files, onFilesChange, onContinue }: PhotoStepProps) => {
  const { t } = useTranslation("common");
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState("");
  const previewUrls = usePhotoPreviewUrls(files);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const selectedFiles = Array.from(fileList);
    const additions = selectedFiles.filter(
      (file) => SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_PHOTO_SIZE,
    );
    const nextFiles = [...files, ...additions];
    onFilesChange(nextFiles.slice(0, MAX_PHOTOS));
    if (selectedFiles.some((file) => !SUPPORTED_IMAGE_TYPES.has(file.type))) {
      setPhotoError(t("problemPhoto.photoTypeError"));
    } else if (selectedFiles.some((file) => file.size > MAX_PHOTO_SIZE)) {
      setPhotoError(t("problemPhoto.photoSizeError"));
    } else if (nextFiles.length > MAX_PHOTOS) {
      setPhotoError(t("problemPhoto.photoLimitError"));
    } else {
      setPhotoError("");
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
    setPhotoError("");
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex justify-end">
        <div className="max-w-[82%]">
          <div className="rounded-3xl rounded-br-md bg-blue-600 px-5 py-3 text-base font-medium text-white shadow-sm">
            {t("problemPhoto.confirmYes")}
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-500">
            {t("problemPhoto.messageTime", { time: "10:13" })}{" "}
            <span aria-label={t("problemPhoto.sent")}>✓✓</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2.5">
        <span className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
          <FiClipboard size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-bold text-blue-800">{t("problemPhoto.stepTitle")}</p>
          <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
            {t("problemPhoto.photoPrompt")}
          </div>
        </div>
      </div>

      <section className="ml-11 rounded-3xl bg-white p-3.5 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-4" aria-label={t("problemPhoto.photoPicker")}>
        <input
          ref={cameraInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />

        <div className="grid grid-cols-3 gap-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-300">
              {previewUrls[index] && (
                <img src={previewUrls[index]} alt={t("problemPhoto.photoNumber", { number: index + 1 })} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={t("problemPhoto.removePhoto", { number: index + 1 })}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white"
              >
                <FiX size={17} />
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 text-blue-600"
            >
              <FiPlus size={25} />
              <span className="text-xs font-semibold">{t("problemPhoto.addPhoto")}</span>
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
          >
            <FiCamera size={19} />
            {t("problemPhoto.camera")}
          </button>
          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 text-sm font-semibold text-slate-700"
          >
            <FiImage size={19} />
            {t("problemPhoto.gallery")}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {t("problemPhoto.photoCount", { count: files.length, max: MAX_PHOTOS })}
        </p>
        {photoError && <p role="alert" className="mt-2 text-sm text-red-600">{photoError}</p>}
      </section>

      <div className="ml-11 flex flex-wrap gap-2">
        <button type="button" onClick={onContinue} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
          {t("problemPhoto.continue")}
        </button>
        <button type="button" onClick={onContinue} className="rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600">
          {t("problemPhoto.noPhoto")}
        </button>
      </div>
    </div>
  );
};

export default PhotoStep;
