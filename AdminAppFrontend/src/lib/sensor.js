class Sensor {
  constructor({ id, name, typeId, minval, maxval }) {
    this.id = id;
    this.name = name;
    this.typeId = typeId;
    this.minval = minval;
    this.maxval = maxval;
  }
}

module.exports = Sensor;
