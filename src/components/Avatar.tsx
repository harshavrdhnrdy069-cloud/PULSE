import { avatarColor, initials } from '@/lib/time';

export default function Avatar({
  name,
  id,
  size = 'md',
  onClick,
}: {
  name: string;
  id: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  };

  return (
    <div
      onClick={onClick}
      className={`${sizes[size]} ${avatarColor(id)} flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${onClick ? 'cursor-pointer ring-2 ring-transparent transition hover:ring-slate-300' : ''}`}
    >
      {initials(name)}
    </div>
  );
}
