export const Time = {

  // formats time from seconds into hours, minutes and seconds
  formatTime(time) {
    const hrs = Math.floor(time / 60 / 60);
    const mins = Math.floor((time / 60) % 60);
    const secs = Math.floor(time % 60);

    let ret = '';
    if (hrs > 0) {
      ret += `${hrs}:${mins < 10 ? '0' : ''}`;
    }
    ret += `${mins}:${secs < 10 ? '0' : ''}`;
    ret += `${secs}`;
    return ret;
  },

  // starts counting up from the set parameter
  ingameTime(seconds) {
    let time = seconds;
    document.getElementById('ingameTime').innerHTML = this.formatTime(time);
    time++;
    setInterval(() => {
      document.getElementById('ingameTime').innerHTML = this.formatTime(time);
      time++;
    }, 1000);
  },

  // creates a timer that counts from parameter to zero
  setTimer(seconds) {
    // Checks whether parameter is positive, if not, clears the timer.
    if (seconds <= 0) {
      document.getElementById('timer').style.visibility = 'hidden';
      document.getElementById('timer').innerHTML = '';
      return;
    }
    let time = seconds;
    document.getElementById('timer').innerHTML = this.formatTime(time);
    document.getElementById('timer').style.visibility = 'visible';
    time--;

    const timer = setInterval(() => {
      // if timer runs out, this function returns a 1
      if (time <= 0) {
        clearInterval(timer);
        document.getElementById('timer').style.visibility = 'hidden';
        document.getElementById('timer').innerHTML = '';
      } else { // if timer didnt run out, decrease time by 1 second
        document.getElementById('timer').innerHTML = this.formatTime(time);
        time--;
      }
      // the interval in which the time gets updated (1000 = 1 second)
    }, 1000);
  },
};
