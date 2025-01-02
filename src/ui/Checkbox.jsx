import Toggle from "./Toggle";

/**
 * @typedef {Object} CheckboxProps
 * @property {boolean=} checked
 * @property {string} label
 * @property {string} id
 * @property {string=} additionalInfo
 * @property {(boolean) => void} onChange
 *
 */

/**
 *
 * @param {CheckboxProps} props
 * @returns
 */
export default function Checkbox({
  checked,
  id,
  label,
  additionalInfo,
  onChange,
}) {
  return (
    <div className="flex items-center">
      <Toggle active={checked} onChange={onChange} />
      <span className="ml-3" id={`${id}-label`}>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {additionalInfo && (
          <span className="text-sm text-gray-500">{additionalInfo}</span>
        )}
      </span>
    </div>
  );
}
