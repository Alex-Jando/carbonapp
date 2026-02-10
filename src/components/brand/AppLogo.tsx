import Image from "next/image";
import logo from "@/resources/logo.png.png";

type AppLogoProps = {
  size?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
};

export function AppLogo({
  size = 40,
  showLabel = false,
  label = "Carbon Pals",
  className = "",
  imageClassName = "",
  labelClassName = "text-sm font-semibold tracking-wide text-zinc-50",
}: AppLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <Image
        src={logo}
        alt={`${label} logo`}
        width={size}
        height={size}
        className={`h-auto w-auto object-contain ${imageClassName}`.trim()}
      />
      {showLabel ? <span className={labelClassName}>{label}</span> : null}
    </div>
  );
}
