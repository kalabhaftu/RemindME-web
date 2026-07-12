import Image from "next/image";

interface EmptyStateProps {
  iconPath: string;
  message: string;
}

export function EmptyState({ iconPath, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
      <div className="relative w-32 h-32 mb-6">
        <Image
          src={iconPath}
          alt="Empty state icon"
          fill
          className="object-contain"
        />
      </div>
      <p className="text-[rgba(255,255,255,0.38)] text-sm max-w-[240px]">
        {message}
      </p>
    </div>
  );
}
