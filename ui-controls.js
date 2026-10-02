// One field widget, shared by the settings page and the effect inspector.
//   kind: range | select | color | toggle

function formatValue(value, options = {}) {
  if (options.zero && Number(value) === 0) return options.zero;
  return `${value}${options.unit ?? ""}`;
}

export function createField({ label, kind, options = {}, value, onChange }) {
  const row = document.createElement("label");
  row.className = "field";

  const name = document.createElement("span");
  name.textContent = label;

  let input;

  if (kind === "toggle") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    input.addEventListener("change", () => onChange(input.checked));
  } else if (kind === "color") {
    input = document.createElement("input");
    input.type = "color";
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
  } else if (kind === "select") {
    input = document.createElement("select");
    options.choices.forEach((choice, i) => {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = options.labels?.[i] ?? choice;
      input.append(option);
    });
    input.value = value;
    const numeric = options.choices.every((choice) => typeof choice === "number");
    input.addEventListener("change", () => onChange(numeric ? Number(input.value) : input.value));
  } else {
    input = document.createElement("input");
    input.type = "range";
    Object.assign(input, { min: options.min, max: options.max, step: options.step, value });

    const readout = document.createElement("span");
    readout.className = "field__value";
    readout.textContent = formatValue(value, options);
    name.append(readout);

    input.addEventListener("input", () => {
      readout.textContent = formatValue(input.value, options);
      onChange(Number(input.value));
    });
  }

  row.append(name, input);
  return row;
}
