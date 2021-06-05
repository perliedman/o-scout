import Coordinate from "./coordinate";
import Control from "./control";

export default class Event {
  constructor (name, courses) {
    this.name = name
    this.courses = courses || []
    this.controlCodeGenerator = sequence(30)
    this.idGenerator = sequence(1)
    this.map = {
      scale: 15000
    }
    this.controls = {}
    this.controlList = []
  }

  addCourse (course) {
    course.controls.forEach(c => {
      if (!this.controls[c.id]) {
        this.controls[c.id] = c
        this.controlList.push(c)
      }
    })
    this.courses.push(course)
  }

  addControl ({ kind, coordinates, description }) {
    const id = this.idGenerator.next()
    this.controls[id] = new Control(
      id,
      kind,
      kind !== 'start' && kind !== 'finish' ? this.controlCodeGenerator.next() : null,
      coordinates,
      description)
    this.controlList.push(this.controls[id])
  }

  deleteControl (id) {
    if (this.controls[id]) {
      this.courses.forEach(c => c.removeControl(id))

      const index = this.controlList.findIndex(c => c.id === id)
      delete this.controls[id]
      this.controlList.splice(index, 1)
    }
  }

  moveControl ({ id, coordinates }) {
    const control = this.controls[id]
    control.coordinates = new Coordinate(coordinates)
  }

  setControlDescription (controlId, kind, descriptionId) {
    const control = this.controls[controlId]
    control.description[kind] = descriptionId
  }
}

const sequence = start => (() => {
  let s = start - 1
  return {
    next: () => ++s,
    current: () => s
  }
})()
