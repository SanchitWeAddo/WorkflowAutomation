import clsx from 'clsx';

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-[3px]',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-brand/30 border-t-brand',
        sizeStyles[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
