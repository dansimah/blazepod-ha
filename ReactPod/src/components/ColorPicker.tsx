import { COLOR_HEX } from "../activities/types";

const COLOR_KEYS = Object.keys(COLOR_HEX);

interface ColorPickerProps {
  selected: string[];
  onChange: (colors: string[]) => void;
}

export default function ColorPicker({ selected, onChange }: ColorPickerProps) {
  const toggle = (color: string) => {
    if (selected.includes(color)) {
      onChange(selected.filter((c) => c !== color));
    } else {
      onChange([...selected, color]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Color selection">
      {COLOR_KEYS.map((color) => {
        const hex = COLOR_HEX[color];
        const isSelected = selected.includes(color);
        return (
          <button
            key={color}
            type="button"
            onClick={() => toggle(color)}
            className={`w-10 h-10 rounded-full border-2 transition-all ${
              isSelected
                ? "border-white ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-800"
                : "border-slate-600 hover:border-slate-500"
            }`}
            style={{ backgroundColor: hex }}
            aria-pressed={isSelected}
            aria-label={`Toggle ${color}`}
          />
        );
      })}
    </div>
  );
}
