import Map from "./MapComponent";
import StartScreen from "./StartScreen";
import Sidebar from "./Sidebar";
import { useMap } from "./store";

function App() {
  const mapFile = useMap(getMap);

  return mapFile ? (
    <>
      <Map mapFile={mapFile} />
      <Sidebar />
    </>
  ) : (
    <StartScreen />
  );
}

export default App;

function getMap(state) {
  return state.map;
}
