export function ModeButton({ active, ...props }) {
  return (
    <ToolButton
      colorClassName={`${active ? "bg-indigo-600 text-white" : null}`}
      {...props}
    />
  );
}

export default function ToolButton({
  onClick,
  disabled,
  colorClassName = "text-gray-600 bg-white",
  children,
}) {
  return (
    <button
      className={`
        px-2
        py-1
        first:rounded-bl-md
        last:rounded-br-md
        -ml-px
        first:ml-auto
        border
        border-t-0
        border-gray-300
        ${disabled ? "text-gray-400" : colorClassName}
        font-thin
        bg-white
        focus:outline-none`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
