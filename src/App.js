import { useState } from "react";
import Map from "./MapComponent";
import SelectMap from "./SelectMap";

function App() {
  const [mapFile, setMapFile] = useState();

  return mapFile ? (
    <Map mapFile={mapFile} />
  ) : (
    <SelectMap onMapLoaded={setMapFile} />
  );
}

export default App;
