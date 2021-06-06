import React, { useState } from "react";
import useEvent from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import FilePicker from "./FilePicker";
import { parsePPen } from "./services/ppen";

export default function Courses() {
  const { courses, selectedCourseId, setSelected, setName, setEvent } =
    useEvent(getCourses, shallow);

  const [isSelectingCourse, selectCourse] = useState(false);

  return (
    <>
      <ul>
        {courses.map((course) => (
          <li key={course.id} onClick={() => setSelected(course.id)}>
            <span
              className={
                selectedCourseId === course.id
                  ? "text-indigo-600"
                  : "text-gray-darkest"
              }
            >
              {selectedCourseId === course.id ? (
                <input
                  type="text"
                  value={course.name}
                  onChange={(e) => setName(selectedCourseId, e.target.value)}
                />
              ) : (
                course.name
              )}
            </span>
          </li>
        ))}
      </ul>
      <Dropdown>
        <DropdownItem onClick={selectCourse}>Load courses...</DropdownItem>
      </Dropdown>
      <FilePicker
        active={isSelectingCourse}
        accept=".ppen"
        onSelect={loadCourse}
      />
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
  courses,
  selectedCourseId,
  actions: {
    event: { set },
    course: { setSelected, setName },
  },
}) {
  return { courses, selectedCourseId, setSelected, setName, setEvent: set };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}
