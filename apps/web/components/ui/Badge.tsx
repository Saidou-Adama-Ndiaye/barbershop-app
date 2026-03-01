// .\.\apps\web\components\ui\Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'orange' | 'blue' | 'gray';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
  orange: 'bg-orange-100 text-orange-800',
  blue:   'bg-blue-100 text-blue-800',
  gray:   'bg-gray-100 text-gray-700',
};

export default function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}