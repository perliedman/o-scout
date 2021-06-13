import Map from "./MapComponent";
import StartScreen from "./StartScreen";
import Sidebar from "./Sidebar";
import { useMap, useNotifications } from "./store";
import Toolbar from "./Toolbar";
import Alert from "./ui/Alert";

function App() {
  const mapFile = useMap(getMap);
  const { notifications, popNotification } = useNotifications(getNotifications);
  const { type, message, detail } =
    notifications.length > 0 ? notifications[0] : {};

  return (
    <>
      {mapFile ? (
        <>
          <Map mapFile={mapFile} />
          <Sidebar />
          <Toolbar />
        </>
      ) : (
        <StartScreen />
      )}
      {message ? (
        <div className="absolute top-0">
          <div className="z-20">
            <Alert
              type={type}
              message={message}
              detail={detail}
              onClose={popNotification}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;

function getMap(state) {
  return state.mapFile;
}

function getNotifications({ notifications, pop }) {
  return { notifications, popNotification: pop };
}
