export function download(url, filename) {
  const a = window.document.createElement("a");
  a.download = filename;
  a.href = url;
  a.click();
}

export default function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  download(url, filename);
  URL.revokeObjectURL(url);
}
