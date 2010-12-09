var simulation = {}

simulation.prng = null
simulation.bird_length = 18
simulation.bird_wingspan = 25
simulation.bird_viewrange = (simulation.bird_length *
			     simulation.bird_wingspan) / 4
simulation.bird_obstaclerange = 12 * simulation.bird_length
simulation.bird_neighborhood = simulation.bird_viewrange
simulation.bird_separaterange = simulation.bird_neighborhood / 2.5
simulation.debug = false
simulation.effect = {separate : 1, cohesion : 0.75, align : 0.7, wander : 1,
		     avoid : 1}
simulation.population = 0
simulation.flock = null


function Flock()
{
    this.boids = new Array()
    this.obstacles = new Array()

    this.addBoid = function (boid)
    {
	this.boids.push(boid)
	simulation.population++
	document.getElementById("population").value = (
	    simulation.population + " \u2620")
    }

    this.delBoid = function ()
    {
	this.boids.pop()
	simulation.population--
	document.getElementById("population").value = simulation.population +
	    " \u2620"
    }

    this.addObstacle = function(obstacle)
    {
	this.obstacles.push(obstacle)
    }

    this.update = function ()
    {
	var temp
	for (var i = this.boids.length - 1; i >= 0; i--) {
	    this.boids[i].simulate(this.boids, this.obstacles)
	    if (this.boids[i].dead) {
		temp = this.boids[i]
		this.boids[i] = this.boids[this.boids.length - 1]
		this.boids[this.boids.length - 1] = temp
		this.delBoid()
		//console.log("bird died!")
	    }
	}
    }

    this.draw = function (ctx, width, height)
    {
	var i
	var accSpeed = 0
	var speeds = []

	for (i = this.boids.length - 1; i >= 0; i--) {
	    this.boids[i].draw(ctx, width, height)
	    var speed = this.boids[i].vel.mag()
	    speeds.push(speed)
	    accSpeed += speed
	}
	for (i = this.obstacles.length - 1; i >= 0; i--) {
	    this.obstacles[i].draw(ctx)
	}

	/* Statistics. */
	ctx.save()
	ctx.font = "16pt Arial"
	var avgSpeed = accSpeed / this.boids.length
	var speedStd = 0
	for (i = 0; i < speeds.length; i++) {
	    speedStd += (speeds[i] - avgSpeed) * (speeds[i] - avgSpeed)
	}
	speedStd = Math.sqrt(speedStd / speeds.length)

	var height = ctx.canvas.height - ctx.canvas.offsetTop
	var textAvg = "Average speed: " + avgSpeed.toFixed(2) + " p/f"
	var textStd = "Standard deviation: " + speedStd.toFixed(2) + " p/f"
	ctx.fillText(textAvg, 10, height - 10 - 22)
	ctx.fillText(textStd, 10, height - 10)
	ctx.restore()
    }
}

function Obstacle(x, y, rad)
{
    this.x = x
    this.y = y
    this.rad = rad

    this.draw = function (ctx)
    {
	ctx.save()
	ctx.fillStyle = "#ffbb00"
	ctx.beginPath()
	ctx.arc(this.x, this.y, this.rad, 0, 2 * Math.PI, false)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
    }
}


