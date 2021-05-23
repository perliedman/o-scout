import React, { useState } from "react";
import readOcad from "ocad2geojson/src/ocad-reader";
import toBuffer from "blob-to-buffer";
import Spinner from "./ui/Spinner";

export default function SelectMap({ onMapLoaded }) {
  const [state, setState] = useState("idle");

  return (
    <>
      <input
        disabled={state === "loading"}
        type="file"
        accept=".ocd"
        onChange={loadMap}
      />
      {state === "loading" && <Spinner />}
    </>
  );

  async function loadMap(e) {
    setState("loading");
    try {
      const [blob] = e.target.files;
      const file = await new Promise((resolve, reject) =>
        toBuffer(blob, (err, buffer) => {
          if (err) reject(err);
          resolve(buffer);
        })
      );
      const map = await readOcad(file);
      onMapLoaded(map);
      setState("idle");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  }
}
