function Vector(x, y) {
    this.x = x
    this.y = y
}

Vector.prototype = {
    div: function (num) { return new Vector(this.x / num, this.y / num) },
    idiv: function (num) { this.x /= num; this.y /= num },
    mul: function (k) { return new Vector(this.x * k, this.y * k) },
    imul: function (k) { this.x *= k; this.y *= k },
    limit: function (max) {
	if (this.mag() > max) {
	    var unit = this.unit()
	    return new Vector(unit.x * max, unit.y * max)
	}
	return this
    },
    ilimit: function (max) {
	if (this.mag() > max) {
	    var unit = this.unit()
	    this.x = unit.x * max
	    this.y = unit.y * max
	}
    },

    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y) },
    unit: function () {
	var mag = this.mag()
	return new Vector(this.x / mag, this.y / mag)
    },

    add: function (v2) { return new Vector(this.x + v2.x, this.y + v2.y) },
    iadd: function (v2) { this.x += v2.x; this.y += v2.y },
    sub: function (v2) { return new Vector(this.x - v2.x, this.y - v2.y) },
    isub: function (v2) { this.y -= v2.x; this.y -= v2.y },

    /* XXX Unused. */
    dot: function (v2) { return (this.x * v2.x + this.y * v2.y) },

    euc2d: function (dest) {
	return Math.sqrt((this.x - dest.x) * (this.x - dest.x) +
			 (this.y - dest.y) * (this.y - dest.y))
    }
}
