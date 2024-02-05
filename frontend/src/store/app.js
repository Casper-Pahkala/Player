// Utilities
import { defineStore } from 'pinia'
import axios from 'axios';

export const useAppStore = defineStore('app', {
  state: () => ({
    websocket: null,
    axios: axios,
    websocketStatus: 'Not connected',
    videoUrl: '',
    allVideos: [],
    currentVideo: {
      playing: false,
      url: null,
      name: null,
      time: 0.0,
      // latest time the video was updated from ws
      update_time: null,
    },
    queue: [],
    pressedPlay: false,
    error: false,
    errorText: ''
  }),
  actions: {
    connectToWebsocket() {
      console.log('CONNECTING TO WS');
      if (this.websocket && this.websocket.readyState !== 3) {
        console.log('WebSocket connection is already open or in progress.');
        return;
      }

      this.websocket = new WebSocket('wss://rekrytor.fi:9000');

      this.websocket.addEventListener('open', () => {
        this.websocketStatus = 'Connected';
        console.log('Connected to ws');

      });

      this.websocket.addEventListener('message', (event) => {
        let data = JSON.parse(event.data);

        if (data.action !== 'UPDATE') {
          console.log(data);
        }

        switch (data.action) {
          case 'ALL_VIDEOS':
            this.allVideos = data.videos;
            break;
          case 'PLAY_VIDEO':
            this.currentVideo.url = null;
            break;
          case 'UPDATE':
            var video = data.currentVideo;
            this.currentVideo.name = video.name;
            this.currentVideo.playing = video.playing;
            this.currentVideo.url = data.currentVideo.file_name ? 'https://rekrytor.fi/videos/' + data.currentVideo.file_name : null;
            if (!this.currentVideo.update_time) {
              this.currentVideo.update_time = data.currentVideo.time;
            }
            if (Math.abs(this.currentVideo.update_time - data.currentVideo.time) > 0.3) {
              if (this.pressedPlay) {
                this.currentVideo.update_time = data.currentVideo.time;
              }
            }
            if (data.allVideos) {
              this.allVideos = data.allVideos;
            }
            break;
          case 'QUEUE':
            this.queue = data.queue;
            break;
          case 'INIT':
            this.allVideos = data.videos;
            this.queue = data.queue;
            break;
          case 'ERROR':
            this.error = true;
            this.errorText = data.message;
            break;
        }
      });

      this.websocket.addEventListener('close', () => {
        this.websocketStatus = 'Closed';
        setTimeout(() => {
          this.connectToWebsocket();
        }, 1000);
      });
    },
    addVideo(url, name, action) {
      if (this.websocket) {
        let payload = {
          action: 'ADD_VIDEO',
          url,
          name,
          next_action: action
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    playVideo(fileName) {
      if (this.websocket) {
        let payload = {
          action: 'PLAY_VIDEO',
          file_name: fileName
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    queueVideo(fileName) {
      if (this.websocket) {
        let payload = {
          action: 'QUEUE_VIDEO',
          file_name: fileName
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    skip() {
      if (this.websocket) {
        let payload = {
          action: 'SKIP',
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    playOrPauseVideo() {
      if (this.websocket) {
        let payload = {
          action: 'PLAY_OR_PAUSE',
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    changeTime(time) {
      if (this.websocket) {
        let payload = {
          action: 'CHANGE_TIME',
          time
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    skipPrevious() {
      if (this.websocket) {
        let payload = {
          action: 'SKIP_PREVIOUS',
        };
        this.websocket.send(JSON.stringify(payload));
      }
    },
    deleteVideo(fileName) {
      if (this.websocket) {
        let payload = {
          action: 'DELETE',
          file_name: fileName
        };
        this.websocket.send(JSON.stringify(payload));
      }
    }
  },
  getters: {
    isConnected() {
      return this.websocketStatus == 'Connected';
    }
  }
})
