export default class Coordinate {
  constructor (x, y) {
    if (Array.isArray(x) && x.length === 2) {
      this[0] = x[0]
      this[1] = x[1]
    } else {
      this[0] = x
      this[1] = y
    }
  }

  vLength () {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1])
  }

  add (c1) {
    return new Coordinate(this[0] + c1[0], this[1] + c1[1])
  }

  sub (c1) {
    return new Coordinate(this[0] - c1[0], this[1] - c1[1])
  }

  mul (c) {
    return new Coordinate(this[0] * c, this[1] * c)
  }

  rotate (theta) {
    return new Coordinate(
      this[0] * Math.cos(theta) - this[1] * Math.sin(theta),
      this[0] * Math.sin(theta) + this[1] * Math.cos(theta))
  }

  toArray () {
    return [this[0], this[1]]
  }
}
