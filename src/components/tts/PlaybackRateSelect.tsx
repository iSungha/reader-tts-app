type Props = {
  value: number;
  onChange: (value: number) => void;
};

const RATE_OPTIONS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2];

export default function PlaybackRateSelect({ value, onChange }: Props) {
  return (
    <div>
      <h3>Speed</h3>

      <select
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
      >
        {RATE_OPTIONS.map((rate) => (
          <option key={rate} value={rate}>
            {rate}
          </option>
        ))}
      </select>
    </div>
  );
}