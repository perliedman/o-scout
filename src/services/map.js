import readOcad from "ocad2geojson/src/ocad-reader";
import toBuffer from "blob-to-buffer";

export async function readMap(blob) {
  const file = await new Promise((resolve, reject) =>
    toBuffer(blob, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    })
  );
  return await readOcad(file);
}
