// npm install express
// npm install moment-timezone
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const app = express();
const fs = require('fs');
const { exec } = require('child_process');
const fetch = require('node-fetch');
const moment = require('moment');
require('moment-timezone');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/rekrytor.fi/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/rekrytor.fi/fullchain.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);
const ws = new WebSocket.Server({ server: httpsServer });

const videoUrl = 'https://www.youtube.com/watch?v=zrjafmadkD4';

let allVideos = [];
const clients = new Set();
var currentVideo = {
    playing: false,
    file_name: null,
    time: 0,
};
var queue = [];
function downloadVideo(url, videoId) {
    console.log(`Downloading audio: ${videoUrl}`)
    return new Promise((resolve, reject) => {
        const command = `yt-dlp -f 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]' --match-filter "duration <= 600" -o '/var/www/jobber/webroot/videos/${videoId}.%(ext)s' '${url}'`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution error: ${error}`);
                reject(error); // Rejects the promise if there's an execution error
                return;
            }
        
            if (stdout.includes("skipping")) {
                reject(new Error("Video skipped, possibly due to being too long."));
            } else {
                console.log('Video downloaded');
                resolve(stdout);
            }
        });
    });
}


// downloadVideo(videoUrl).then(() => {
//     console.log('Audio downloaded');
// }).catch((error) => {
//     console.error('Audio download failed: ' + error);
// });

ws.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);
    let payload = {
        action: 'INIT',
        videos: allVideos,
        queue: queue
    };
    ws.send(JSON.stringify(payload));
    ws.on('message', (message) => {
        const buf = Buffer.from(message);
        const str = buf.toString('utf8');
        const data = JSON.parse(str);
        handleClientMessage(ws, data);
    });

    ws.on('close', () => {
        handleClientDisconnect(ws);
    });
});

httpsServer.listen(9000, () => {
    console.log('Server is listening on port 9000');
});

function handleClientMessage(ws, data) {
    switch (data.action) {
        case 'PLAY_VIDEO':
            playVideo(data.file_name);
            break;
        case 'ADD_VIDEO':
            addVideo(ws, data);
            break;
        case 'QUEUE_VIDEO':
            queueVideo(ws, data);
            break;
        case 'SKIP':
            skip();
            break;
    }
}

function handleClientDisconnect(ws) {

}

function playVideo(fileName) {
    console.log('PLAY_VIDEO', fileName);

    if (fileName) {
        let video = allVideos.find(v => v.file_name === fileName);
        if (video) {
            currentVideo = video;
            currentVideo.playing = true;
            clients.forEach(_ws => {
                let payload = {
                    action: 'PLAY_VIDEO',
                    file_name: fileName,
                    name: video.name
                }
                _ws.send(JSON.stringify(payload));
            });
            resetVideo(fileName, true);
        }
    }
}

function queueVideo(ws, data) {
    console.log('QUEUE_VIDEO', data);

    if (data.file_name) {
        let video = allVideos.find(v => v.file_name === data.file_name);
        if (video) {
            if (queue.length > 0 || currentVideo.file_name) {
                queue.push(video);
                clients.forEach(_ws => {
                    let payload = {
                        action: 'QUEUE',
                        queue
                    }
                    _ws.send(JSON.stringify(payload));
                });
            } else {
                playVideo(video.file_name);
            }
        }
    }
}

function addVideo(ws, data) {
    console.log('ADD_VIDEO', data);
    if (data.url) {
        const videoId = randomId();
        downloadVideo(data.url, videoId).then((res) => {
            let payload = {
                url: data.url,
                file_name: videoId + '.mp4',
                name: data.name
            };
            fetch(`https://rekrytor.fi/api/pleijeri/add-video.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                getVideos();
            })
            .catch(error => console.error('Error:', error));
        }).catch((error) => {
            
        });
    }
}

function getVideos() {
    fetch(`https://rekrytor.fi/api/pleijeri/get-videos.json`, {
            method: 'GET',
            headers: {}
        })
        .then(response => response.json())
        .then(data => {
            allVideos = data.videos;
            clients.forEach(ws => {
                let payload = {
                    action: 'ALL_VIDEOS',
                    videos: allVideos
                };
                ws.send(JSON.stringify(payload));
            })
        })
        .catch(error => console.error('Error:', error));
}

function randomId() {
    return Math.floor(10000000 + Math.random() * 90000000);
}

function resetVideo(name = null, play = false) {
    currentVideo = {
        playing: play,
        file_name: name,
        time: 0.0,
        og_time: null,
        name: null
    }
}

function getVideoDuration(fileName) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/var/www/jobber/webroot/videos/${fileName}"`, (error, stdout, stderr) => {
        if (error) {
            reject(error);
            return;
        }
        if (stderr) {
            reject(stderr);
            return;
        }
        resolve(parseFloat(stdout.trim()));
        });
    });
}

function skip() {
    console.log('SKIP')
    resetVideo();

    if (queue.length > 0) {
        playVideo(queue[0].file_name);
        queue = queue.filter(q => q.id !== queue[0].id);
    }
    clients.forEach(_ws => {
        let payload = {
            action: 'QUEUE',
            queue
        }
        _ws.send(JSON.stringify(payload));
    });
}



setInterval(() => {
    if (currentVideo.playing) {
        currentVideo.time += 0.2;
    }
    if (currentVideo.file_name && !currentVideo.og_time) {
        getVideoDuration(currentVideo.file_name).then(res => {
            currentVideo.og_time = res;
        });
    }
    if (currentVideo.og_time && currentVideo.og_time - currentVideo.time < 0) {
        resetVideo();

        if (queue.length > 0) {
            playVideo(queue[0].file_name);
            queue = queue.filter(q => q.id !== queue[0].id);
        }
    }
    clients.forEach(ws => {
        let payload = {
            action: 'CURRENT_VIDEO',
            currentVideo
        };
        ws.send(JSON.stringify(payload));
    });
}, 200)

getVideos();