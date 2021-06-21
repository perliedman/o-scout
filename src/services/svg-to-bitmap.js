export function svgToBitmap(svg, [width = null, height = null] = []) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = svgToUrl(svg);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width || svg.getAttribute("width");
      canvas.height = height || svg.getAttribute("height");
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      resolve(canvas.toDataURL());
    };
    image.onerror = (err) =>
      reject(new Error(`Failed to convert SVG to bitmap: ${err.toString()}`));
  });
}

export function svgToUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.outerHTML)}`;
}
