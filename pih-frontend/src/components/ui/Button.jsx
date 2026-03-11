import { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  primary:
    'bg-brand text-white hover:bg-brand-dark focus:ring-brand/40 shadow-sm',
  secondary:
    'bg-brand-light/10 text-brand-dark hover:bg-brand-light/20 focus:ring-brand-light/30',
  outline:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-brand/30',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40 shadow-sm',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300/40',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2.5',
};

const iconSizeMap = {
  sm: 14,
  md: 16,
  lg: 18,
};

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon: Icon,
      iconRight: IconRight,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSizeMap[size]} className="animate-spin" />
        ) : Icon ? (
          <Icon size={iconSizeMap[size]} />
        ) : null}
        {children}
        {!loading && IconRight && <IconRight size={iconSizeMap[size]} />}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
