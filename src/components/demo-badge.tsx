export function DemoBadge({
  label = "Prototipo local",
  title = "Aplicación local en fase de prototipo",
  mark = "L",
}: {
  label?: string;
  title?: string;
  mark?: string;
}) {
  return (
    <span className="demo-badge" title={title}>
      <span aria-hidden="true">{mark}</span>
      {label}
    </span>
  );
}
