import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

export default function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  className,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const timeoutRef = useRef(null);
  const isControlled = controlledValue !== undefined;
  const displayValue = isControlled ? controlledValue : internalValue;

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue, isControlled]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternalValue(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange?.(val);
    }, debounce);
  };

  const handleClear = () => {
    setInternalValue('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onChange?.('');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={clsx('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} className="text-gray-400" />
      </div>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          'block w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 py-2 text-sm text-gray-900',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand',
          'transition-colors duration-150',
        )}
        {...props}
      />
      {displayValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
