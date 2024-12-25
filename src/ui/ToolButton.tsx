import { ButtonHTMLAttributes } from "react";

type ToolButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  colorClassName?: string;
};
type ModeButtonProps = ToolButtonProps & { active?: boolean };

export function ModeButton({ active, ...props }: ModeButtonProps): JSX.Element {
  return (
    <ToolButton
      role="switch"
      aria-checked={active}
      colorClassName={active ? "bg-indigo-600 text-white" : undefined}
      {...props}
    />
  );
}

export default function ToolButton({
  onClick,
  disabled,
  colorClassName = "",
  children,
  ...props
}: ToolButtonProps): JSX.Element {
  return (
    <button
      {...props}
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
        ${disabled ? "text-gray-400 bg-white" : colorClassName || "bg-white"}
        font-thin        
        focus:outline-none`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
