var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
var gainNode;
var bufferLength;
var dataArray;
var canvas;
var canvasCtx;

var RATE = 44100;
var FFTSIZE = 2048;
var WIDTH = 640;
var HEIGHT = 100;
var BAND_LOWER = 50;
var BAND_UPPER = 500;
var OCTAVES = 2;

var FREQ_ALPHA = 0.95;
var frequencyFilter = new IIRFilter(FREQ_ALPHA);

var LOUDNESS_ALPHA = 0.95;
var loudnessFilter = new IIRFilter(LOUDNESS_ALPHA);
loudnessFilter.convertToDecibels = function(value){
  if (value == 0 ){
    return 0;
  }
  console.log("prev " + this.prev);
  var db = 10 * Math.log(value / Math.abs(this.prev)) / Math.LN10;
  return db;  
} 

function IIRFilter(alpha) {
  this.alpha = alpha;
  this.oldPrev = 1;
  this.prev = 1;
  this.update = function(value){
    this.oldPrev = this.prev;
    this.prev = (1-this.alpha) * value + this.alpha*this.prev;
    return this.prev;
  }
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

var getFrequencyIndex = function(freq){
  return Math.round(freq/(RATE/FFTSIZE)); 
}

var getFrequencyFromIndex = function(index){
  return index * RATE/FFTSIZE;
}

var getMaxOfDataArray = function(array){
  var max = Number.MIN_VALUE;
  for (var i = 0; i < array.length; i++) {
    if (array[i] > max){
      max = array[i];
    }
  } 
  return max;
}

var getIndexOfDataArray = function(element, array){
  for (var i = 0; i < array.length; i++) {
    if (array[i] == element){
      return i;
    }
  } 
  return -1;
}

var sumArray = function(array) {
  var sum = 0;
  for (var i = 0; i < array.length; i++){
    sum += array[i];
  }
  return sum;
}

var mapFrequencyToHue = function(freq){  
  if (freq < BAND_LOWER){
    freq = BAND_LOWER
  } else if (freq > BAND_UPPER) {
    freq = BAND_UPPER
  }
      
  var freqLog = Math.log(freq)/Math.log(Math.pow(2, OCTAVES));
  var lowerLog = Math.log(BAND_LOWER)/Math.log(Math.pow(2, OCTAVES));
  var upperLog = Math.log(BAND_UPPER)/Math.log(Math.pow(2, OCTAVES));
  var hue = (freqLog - lowerLog) / (1.0*upperLog - 1.0*lowerLog);
  return hue
}

var lowerBandIndex = getFrequencyIndex(BAND_LOWER);
var upperBandIndex = getFrequencyIndex(BAND_UPPER);

var configureAnalyser = function(){
  analyser.fftSize = FFTSIZE;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
}

$(document).ready(function(){
  canvas = document.getElementById("bar-graph-canvas");
  if (canvas){
    canvasCtx = canvas.getContext("2d");
  }

  var source;

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);

  //////////////////////////////Button to load the file/////////////////////////////////////
  function loadAudioFile(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    var onError = function(){
      console.log("error occured.")
    };
    // Decode asynchronously
    request.onload = function() {
      audioCtx.decodeAudioData(request.response, function(buffer) {
        audio_playing = true;
        var source = audioCtx.createBufferSource();
        source.buffer = buffer;
        analyser = audioCtx.createAnalyser();
        configureAnalyser();

        gainNode = audioCtx.createGain();
        source.connect(analyser);
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.connect(audioCtx.destination); 
        source.start(0);
        // source.start(0); 
      }, onError);
    }
    request.send();
  }

  $('#submit_audio_button').click( function() {
    var audio_url = $('#audio_input_url').val();
    loadAudioFile(audio_url);
  });

  document.getElementById('volume').addEventListener('change', function() {
    gainNode.gain.value = this.value;
  });
  ////////////////////////////////////////////////////////////////////////////////////////////
});

var graphFreq = function(dataArray) {
  canvasCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  canvasCtx.beginPath();

  var sliceWidth = WIDTH * 1.0 / bufferLength;
  var x = 0;
  for(var i = 0; i < bufferLength; i++) {
    var v = dataArray[i] / 128.0;
    var y = v * 100/2;

    if(i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height/2);
  canvasCtx.stroke();
}


var graphBarFreq = function(dataArray) {
  canvasCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

  var barWidth = (WIDTH / bufferLength) * 2.5;
  var barHeight;
  var x = 0;

  for(var i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i]/2;

      canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
      canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight);

      x += barWidth + 1;
  }
}
var counter = 0;
var processAudio = function() {
  counter++;
  analyser.getByteTimeDomainData(dataArray);
  //var c = dataArray / 128.0;
  for(var i = 0; i < dataArray.length; i++) {
        dataArray[i] = Math.abs(dataArray[i] - 128.0);
  }
  //graphFreq(dataArray);
  //graphBarFreq(dataArray);
  var validFrequencies = dataArray.subarray(lowerBandIndex, upperBandIndex);
  var fundamentalValue = getMaxOfDataArray(validFrequencies);
  var fundFreqIndex = getIndexOfDataArray(fundamentalValue, validFrequencies);
  var fundamentalFrequency = getFrequencyFromIndex(fundFreqIndex);
  var averagedFrequency = frequencyFilter.update(fundamentalFrequency)

  var loudness = sumArray(validFrequencies);
  console.log("loudness " + loudness);
  var oldPrev = loudnessFilter.prev;
  var loudnessInDb = loudnessFilter.convertToDecibels(loudness);

  var averagedLoudness = loudnessFilter.update(loudnessInDb);
  var loudnessRatio = averagedLoudness/oldPrev;

  return {
    frequency: averagedFrequency,
    loudnessRatio: loudnessRatio
  };
}