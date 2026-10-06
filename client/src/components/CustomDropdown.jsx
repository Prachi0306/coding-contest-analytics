import { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  minWidth = '160px',
  maxWidth = '360px',
  width,
  style = {},
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.key,
        label: opt.label || opt.name || String(opt.value),
        icon: opt.icon || null,
        badge: opt.badge || opt.type || null,
      };
    }
    return {
      value: opt,
      label: String(opt),
      icon: null,
      badge: null,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      id={id ? `${id}-container` : undefined}
      className={`custom-dropdown ${disabled ? 'custom-dropdown--disabled' : ''} ${isOpen ? 'custom-dropdown--open' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth,
        maxWidth,
        width: width || 'auto',
        ...style,
      }}
    >
      <button
        type="button"
        id={id}
        disabled={disabled}
        className="custom-dropdown__trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="custom-dropdown__selected">
          {selectedOption?.icon && (
            <span className="custom-dropdown__selected-icon">{selectedOption.icon}</span>
          )}
          <span
            className={`custom-dropdown__selected-text ${
              !selectedOption ? 'custom-dropdown__selected-text--placeholder' : ''
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <span className={`custom-dropdown__arrow ${isOpen ? 'custom-dropdown__arrow--up' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="custom-dropdown__menu" role="listbox" id={id ? `${id}-listbox` : undefined}>
          {normalizedOptions.length === 0 ? (
            <div className="custom-dropdown__empty">No options available</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-dropdown__item ${
                    isSelected ? 'custom-dropdown__item--selected' : ''
                  }`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="custom-dropdown__item-content">
                    {opt.icon && (
                      <span className="custom-dropdown__item-icon">{opt.icon}</span>
                    )}
                    <span className="custom-dropdown__item-label" title={opt.label}>
                      {opt.label}
                    </span>
                  </div>
                  {opt.badge && (
                    <span className="badge badge--info custom-dropdown__item-badge">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="custom-dropdown__item-check">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
