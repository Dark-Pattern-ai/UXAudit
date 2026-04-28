interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

const variantStyles = {
  primary: 'bg-green-600 text-white hover:bg-green-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3 text-lg',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </button>
  );
};

export default Button;