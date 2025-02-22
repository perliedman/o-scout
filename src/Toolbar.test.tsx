import { render, screen } from "@testing-library/react";
import Toolbar from "./Toolbar";
import "@testing-library/jest-dom";
import "ol/style/RegularShape";
import * as Event from "./models/event";
import * as Course from "./models/course";
import * as Control from "./models/control";
// eslint-disable-next-line jest/no-mocks-import
import { stores } from "./__mocks__/zustand";
import { vi, describe, expect, test } from "vitest";

vi.mock("ol/style/RegularShape");
vi.mock("ol/layer.js");

describe.skip("Toolbar", () => {
  test("Uses create mode in initial state", () => {
    render(<Toolbar />);

    const activeMode = screen.getAllByRole("switch", { checked: true })[0];
    expect(activeMode).toBeInTheDocument();
    expect(activeMode.innerHTML).toBe("Create");
  });
  test("Uses create mode if a course with controls but without finish is selected", () => {
    const event = Event.create("event");
    const course = Course.create(
      1,
      "My Course",
      [Control.create({ id: 1, kind: "start", code: 31, coordinates: [0, 0] })],
      15000,
      "normal"
    );
    Event.addCourse(event, course);

    stores[1].setState(event);

    render(<Toolbar />);

    const activeMode = screen.getAllByRole("switch", { checked: true })[0];
    expect(activeMode).toBeInTheDocument();
    expect(activeMode.innerHTML).toBe("Create");
  });

  test("Uses edit mode if a course with controls with finish is selected", () => {
    const event = Event.create("event");
    const course = Course.create(
      1,
      "My Course",
      [
        Control.create({ id: 1, kind: "start", code: 31, coordinates: [0, 0] }),
        Control.create({
          id: 2,
          kind: "finish",
          code: 100,
          coordinates: [0, 0],
        }),
      ],
      15000,
      "normal"
    );
    Event.addCourse(event, course);

    stores[1].setState(event);

    render(<Toolbar />);

    const activeMode = screen.getAllByRole("switch", { checked: true })[0];
    expect(activeMode).toBeInTheDocument();
    expect(activeMode.innerHTML).toBe("Edit");
  });
});
