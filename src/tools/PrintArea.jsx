import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect, useMemo, useRef } from "react";
import {
  fromProjectedCoord,
  toProjectedCoord,
  transformExtent,
} from "../services/coordinates";
import useEvent, { useMap } from "../store";
import shallow from "zustand/shallow";
import ExtentInteraction from "../ol/ExtentInteraction";
import { getPrintAreaExtent } from "../models/course";
import { printCourse } from "../services/print";

import Feature from 'ol/Feature.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Vector as VectorSource} from 'ol/source.js';
import {fromExtent} from 'ol/geom/Polygon.js';

export default function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse, shallow);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);


  useEffect(() => {
    if (map && course) {
      const initialExtent = transformExtent(
        getPrintAreaExtent(course, crs.scale),
        (c) => toProjectedCoord(crs, c)
      );
      
      const PrintAreaExtentI = getPrintAreaExtent(course)
      const check_height = (course.printArea.pageHeight/3.937)-((PrintAreaExtentI[3]-PrintAreaExtentI[1])*(15000/course.printScale))
      const check_width = (course.printArea.pageWidth/3.937)-((PrintAreaExtentI[2]-PrintAreaExtentI[0])*(15000/course.printScale))
    

      let boxStyle;
      
      if (check_height < 0 || check_width < 0) {
        boxStyle = new Style({
          stroke: new Stroke({ color: "#FF0000", lineDash: [6, 10], width: 3 }),
          fill: null,
        });
      } else {
        boxStyle = new Style({
          stroke: new Stroke({ color: "#444", lineDash: [6, 10], width: 3 }),
          fill: null,
        });
      }
      
      const interaction = new ExtentInteraction({
        extent: initialExtent,
        boxStyle,
        pointerStyle: new Style(),
      });

      const rectCoords = []

      
      //Papersize on map. 15000 mapscale??
      rectCoords[0] = initialExtent[0] 
      rectCoords[1] = initialExtent[1] 
      rectCoords[2] = initialExtent[0]+((course.printArea.pageWidth)*(course.printScale/15000)*(96*(1/25.4)))
      rectCoords[3] = initialExtent[1]+((course.printArea.pageHeight)*(course.printScale/15000)*(96*(1/25.4)))
  

      const printLayer = new VectorLayer({
        source: new VectorSource({
          features: [
            new Feature(
              fromExtent(rectCoords),
            ),
          ],
        }),
      });
      

  
      interaction.on("extentchangeend", ({ extent }) => {
        
        if (extent) {
          setPrintAreaExtent(
            course.id,
            transformExtent(extent, (c) => fromProjectedCoord(crs, c))
          );
         
          
        }
      });
      map.addInteraction(interaction);
      map.addLayer(printLayer);

      return () => {
        map.removeInteraction(interaction);
        map.removeLayer(printLayer);
      };
    }
  }, [crs, mapFile, map, course, setPrintAreaExtent]);

  return null;
}



function getMap({ map, mapFile }) {
  return { map, mapFile };
}

function getSelectedCourse({
  courses,
  selectedCourseId,
  actions: {
    course: { setPrintAreaExtent },
  },
}) {
  return {
    course: courses.find(({ id }) => id === selectedCourseId),
    setPrintAreaExtent,
  };
}
