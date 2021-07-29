import styles from "./Input.module.css";

export default function Input({ className, ...props }) {
  return (
    <input
      className={`${styles.input} ${className ? className : ""}`}
      {...props}
    />
  );
}
