import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 40,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/tablewedding-mark.png"
      alt="TableWedding"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full", className)}
    />
  );
}
