function FPS() {
}

FPS.prototype.fps = 0
FPS.prototype.time_lastframe = new Date()
FPS.prototype.time_deltasec = 0.1
FPS.prototype.curr_second = 0
FPS.prototype.frames_this_second = 0
FPS.prototype.timedelta_lastframe = 0

FPS.prototype.get_fps = function ()
{
    var update
    var now = new Date()

    this.timedelta_lastframe = 0.001
    if (this.time_lastframe) {
	this.timedelta_lastrame = now - this.time_lastframe
    }
    this.time_deltasec = this.timedelta_lastframe / 1000
    this.time_lastframe = now

    /* Calculate frame rate since last time this was called. */
    if (now.getSeconds() == this.curr_second) {
	this.frames_this_second++
    } else {
	this.curr_second = now.getSeconds()
	this.fps = this.frames_this_second
	this.frames_this_second = 1
    }

    return this.fps
}
