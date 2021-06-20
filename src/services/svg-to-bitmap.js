export function svgToBitmap(svg, [width, height]) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const xml = svg.outerHTML;
    const url = `data:image/svg+xml;base64,${btoa(
      unescape(encodeURIComponent(xml))
    )}`;
    image.src = url;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      resolve(canvas.toDataURL());
    };
    image.onerror = (err) =>
      reject(new Error(`Failed to convert SVG to bitmap: ${err.toString()}`));
  });
}
