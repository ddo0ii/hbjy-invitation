import { mkdirSync, writeFileSync } from 'node:fs';

// 직접 구성한 짧은 연주곡입니다. 상용 음원이나 기존 곡의 멜로디를 사용하지 않습니다.
const sampleRate = 22050;
const bpm = 112;
const beat = 60 / bpm;
const bars = 16;
const duration = bars * 4 * beat;
const samples = new Float64Array(Math.ceil(duration * sampleRate));
const noteFrequency = midi => 440 * 2 ** ((midi - 69) / 12);
function pluck(midi, start, length, volume, mellow = false) {
  const hz = noteFrequency(midi);
  const count = Math.ceil(length * sampleRate);
  const offset = Math.floor(start * sampleRate);
  for (let i = 0; i < count && offset + i < samples.length; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 170) * Math.exp(-t * (mellow ? 5 : 8)) * Math.min(1, (length - t) * 40);
    samples[offset + i] += volume * envelope * (Math.sin(2 * Math.PI * hz * t) + (mellow ? .1 : .23) * Math.sin(4 * Math.PI * hz * t) + .06 * Math.sin(6 * Math.PI * hz * t));
  }
}
const chords = [[48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]];
const melody = [[76, 79, 81, 79, 76, 74, 72, 76], [74, 79, 83, 81, 79, 74, 76, 74], [76, 81, 84, 83, 81, 79, 76, 72], [77, 81, 79, 77, 76, 74, 72, 79]];
for (let bar = 0; bar < bars; bar++) {
  const chord = chords[bar % 4];
  const base = bar * 4 * beat;
  for (let step = 0; step < 8; step++) {
    const start = base + step * beat / 2;
    pluck(chord[step % 4], start, beat * .8, .1, true);
    if (step !== 3 && step !== 7) pluck(melody[(bar + (bar > 7 ? 1 : 0)) % 4][step], start + .02, beat * .8, .065);
  }
  pluck(chord[0] - 12, base, beat * 1.7, .13, true);
  pluck(chord[0] - 12, base + beat * 2, beat * 1.7, .1, true);
}
const pcm = Buffer.alloc(samples.length * 2);
for (let i = 0; i < samples.length; i++) {
  const edge = Math.min(1, i / (sampleRate * .03), (samples.length - i) / (sampleRate * .1));
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * edge * 1.4)) * 26000), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
mkdirSync('public/music', { recursive: true });
writeFileSync('public/music/sunlit-day.wav', Buffer.concat([header, pcm]));
console.log(`오리지널 BGM을 생성했습니다. ${duration.toFixed(1)}초, 모노 WAV`);
