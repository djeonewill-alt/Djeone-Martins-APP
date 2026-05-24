import lamejs from 'lamejs'

export type ConvertedMp3Audio = {
  blob: Blob
  sizeBytes: number
  durationSeconds: number
  mimeType: 'audio/mpeg'
}

const MP3_BITRATE_KBPS = 64
const MP3_SAMPLE_BLOCK_SIZE = 1152

function getAudioContext() {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext

  if (!AudioContextConstructor) {
    throw new Error('Este navegador não suporta conversão de áudio.')
  }

  return new AudioContextConstructor()
}

function audioBufferToMonoSamples(audioBuffer: AudioBuffer) {
  const samples = new Float32Array(audioBuffer.length)

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex)

    for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
      samples[sampleIndex] += channelData[sampleIndex] / audioBuffer.numberOfChannels
    }
  }

  return samples
}

function floatSamplesToInt16(samples: Float32Array) {
  const intSamples = new Int16Array(samples.length)

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    intSamples[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }

  return intSamples
}

export async function convertRecordingToMp3(recordingBlob: Blob): Promise<ConvertedMp3Audio> {
  const audioContext = getAudioContext()

  try {
    const arrayBuffer = await recordingBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const sampleRate = audioBuffer.sampleRate || 44100
    const monoSamples = audioBufferToMonoSamples(audioBuffer)
    const intSamples = floatSamplesToInt16(monoSamples)
    const encoder = new lamejs.Mp3Encoder(1, sampleRate, MP3_BITRATE_KBPS)
    const mp3Chunks: Uint8Array[] = []

    for (let offset = 0; offset < intSamples.length; offset += MP3_SAMPLE_BLOCK_SIZE) {
      const sampleChunk = intSamples.subarray(offset, offset + MP3_SAMPLE_BLOCK_SIZE)
      const encodedChunk = encoder.encodeBuffer(sampleChunk)

      if (encodedChunk.length > 0) {
        mp3Chunks.push(encodedChunk)
      }
    }

    const finalChunk = encoder.flush()

    if (finalChunk.length > 0) {
      mp3Chunks.push(finalChunk)
    }

    const mp3Parts = mp3Chunks.map((chunk) => {
      const buffer = new ArrayBuffer(chunk.byteLength)
      new Uint8Array(buffer).set(chunk)
      return buffer
    })
    const blob = new Blob(mp3Parts, { type: 'audio/mpeg' })

    return {
      blob,
      sizeBytes: blob.size,
      durationSeconds: audioBuffer.duration,
      mimeType: 'audio/mpeg',
    }
  } finally {
    await audioContext.close()
  }
}
