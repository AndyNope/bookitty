import { useState, type InputHTMLAttributes } from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
};

const NumberInput = ({ value, onValueChange, ...inputProps }: NumberInputProps) => {
  const [draft, setDraft] = useState<{ sourceValue: number | null | undefined; text: string } | null>(null);
  const displayedValue = draft && draft.sourceValue === value ? draft.text : value == null ? '' : String(value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.currentTarget.value;
    const parsed = raw === '' ? 0 : event.currentTarget.valueAsNumber;
    if (Number.isFinite(parsed)) {
      setDraft({ sourceValue: parsed, text: raw });
      onValueChange(parsed);
    }
  };

  return <input {...inputProps} type="number" value={displayedValue} onChange={handleChange} />;
};

export default NumberInput;
