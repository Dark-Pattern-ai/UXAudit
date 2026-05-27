interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) => {
  const base = 'rounded font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? undefined : 'var(--navy)',
      color: 'white',
    },
    secondary: {
      backgroundColor: 'white',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    danger: {
      backgroundColor: 'var(--red)',
      color: 'white',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeStyles[size]}`}
      style={styles[variant]}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (variant === 'primary') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--navy-hover)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        if (variant === 'primary') (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--navy)';
      }}
    >
      {children}
    </button>
  );
};

export default Button;
