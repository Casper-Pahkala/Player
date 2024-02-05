<template>
  <div
    class="main-container"
  >
    <div
      class="video-container bg-grey-darken-4"
    >
      <video
        id="main-player"
        v-show="store.currentVideo.url"
        :key="store.currentVideo.url"
        ref="videoElement"
        @loadedmetadata="getVideoDuration"
        @timeupdate="getCurrentTime"
      >
        <source :src="store.currentVideo.url" type="video/mp4">
        Your browser does not support the video tag.
      </video>

      <div class="play-container" v-if="!store.pressedPlay">
        <v-btn
          color="grey-darken-4"
          size="x-large"
          icon="mdi-play"
          @click="play()"
          elevation="10"
        >
        </v-btn>
      </div>

      <div v-show="!store.currentVideo.url" class="no-video-container">
        <!-- Mitään ei pyöri -->
      </div>

    </div>

    <div class="sidebar">
      <div class="current-video">
        <div class="name">
          {{ store.currentVideo.name }}
        </div>
        <div class="time">
          <div>
            {{ secondsToMinutesString(currentVideo.time) }}
          </div>
          <div>
            {{ secondsToMinutesString(currentVideo.duration) }}
          </div>
        </div>
        <v-slider
          id="time-slider"
          min="0"
          thumb-size="0"
          v-model="currentVideo.time"
          :max="currentVideo.duration"
          @update:modelValue="changeTime"
        ></v-slider>

        <v-slider
          v-if="admin"
          id="time-slider"
          min="0"
          thumb-size="0"
          v-model="currentVideo.time"
          :max="currentVideo.duration"
          @update:modelValue="changeAdminTime()"
        ></v-slider>
      </div>
      <div class="action-btns">
        <v-btn
          color="grey-darken-3"
          icon="mdi-skip-previous"
          @click="store.skipPrevious"
        >
        </v-btn>

        <v-btn
          color="grey-darken-3"
          :icon="store.currentVideo.playing ? 'mdi-pause' : 'mdi-play'"
          @click="playOrPauseVideo"
        >
        </v-btn>

        <v-btn
          color="grey-darken-3"
          icon="mdi-skip-next"
          @click="skip()"
        >
        </v-btn>
      </div>

      <div>
        <v-slider
          v-model="volume"
          thumb-label
          min="0"
          max="100"
          :prepend-icon="volumeIcon()"
          @update:modelValue="changeVolume"
        ></v-slider>
      </div>

      <div style="height: 60px;">
        <v-tabs
          v-model="tab"
        >
          <v-tab value="queue" class="tab">Jono</v-tab>
          <v-tab value="all" class="tab">Kaikki</v-tab>
        </v-tabs>
      </div>

      <div  class="window">

        <v-window v-model="tab">
          <v-window-item value="queue">
            <div class="queue">
              <div
                v-for="video in store.queue"
                :key="video.id"
              >
                <div class="video-listing">
                  <div class="name">
                    {{ video.name }}
                    <v-tooltip
                      activator="parent"
                      location="top"
                    >{{ video.name }}</v-tooltip>
                  </div>
                </div>

                <v-divider></v-divider>
              </div>

              <div v-if="store.queue.length <= 0" class="empty">
                Jono tyhjä
              </div>
            </div>
          </v-window-item>

          <v-window-item value="all">
            <div class="all-videos">
              <div
                v-for="video in store.allVideos"
                :key="video.id"
              >
                <div class="video-listing">
                  <div class="name-wrapper" :style="admin ? 'width: calc(100% - 150px);' : ''">
                    <div class="name">
                      {{ video.name }}
                      <v-tooltip
                        activator="parent"
                        location="top"
                      >{{ video.name }}</v-tooltip>
                    </div>
                  </div>

                  <v-btn
                    class="play-btn"
                    icon="mdi-play"
                    color="grey-darken-3"
                    @click="playVideo(video.file_name)"
                  >
                  </v-btn>

                  <v-btn
                    class="queue-btn"
                    icon="mdi-playlist-plus"
                    color="grey-darken-3"
                    @click="queueVideo(video.file_name)"
                  >
                  </v-btn>
                  <v-btn
                  v-if="admin"
                    class="queue-btn"
                    icon="mdi-delete"
                    color="grey-darken-3"
                    @click="store.deleteVideo(video.file_name)"
                  >
                  </v-btn>
                </div>

                <v-divider></v-divider>
              </div>

              <div v-if="!store.allVideos || store.allVideos.length <= 0" class="empty">
                Lista tyhjä
              </div>
            </div>
          </v-window-item>
        </v-window>
      </div>

      <v-btn
        color="primary"
        @click="newVideoDialog = true"
        class="add-btn"
      >
        Lisää
      </v-btn>
    </div>

    <v-dialog
      v-model="newVideoDialog"
      max-width="700px"
    >
      <v-card class="new-video-card" color="grey-darken-4">

        <v-card-item class="card-title">
          Lisää video
        </v-card-item>

        <v-card-item>
          <v-text-field label="Nimi" variant="outlined" class="new-video-url" v-model="newVideoName"></v-text-field>
        </v-card-item>
        <v-card-item>
          <v-text-field label="Url" variant="outlined" class="new-video-url" v-model="newVideoUrl"></v-text-field>
        </v-card-item>

        <v-card-item>
          <v-btn
            color="primary"
            size="large"
            :disabled="!store.isConnected || newVideoUrl.length <= 10"
            @click="addVideo()"
          >
            Lisää
          </v-btn>

          <v-btn
            color="primary"
            size="large"
            :disabled="!store.isConnected || newVideoUrl.length <= 10"
            @click="addVideo('queue')"
            class="ml-5"
          >
            Lisää & jonoon
          </v-btn>
        </v-card-item>
      </v-card>

    </v-dialog>

    <v-snackbar
      v-model="store.error"
      timeout="5000"
      color="red-lighten-1"
    >
      {{ store.errorText }}

      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="store.error = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { useAppStore } from '@/store/app';
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
const tab = ref('all');
const store = useAppStore();
const newVideoDialog = ref(false);
const newVideoUrl = ref('');
const newVideoName = ref('');
const videoElement = ref(null);
const route = useRoute();
const admin = ref(route.query.admin ? route.query.admin === '123' : false);
const currentVideo = ref({
  duration: 0,
  time: 0,
});

