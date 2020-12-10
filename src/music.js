/**
 * Module for dealing with music and sound
 */
export const Music = {

  /**
    * use this to play a sound/music
    * track_id must be in the form '#track_id'
    * track ids can be found in index.html
    * the "loop" parameter can be set to true if you want the sound to keep looping
    *
    * use the volume parameter to change the volume, from 0.001 to 1.0!
    *
    * if you want to add an audiofile, add it to assets/music and make a line
    * for it in index.html like the following:
    * <audio src="assets/music/yourfile.extension" id="yourID"></audio>
    * */
  playTrack(trackId, volume, loop) {
    const song = document.querySelector(trackId);
    if (volume) {
      song.volume = volume;
    }
    // check whether to loop the track
    if (loop) {
      song.loop = true;
    } else {
      song.loop = false;
    }
    // plays the selected track
    return song.play();
  },
  /**
    * this function can be used to stop any sound or music track
    */
  stopTrack(trackId) {
    const song = document.querySelector(trackId);
    return song.pause();
  },
};
