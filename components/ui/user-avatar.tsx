import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  className?: string;
  fallbackClassName?: string;
  showBorder?: boolean;
  borderColor?: string;
}

export function UserAvatar({
  name,
  className,
  fallbackClassName,
  showBorder = false,
  borderColor = "border-border",
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar
      className={cn(
        "h-8 w-8",
        showBorder && "border-2",
        showBorder && borderColor,
        className
      )}
    >
      <AvatarFallback
        className={cn("text-sm bg-primary/5 text-primary", fallbackClassName)}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
