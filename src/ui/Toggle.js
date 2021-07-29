import styles from "./Toggle.module.css";

export default function Toggle({ active, alt, onChange }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${active ? styles.active : ""}`}
      role="switch"
      aria-checked="false"
      onClick={() => onChange(!active)}
    >
      <span className="sr-only">{alt}</span>
      <span aria-hidden="true" className={styles.knob}></span>
    </button>
  );
}
