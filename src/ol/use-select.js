import { Collection } from "ol";
import { useEffect, useMemo } from "react";
import SelectInteraction from "ol/interaction/Select";

export default function useSelect(
  map,
  selectedFeature,
  onSelect,
  selectOptions
) {
  const selection = useMemo(() => new Collection(), []);

  useEffect(() => {
    selection.clear();
    if (selectedFeature) {
      selection.push(selectedFeature);
    }
  }, [selectedFeature, selection]);

  const select = useMemo(
    () => new SelectInteraction({ ...selectOptions, features: selection }),
    [selectOptions, selection]
  );

  useEffect(() => {
    map.addInteraction(select);

    select.on("select", listener);

    return () => {
      map.removeInteraction(select);
      select.un("select", listener);
    };

    function listener(event) {
      onSelect && onSelect(event.selected[0]);
    }
  }, [map, select, onSelect]);
}