const volume = ref(25);

function addVideo(action = null) {
  if (newVideoUrl.value.length > 10) {
    store.addVideo(newVideoUrl.value, newVideoName.value, action);
    newVideoDialog.value = false;
    newVideoUrl.value = '';
  }
}

function playVideo(fileName) {
  store.pressedPlay = true;
  store.playVideo(fileName);
}

function queueVideo(fileName) {
  store.pressedPlay = true;
  store.queueVideo(fileName);
}

function skip() {
  store.skip();
}

function getVideoDuration() {
  currentVideo.value.duration = videoElement.value.duration;
}
function getCurrentTime() {
  if (videoElement.value) {
    currentVideo.value.time = videoElement.value.currentTime;
  } else {
    return 0;
  }
}

function playOrPauseVideo(e = null) {
  if (e) {
    e.preventDefault();
  }
  store.pressedPlay = true;
  store.playOrPauseVideo();
}

function changeTime(value) {
  store.pressedPlay = true;
  store.changeTime(value);
}

function changeAdminTime(value) {
  store.pressedPlay = true;
  store.changeTime(value);
}

function volumeIcon() {
  if (volume.value <= 0) {
    return 'mdi-volume-low'
  } else if (volume.value < 100) {
    return 'mdi-volume-medium'
  } else {
    return 'mdi-volume-high'
  }
}

watch(() => store.currentVideo.update_time, (newValue) => {
  setTimeout(() => {
    if (videoElement.value && newValue) {
      if (Math.abs(videoElement.value.currentTime - newValue) > 0.5) {
        videoElement.value.currentTime = newValue;
        currentVideo.value.time = newValue;
      }
    }
  }, 10);
})

watch(() => store.currentVideo.playing, (newValue) => {
  if (videoElement.value) {
    if (newValue) {
      videoElement.value.play();
    } else {
      videoElement.value.pause();
    }
  }
})

function changeVolume(value) {
  if (videoElement.value) {
    if (value) {
      if (value <= 0.5) {
        videoElement.value.volume = 0;
      } else {
        videoElement.value.volume = (value / 300);
      }
    } else {
      videoElement.value.volume = 0;
    }
    localStorage.setItem('volume', videoElement.value.volume + '');
    videoElement.value.muted = false;
  }
}

function play() {
  store.pressedPlay = true;
}

