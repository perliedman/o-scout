import { useCallback, useEffect, useRef } from "react";

export default function FilePicker({ active, accept, onSelect }) {
  const fileRef = useRef();

  useEffect(() => {
    if (fileRef.current && active) {
      fileRef.current.value = null;
      fileRef.current.click();
    }
  }, [fileRef, active]);

  const onChange = useCallback(
    (e) => {
      onSelect(e.target.files);
    },
    [onSelect]
  );

  return (
    active && (
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={onChange}
      />
    )
  );
}
