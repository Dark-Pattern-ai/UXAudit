interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  accent?: boolean;
}

const Card = ({ children, title, className = '', accent = false }: CardProps) => {
  return (
    <div
      className={`bg-[var(--surface)] rounded-lg p-5 ${className}`}
      style={{
        border: '1px solid var(--border)',
        borderLeft: accent ? '4px solid var(--navy)' : '1px solid var(--border)',
      }}
    >
      {title && (
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4"
          style={{ color: 'var(--text-secondary)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;