watch(() => store.currentVideo.url, () => {
  setTimeout(() => {
    if (videoElement.value) {
      videoElement.value.volume = volume.value / 300;
      if (store.currentVideo.playing) {
        if (store.pressedPlay) {
          videoElement.value.play();
        }
      } else {
        videoElement.value.pause();
      }
    }

  }, 10);
})

watch(() => store.pressedPlay, (newValue) => {
  console.log('pres', newValue);
  if (newValue && store.currentVideo.playing) {
    videoElement.value.play();
  }
})

onMounted(() => {
  if (videoElement.value) {
    videoElement.value.volume = 0;
    //
    volume.value = localStorage.getItem('volume') ? localStorage.getItem('volume') * 300 : 0;
    videoElement.value.volume = volume.value / 300;

    if (store.currentVideo.playing) {
      videoElement.value.play();
    }
    setTimeout(() => {
      if (!videoElement.value.paused) {
        store.pressedPlay = true;
      }
    }, 100);
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', function() {
      console.log('Play button pressed');
      playOrPauseVideo();
    });

    navigator.mediaSession.setActionHandler('pause', function() {
      console.log('Pause button pressed');
      playOrPauseVideo();
    });

    // You can also handle other actions like nexttrack, previoustrack, seekbackward, seekforward
  }
  // setTimeout(() => {
  //   volume.value = localStorage.getItem('volume') ? localStorage.getItem('volume') * 300 : 0;
  //   ready.value = true;
  //   setTimeout(() => {
  //     if (videoElement.value) {
  //       videoElement.value.volume = volume.value / 300;
  //       videoElement.value.play();
  //     }
  //   }, 10);
  // }, 500);
})

function secondsToMinutesString(seconds) {
  let minutes = Math.floor(seconds / 60);
  let remainingSeconds = Math.floor(seconds % 60);

  // Adding leading zero if minutes or seconds are less than 10
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  remainingSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;

  return minutes + ":" + remainingSeconds;
}
</script>

<style scoped>

  .main-container {
    display: flex;
    height: 100%;
    position: relative;
  }

  .video-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    position: relative;
    max-height: 100vh;
  }

  .sidebar {
    min-width: 420px;
    width: 420px;
    height: 100%;
    padding: 10px;
    background-color: #1d1d1d;
    color: white;
    border-left: #434343 1px solid;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .new-video-card {
    padding: 10px 10px 30px 10px;
  }

  .new-video-url {
    /* height: 60px; */
    padding: 10px 0;
  }

  .card-title {
    font-size: 24px;
  }

  .no-video-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 40px;
  }

  #main-player {
    width: 100%;
  }

  .video-listing {
    display: flex;
    align-items: center;
    padding: 10px 0;
    height: 65px;
  }

  .video-listing .name {
    width: fit-content;
    max-width: 100%;
    font-size: 18px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-left: 10px;
  }

  .play-btn, .queue-btn {
    width: 40px !important;
    height: 40px !important;
  }
  .queue-btn {
    margin-left: 10px;
  }

  .tab {
    flex: 1;
  }

  .action-btns {
    display: flex;
    justify-content: center;
    gap: 20px;
    padding: 10px;
  }

  .add-btn {
    width: 100%;
    bottom: 10px;
    height: 50px;
  }

  .window {
    height: 100%;
  }

  .empty {
    color: #848484;
    text-align: center;
    margin-top: 50px;
  }

  .current-video .time {
    display: flex;
    justify-content: space-between;
    padding: 0 10px;
  }

  .current-video .name {
    text-align: center;
    margin-top: 5px;
    font-size: 24px;
    font-weight: 600;
    height: 36px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding: 0 10px;
  }

  .name-wrapper {
    width: calc(100% - 90px);
  }

  .play-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #0000005a;
  }

  .all-videos {
    max-height: calc(100vh - 400px);
    overflow: auto;
  }

  /* Style the scrollbar */
  .all-videos::-webkit-scrollbar {
      width: 6px;
      border-radius: 10px;
  }

  /* Style the track */
  .all-videos::-webkit-scrollbar-track {
      background: #1d1d1d;
      border-radius: 10px;
  }

  /* Handle */
  .all-videos::-webkit-scrollbar-thumb {
      background: #474747;
      border-radius: 10px;
  }

  /* Handle on hover */
  .all-videos::-webkit-scrollbar-thumb:hover {
      background: #555;
  }
  @media (max-width: 1199px) {
    .main-container {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      min-width: 100%;
    }

    .video-container {
      height: auto;
    }

    .current-video .name {
      font-size: 20px;
    }
  }
</style>
