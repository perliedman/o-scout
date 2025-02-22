import {
  screen,
  fireEvent,
  render,
  getAllByRole,
  findAllByRole,
} from "@testing-library/react";
import CourseOptions from "./CourseOptions";
import { PAPER_SIZES } from "./services/print";
import { describe, expect, test } from "vitest";

describe("CourseOptions", () => {
  test("Renders selected paper size's name", async () => {
    const printArea = {
      pageWidth: 827,
      pageHeight: 1169,
    };
    render(
      <CourseOptions
        mapScale={15000}
        course={{ printScale: 7500, printArea: printArea, controls: [] }}
        setPrintArea={() => {}}
        setPrintScale={() => {}}
      />
    );
    const paperSizeSelect = screen.getByRole("combobox");
    const options = Array.from(getAllByRole(paperSizeSelect, "option"));
    expect(options.length).toBe(PAPER_SIZES.length);
    expect(
      options
        .filter((option) => option.text === "A4")
        .every((option) => option.selected)
    ).toBeTruthy();
    expect(
      options
        .filter((option) => option.text !== "A4")
        .every((option) => !option.selected)
    ).toBeTruthy();
  });
  test("Updates selected paper size's name", async () => {
    const course = {
      printScale: 7500,
      printArea: {
        pageWidth: 827,
        pageHeight: 1169,
      },
      controls: [],
    };
    const { rerender } = render(
      <CourseOptions
        mapScale={15000}
        course={course}
        setPrintArea={(props) => {
          course.printArea = { ...course.printArea, ...props };
        }}
      />
    );
    const paperSizeSelect = screen.getByRole("combobox");

    fireEvent.change(paperSizeSelect, {
      target: { value: PAPER_SIZES.findIndex(({ name }) => name === "Letter") },
    });

    rerender(
      <CourseOptions mapScale={15000} course={course} setPrintArea={() => {}} />
    );

    const options = Array.from(await findAllByRole(paperSizeSelect, "option"));
    expect(options.length).toBe(PAPER_SIZES.length);
    expect(
      options
        .filter((option) => option.text === "Letter")
        .every((option) => option.selected)
    ).toBeTruthy();
    expect(
      options
        .filter((option) => option.text !== "Letter")
        .every((option) => !option.selected)
    ).toBeTruthy();
  });
});