function Boid(canvas, x, y, angle, maxSpeed, maxSteeringForce, viewingAngle)
{
    this.dead = false
    this.pos = new Vector(x, y)
    this.maxSpeed = maxSpeed || 1
    this.speedLimit = 1.5 * this.maxSpeed /* Testing */
    this.maxSteeringForce = maxSteeringForce || 0.065
    if (viewingAngle) {
	this.viewingAngle = viewingAngle * (Math.PI / 180)
    } else {
	this.viewingAngle = 270 * (Math.PI/180) /* 270 degrees */
    }

    //console.log(this.maxSteeringForce, this.maxSpeed)
    this.canvas = canvas

    var angle = angle * (Math.PI / 180)

    /* Velocity */
    this.vel = new Vector(Math.cos(angle), Math.sin(angle))
    /* Acceleration (at each instant) */
    this.acc = new Vector(0, 0)

    this.wandering = false

    this.simulate = function (boids, obstacles) {
	this.flock(boids, obstacles) /* Simulation lives all here. */
	if (this.dead) {
	    return
	}
	this.update()
    }

    this.update = function ()
    {
	if (this.vel.add(this.acc).mag() > 0) {
	    this.vel.iadd(this.acc)
	}
	if (this.vel.mag() > 0) {
	    this.vel.ilimit(this.speedLimit)
	}

	this.pos.x += this.vel.x
	this.pos.y -= this.vel.y /* 0 at top left */
	/* Reset acceleration */
	this.acc.x = 0
	this.acc.y = 0
    }

    this.flock = function (boids, obstacles)
    {
	var avoid = this.avoidObstacles(obstacles)

	if (avoid === null) {
	    this.dead = true
	    return
	}

	this.acc.iadd(avoid.mul(simulation.effect.avoid))
	if (avoid.mag() == 0) {
	    /* Only apply other rules if the boid doesn't need to
	       avoide an obstacle. */
	    var separate = this.separation(boids)
	    var align = this.alignment(boids)
	    var cohesion = this.cohesion(boids)

    	    this.acc.iadd(separate.mul(simulation.effect.separate))
	    this.acc.iadd(align.mul(simulation.effect.align))
	    this.acc.iadd(cohesion.mul(simulation.effect.cohesion))

	    if (this.acc.mag() == 0) {
		/* Only wander if other rules weren't applied or didn't
		   have any effect. */
		this.acc = this.wander().mul(simulation.effect.wander)
		this.wandering = true
	    } else {
		this.wandering = false
	    }
	} else {
	    this.wandering = false
	}
    }

    this.wander = function ()
    {
	/* XXX Experimental. */
	var wanderRad = 17
	var wanderLength = 50

	var direction = this.vel.unit()
	var center = this.pos.add(direction.mul(wanderLength))
	var wanderTheta = -Math.PI/2 + simulation.prng() * Math.PI
	var wanderx = wanderRad * Math.cos(wanderTheta)
	var wandery = wanderRad * Math.sin(-wanderTheta)
	var target = center.add(new Vector(wanderx, wandery))
	return this.seek(target, this.pos)
    }

    this.seek = function (target, pos)
    {
	var e = target.sub(pos)
    	//console.log(e, target, pos)
	var dist = e.mag()
	//console.log(dist, e)
	if (dist > 0) {
	    e = e.unit()
            e.imul(this.maxSpeed)
            return e.sub(this.vel).limit(this.maxSteeringForce)
	}
    	return new Vector(0, 0)
    }


    this.avoidObstacles = function (obstacles)
    {
	var velUnit = this.vel.unit()

	var lookahead = simulation.bird_obstaclerange + simulation.bird_wingspan
	var forward = velUnit.mul(lookahead)
	forward = this.pos.add(new Vector(forward.x, -forward.y))

	var nearest = null
	var force = new Vector(0, 0)

	for (var i = obstacles.length - 1; i >= 0; i--) {
	    var obstacle = obstacles[i]
	    var radius = obstacle.rad + simulation.bird_wingspan/2

	    if (this.pos.euc2d(obstacle) < obstacle.rad) {
		/* Bird hit obstacle, and died :| */
		return null
	    }
	    /* Warning: Not following Javascript canvas notation here. */
	    var theta = Math.atan2(-this.vel.y, this.vel.x)
	    var obst_x = obstacle.x - this.pos.x
	    var obst_y = (this.canvas.height - obstacle.y) - (this.canvas.height - this.pos.y)
	    var obx = obst_x * Math.cos(theta) - obst_y * Math.sin(theta)
	    var oby = obst_x * Math.sin(theta) + obst_y * Math.cos(theta)
	    //console.log([this.pos.x, this.pos.y], [obst_x, obst_y], obx, oby)
	    //console.log(obx)
	    if (obx < lookahead && obx > 0) {
		if (Math.abs(oby) < obstacle.rad + simulation.bird_wingspan/2) {
		    if (nearest !== null && obx - obstacle.rad >= nearest) {
			continue;
		    }
		    //console.log("hit")

		    nearest = obx - obstacle.rad
		    var e = (radius - Math.abs(oby))/radius
		    var n = velUnit
		    if (oby > 0) {
			n = new Vector(n.y, -n.x)
		    } else {
			n = new Vector(-n.y, n.x)
		    }
		    e *= this.maxSpeed
		    force = n.mul(e)

		    var dist = Math.sqrt(obx * obx + oby * oby)

		    //console.log(this.vel)
		    //console.log(dist, radius)
		    //console.log(obstacle.rad)
		    if (dist > radius + simulation.bird_wingspan/2) {
			force.ilimit(this.maxSteeringForce)
		    }
		}
	    }
	}

	//	console.log(force, this.vel)
	return force
    }


    this.inBoidViewRange = function (other) {
	var theta = Math.atan2(-this.vel.y, this.vel.x)
	var obst_x = other.pos.x - this.pos.x
	var obst_y = (this.canvas.height - other.pos.y) - (this.canvas.height - this.pos.y)
	var obx = obst_x * Math.cos(theta) - obst_y * Math.sin(theta)
	var oby = obst_x * Math.sin(theta) + obst_y * Math.cos(theta)

	var a = Math.atan2(-oby, obx)

	var min = -this.viewingAngle/2
	var max = +this.viewingAngle/2
	return (a < max && a > min)
    }

    /* Rule 1. Collision Avoidance: avoid collision with nearby flockmates. */
    this.separation = function (boids)
    {
	var sepRange = simulation.bird_separaterange
	var steer = new Vector(0, 0)
	var diff = new Vector(0, 0)
	var count = 0

	for (var i = boids.length - 1; i >= 0; i--) {
	    var other = boids[i]
	    if (this == other) {
		continue
	    }

	    var d = this.pos.euc2d(other.pos)
	    if (d < sepRange && this.inBoidViewRange(other)) {
		diff = this.pos.sub(other.pos)
		diff = diff.unit().div(d)
		steer.iadd(diff)
		count++
	    }
	}
	if (count > 0) {
	    steer.idiv(count)
	    steer.ilimit(this.maxSteeringForce)
	}

	return steer
    }

    /* Rule 2. Velocity Matching: attempt to match velocity with nearby
       flockmates. */
    this.alignment = function (boids)
    {
	var neighborDist = simulation.bird_neighborhood
	var steer = new Vector(0, 0)
	var count = 0

	for (var i = boids.length - 1; i >= 0; i--) {
	    var other = boids[i]
	    if (other == this) {
		continue
	    }

	    var d = this.pos.euc2d(other.pos)
	    if (d < neighborDist && this.inBoidViewRange(other)) {
		steer.iadd(other.vel)
		count++
	    }
	}

	if (count > 0) {
	    steer.idiv(count)
	    steer.ilimit(this.maxSteeringForce)
	}
	return steer
    }

    /* Rule 3. Flock Centering: attempt to stay close to nearby flockmates. */
    this.cohesion = function (boids)
    {
	var neighborDist = simulation.bird_neighborhood
	var mass = new Vector(0, 0)
	var count = 0

	for (var i = boids.length - 1; i >= 0; i--) {
	    var other = boids[i]
	    if (this == other) {
		continue
	    }

	    var d = this.pos.euc2d(other.pos)
	    if (d < neighborDist && this.inBoidViewRange(other)) {
		mass.iadd(other.pos)
		count++
	    }
	}

	if (count > 0) {
	    mass.idiv(count) /* Centre of mass */
	    mass.ilimit(this.maxSteeringForce)
	}
	return mass
    }


    this.draw = function (ctx, width, height)
    {
	if (this.dead) {
	    return
	}

	/* Wrap around the available space. */
	if (this.pos.x < 0) this.pos.x = width
	if (this.pos.x > width) this.pos.x = 0
	if (this.pos.y < 0) this.pos.y = height
	if (this.pos.y > height) this.pos.y = 0

	var theta = Math.atan2(-this.vel.y, this.vel.x)

    	ctx.save()

    	ctx.translate(this.pos.x, this.pos.y)
	ctx.rotate(theta)

	/* Draw bird. */
    	ctx.beginPath()

	/* Bico */
	ctx.moveTo(1, -simulation.bird_wingspan / 6.666)
	ctx.lineTo(simulation.bird_length / 2 - 1, 0)
	ctx.lineTo(1, simulation.bird_wingspan / 6.666)

	//ctx.moveTo(0, 0) // Fica mais legal o stroke
	//ctx.moveTo(3, 0)
	/* Asa direita */
	ctx.lineTo(simulation.bird_wingspan/10, simulation.bird_wingspan/10)
	ctx.lineTo(simulation.bird_wingspan/5, simulation.bird_wingspan/5)
	ctx.lineTo(0, simulation.bird_wingspan/2)
	ctx.lineTo(-simulation.bird_length/18, simulation.bird_wingspan/2.222)
	ctx.lineTo(simulation.bird_length/36, simulation.bird_wingspan/4)
	ctx.lineTo(0, simulation.bird_wingspan/10)

	/* Cauda */
	var xx = simulation.bird_length/72
	ctx.lineTo(-simulation.bird_length/4, xx)
	ctx.lineTo(-simulation.bird_length/3, xx)
	ctx.lineTo(-simulation.bird_length/2, simulation.bird_length/6)
	ctx.lineTo(-simulation.bird_length/2, -simulation.bird_length/6)
	ctx.lineTo(-simulation.bird_length/3, -xx)
	ctx.lineTo(-simulation.bird_length/4, -xx)

	ctx.lineTo(0, -simulation.bird_wingspan/10)

	/* Asa esquerda */
	ctx.lineTo(simulation.bird_length/36, -simulation.bird_wingspan/4)
	ctx.lineTo(-simulation.bird_length/18, -simulation.bird_wingspan/2.222)
	ctx.lineTo(0, -simulation.bird_wingspan/2)
	ctx.lineTo(simulation.bird_wingspan/5, -simulation.bird_wingspan/5)
	ctx.lineTo(simulation.bird_wingspan/10, -simulation.bird_wingspan/10)


    	ctx.closePath()
	ctx.fill()

	/* Draw "debugging" arc for bird view. */
	if (simulation.debug) {
	    if (this.wandering === true) {
		ctx.strokeStyle = "#ccc"
	    } else {
		ctx.styokeStyle = "white"
	    }
	    ctx.moveTo(0, 0)
	    //ctx.arc(0, 0, simulation.bird_neighborhood, 0, 2 * Math.PI, false)
	    ctx.arc(0, 0, simulation.bird_neighborhood,
		    -this.viewingAngle/2, this.viewingAngle/2, false)
	    ctx.lineTo(0, 0)
	    ctx.arc(0, 0, simulation.bird_separaterange,
		    -this.viewingAngle/2, this.viewingAngle/2, false)
	    if (simulation.debug == 2) {
		/* Obstacle avoidance "cone". */
		ctx.rect(-simulation.bird_length/2,
			 -simulation.bird_wingspan/2,
			 simulation.bird_length, simulation.bird_wingspan)
		ctx.rect(-simulation.bird_length/2,
			 -simulation.bird_wingspan/2,
			 simulation.bird_obstaclerange +
			 simulation.bird_length/2,
			 simulation.bird_wingspan)
		ctx.moveTo(0, 0)
		ctx.lineTo(simulation.bird_obstaclerange, 0)
		//ctx.strokeStyle = "red"
		//ctx.stroke()
	    }
	    ctx.stroke()
	}

	ctx.restore()
    }
}

