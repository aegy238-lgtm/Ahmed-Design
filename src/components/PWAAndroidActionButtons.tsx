import React, { useRef } from 'react';
import { FolderOpen } from 'lucide-react';

interface PWAAndroidActionButtonsProps {
  onOpenFile?: (files: File[]) => void;
  variant?: 'header' | 'hero' | 'mobile-bar';
  className?: string;
}

export const PWAAndroidActionButtons: React.FC<PWAAndroidActionButtonsProps> = ({
  onOpenFile,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!onOpenFile) return null;

  const handleOpenFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onOpenFile) {
      const files = Array.from(e.target.files);
      onOpenFile(files);
      e.target.value = '';
    }
  };

  const supportedExtensions = ".svga,.svg,.vap,.mp4,.webp,.gif,.apng,.png,.json,.lottie,.pag,.webm,.mov";

  return (
    <div className={`flex items-center ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={supportedExtensions}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={handleOpenFileClick}
        className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-600/20 to-indigo-600/20 hover:from-sky-600/30 hover:to-indigo-600/30 text-sky-200 hover:text-white border border-sky-500/30 hover:border-sky-500/50 transition-all font-bold text-xs shrink-0 shadow-sm active:scale-95 cursor-pointer"
        title="فتح ملف من هاتفك أو جهازك"
      >
        <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
        <span className="font-arabic font-extrabold whitespace-nowrap">فتح ملف</span>
      </button>
    </div>
  );
};
