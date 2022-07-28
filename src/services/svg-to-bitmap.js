export function svgToBitmap(
  svg,
  [width = null, height = null] = [],
  xmlSerializer
) {
  const svgUrl = svgToUrl(svg, xmlSerializer);
  width = width || svg.getAttribute("width");
  height = height || svg.getAttribute("height");
  return svgUrlToBitmapDataUrl(svgUrl, [width, height]);
}

export function svgUrlToBitmapDataUrl(
  svgUrl,
  [width = null, height = null] = []
) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = svgUrl;

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

export function svgToUrl(svg, xmlSerializer) {
  return `data:image/svg+xml,${encodeURIComponent(
    xmlSerializer.serializeToString(svg)
  )}`;
}