simulation.updateEffect = function (value)
{
    var effect = document.getElementById("effect")
    simulation.effect[effect.value] = value / 100
    document.getElementById("rangeText").innerHTML = value
}

simulation.updateEffectView = function (effect)
{
    var value = simulation.effect[effect] * 100
    if (isNaN(value))
	return
    document.getElementById("rangeInput").value = value
    document.getElementById("rangeText").innerHTML = value
}

simulation.killBird = function ()
{
    if (simulation.population > 0) {
	simulation.flock.delBoid()
    }
}

simulation.updateDebug = function ()
{
    simulation.debug = document.getElementById("debug").selectedIndex
}

simulation.init = function ()
{
    var canvas = document.getElementById("main")
    var ctx = canvas.getContext("2d")

    /* Set a seed for the PRNG */
    //var seed = 0
    simulation.prng = new MRG32k3a()//seed)
    simulation.fps = new FPS()

    document.body.style.overflow = "hidden"

    document.addEventListener("click", addObject, false)
    window.addEventListener("resize", adjustAndRedraw, false);

    document.getElementById("rangeText").innerHTML = 100 *
	simulation.effect.separate
    document.getElementById("rangeInput").value = 100 *
	simulation.effect.separate

    simulation.flock = new Flock()

    adjustAndRedraw()

    /* 30 FPS */
    var fps = 30
    window.setInterval(update, 1000 / fps)


    var initialPop = 50
    for (var i = 0; i < initialPop; i++) {
	var boid = new Boid(canvas, canvas.width * 0.5, canvas.height * 0.5,
			    simulation.prng() * 360,
			    2.8)
	simulation.flock.addBoid(boid)
    }


    function update() {
	simulation.flock.update()
	redraw()

	var fps = simulation.fps.get_fps()
	ctx.fillText(fps, 5, 15)
    }

    function redraw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	ctx.fillStyle = "#f6f6f6"
    	ctx.strokeStyle = "#aecbf6"
	simulation.flock.draw(ctx, canvas.width, canvas.height)
    }

    function addObject(evt) {
	var x = evt.clientX
	var y = evt.clientY - canvas.offsetTop

	if (y <= 1)
	    return

	var selection = document.getElementById("object").selectedIndex

	if (selection == 1) {
	    var obstacle = new Obstacle(x, y, Math.random() * 50 + 10)
	    simulation.flock.addObstacle(obstacle)
	} else {
	    var boid = new Boid(canvas, x, y, simulation.prng() * 360, 2.8)
    	    simulation.flock.addBoid(boid)
	}
    }

    function adjustAndRedraw() {
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight
	redraw()
    }
}

window.onload = simulation.init
