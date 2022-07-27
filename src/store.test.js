import { renderHook, act } from "@testing-library/react-hooks";
import { ALL_CONTROLS_ID, getAllControls } from "./models/event";
import useEvent, { Mode } from "./store";

describe("store", () => {
  test("can set name", () => {
    const { result } = renderHook(() => useEvent());
    act(() => {
      result.current.actions.event.setName("krfsm");
    });
    expect(result.current.name).toBe("krfsm");
  });
  test("can undo", () => {
    const { result } = renderHook(() => useEvent());
    const originalName = result.current.name;
    act(() => {
      result.current.actions.event.setName("krfsm");
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.name).toBe(originalName);
  });

  test("can redo", () => {
    const { result } = renderHook(() => useEvent());
    act(() => {
      result.current.actions.event.setName("krfsm");
    });

    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.name).toBe("krfsm");
  });

  test("undo past start of history is no-op", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.undo();
      });
    }
  });

  test("redo past end of history is no-op", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.redo();
      });
    }
  });

  test("history is 40 steps", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.actions.event.setName(i.toString());
      });
    }
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.undo();
      });
    }
    expect(result.current.name).toBe("9");
  });

  test("can set control description", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.addControl(
        { kind: "normal", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );

    const controlId = Math.max(...Object.keys(result.current.controls));

    act(() =>
      result.current.actions.control.setDescription(controlId, { all: "14.03" })
    );

    expect(result.current.controls[controlId].description.all).toBe("14.03");
    expect(result.current.courses[0].controls[0].description.all).toBe("14.03");
  });

  test("can undo set control description", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.addControl(
        { kind: "normal", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );

    const controlId = Math.max(...Object.keys(result.current.controls));

    act(() =>
      result.current.actions.control.setDescription(controlId, { all: "14.03" })
    );

    act(() => result.current.undo());

    expect(result.current.controls[controlId].description?.all).toBeFalsy();
    expect(
      result.current.courses[0].controls[
        result.current.courses[0].controls.length - 1
      ].description.all
    ).toBeFalsy();
  });

  test("setting map sets print scale for course without controls", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.setMap(
        { getCrs: () => ({ scale: 4000 }) },
        "olle.ocd"
      )
    );

    result.current.courses.forEach((course) =>
      expect(course.printScale).toBe(4000)
    );
  });

  test("setting map leaves print scale for course with controls", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.addControl(
        { kind: "normal", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );

    act(() =>
      result.current.actions.event.setMap(
        { getCrs: () => ({ scale: 4000 }) },
        "olle.ocd"
      )
    );

    expect(result.current.courses[0].printScale).toBe(15000);
  });

  test("setting map sets event's map name", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.setMap(
        { getCrs: () => ({ scale: 4000 }) },
        "olle.ocd"
      )
    );

    expect(result.current.mapFilename).toBe("olle.ocd");
  });

  test("creating a new event sets event's map name to current map", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.setMap(
        { getCrs: () => ({ scale: 4000 }) },
        "olle.ocd"
      )
    );
    act(() => result.current.actions.event.newEvent());

    expect(result.current.mapFilename).toBe("olle.ocd");
  });

  test("creating a new event resets the selected course", () => {
    const { result } = renderHook(() => useEvent());
    act(() => result.current.actions.course.setSelected(9999));
    act(() => result.current.actions.event.newEvent());

    expect(result.current.selectedCourseId).toBe(result.current.courses[0].id);
  });

  test("creating a new event sets mode to create", () => {
    const { result } = renderHook(() => useEvent());
    act(() => result.current.actions.course.setSelected(9999));
    act(() => result.current.actions.event.newEvent());

    expect(result.current.mode).toBe(Mode.CreateCourse);
  });

  test("adding a finish switches mode to edit", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.addControl(
        { kind: "finish", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );

    expect(result.current.mode).toBe(Mode.EditControls);
  });

  test("selecting a course with a finish switches mode to edit", () => {
    const { result } = renderHook(() => useEvent());
    const initialCourseId = result.current.selectedCourseId;
    act(() =>
      result.current.actions.course.new({
        name: "My new course",
        id: 1234,
        controls: [],
      })
    );
    act(() =>
      result.current.actions.event.addControl(
        { kind: "finish", coordinates: [0, 0] },
        initialCourseId
      )
    );
    act(() => result.current.actions.course.setSelected(initialCourseId));

    expect(result.current.mode).toBe(Mode.EditControls);
  });

  test("adding a control gives it a code in sequence", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.event.addControl(
        { kind: "normal", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );

    const firstCode =
      result.current.controls[Object.keys(result.current.controls)[0]].code;

    act(() =>
      result.current.actions.event.addControl(
        { kind: "normal", coordinates: [0, 0] },
        result.current.courses[0].id
      )
    );
    expect(
      Object.keys(result.current.controls)
        .map((id) => result.current.controls[id].code)
        .sort()
    ).toEqual([firstCode, firstCode + 1]);
  });

  test("can set all controls print scale", () => {
    const { result } = renderHook(() => useEvent());
    act(() =>
      result.current.actions.course.setPrintScale(ALL_CONTROLS_ID, 4500)
    );

    expect(getAllControls(result.current).printScale).toBe(4500);
  });

  test("setting print scale of a course with same print scale as all controls, also updates all controls print scale", () => {
    const { result } = renderHook(() => useEvent());
    const courseId = result.current.selectedCourseId;
    act(() => result.current.actions.course.setPrintScale(courseId, 4500));

    expect(getAllControls(result.current).printScale).toBe(4500);
  });
});
