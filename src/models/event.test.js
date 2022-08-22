import * as Event from "./event";
import * as Course from "./course";
import * as Control from "./control";

describe("event", () => {
  test("load empty event", () => {
    const event = Event.create("Test", []);

    // Simulate dehydrated state
    delete event.idGenerator;
    delete event.controlCodeGenerator;

    const loadedEvent = Event.load(event);

    expect(loadedEvent.idGenerator.next()).toBe(1);
    expect(loadedEvent.controlCodeGenerator.next()).toBe(30);
  });

  test("load event with controls", () => {
    const event = Event.create("Test");
    Event.addCourse(
      event,
      Course.create(null, "Test course", [
        Control.create({
          id: event.idGenerator.next(),
          code: event.controlCodeGenerator.next(),
          kind: "normal",
          coordinates: [0, 0],
        }),
      ])
    );

    // Simulate dehydrated state
    delete event.idGenerator;
    delete event.controlCodeGenerator;

    const loadedEvent = Event.load(event);

    expect(loadedEvent.idGenerator.next()).toBe(3);
    expect(loadedEvent.controlCodeGenerator.next()).toBe(31);
  });

  test("Modifying a control's code updates the code generator", () => {
    const event = Event.create("Test");
    const control = Control.create({
      code: event.controlCodeGenerator.next(),
      kind: "normal",
      coordinates: [0, 0],
    });
    Event.addCourse(event, Course.create(null, "Test course", [control]));

    Event.updateControl(event, control.id, (control) => {
      control.code = 37;
    });
    expect(event.controlCodeGenerator.next()).toBe(38);
  });
});
