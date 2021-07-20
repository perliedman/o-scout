import React, { useMemo, useState } from "react";
import useEvent, { useMap } from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import FilePicker from "./FilePicker";
import { parsePPen } from "./services/ppen";
import CourseLayer from "./CourseLayer";
import ControlDescriptionSheet from "./ControlDescriptionSheet";

export default function Courses() {
  const {
    eventName,
    courses,
    courseAppearance,
    selectedCourseId,
    setSelected,
    setEvent,
    setEventName,
    setCourseName,
    setControlDescription,
  } = useEvent(getCourses, shallow);
  const mapFile = useMap(getMapFile);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const mapScale = useMemo(() => mapFile.getCrs().scale, [mapFile]);

  const [isSelectingCourse, selectCourse] = useState(false);

  return (
    <>
      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            <button
              onClick={() => setSelected(course.id)}
              className={`focus:outline-none focus:ring-2 rounded p-1 ring-indigo-600 ${
                selectedCourseId === course.id
                  ? "text-indigo-600"
                  : "text-gray-600"
              }`}
            >
              {course.name}
            </button>
            {selectedCourseId === course.id && (
              <div className="my-4">
                <ControlDescriptionSheet
                  eventName={eventName}
                  course={course}
                  mapScale={mapScale}
                  onChangeEventName={setEventName}
                  onChangeCourseName={(name) =>
                    setCourseName(selectedCourseId, name)
                  }
                  onChangeDescription={(controlId, description) =>
                    setControlDescription(controlId, description)
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Dropdown>
          <DropdownItem onClick={selectCourse}>Load courses...</DropdownItem>
        </Dropdown>
      </div>
      <FilePicker
        active={isSelectingCourse}
        accept=".ppen"
        onSelect={loadCourse}
      />
      {selectedCourse && (
        <CourseLayer
          eventName={eventName}
          course={selectedCourse}
          courseAppearance={courseAppearance}
        />
      )}
    </>
  );

  async function loadCourse([file]) {
    selectCourse(false);

    const xmlString = await readAsText(file);
    const event = parsePPen(
      new DOMParser().parseFromString(xmlString, "application/xml")
    );
    setEvent(event);
  }
}

function getCourses({
  name,
  courses,
  courseAppearance,
  selectedCourseId,
  actions: {
    event: { set, setName: setEventName },
    course: { setSelected, setName: setCourseName },
    control: { setDescription: setControlDescription },
  },
}) {
  return {
    eventName: name,
    courses,
    courseAppearance,
    selectedCourseId,
    setSelected,
    setEvent: set,
    setEventName,
    setCourseName,
    setControlDescription,
  };
}

function getMapFile({ mapFile }) {
  return mapFile;
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}
