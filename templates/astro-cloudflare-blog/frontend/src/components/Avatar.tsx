type Props = {
  name: string;
  size?: number;
};

export function Avatar({ name, size = 52 }: Props) {
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        fontWeight: 700,
        fontFamily: 'Georgia, "Times New Roman", serif',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}
