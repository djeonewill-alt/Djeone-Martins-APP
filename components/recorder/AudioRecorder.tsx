'use client'

import { useState, useRef } from 'react'

type AudioRecorderProps = {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const recordedDurationRef = useRef<number>(0)

  const startRecording = async () => {
    console.log('🎙️ Iniciando gravação...')
    
    try {
      // Configurações MAIS COMPATÍVEIS
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      
      console.log('✅ Stream de áudio obtido')
      
      // Tentar formato WEBM primeiro, fallback para padrão
      let mediaRecorder: MediaRecorder
      let mimeType = ''
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 96000, // 96 kbps - boa qualidade, mais compatível
        })
        mimeType = 'audio/webm'
        console.log('✅ Usando WEBM Opus (96 kbps)')
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
          audioBitsPerSecond: 96000,
        })
        mimeType = 'audio/webm'
        console.log('✅ Usando WEBM padrão (96 kbps)')
      } else {
        mediaRecorder = new MediaRecorder(stream)
        mimeType = 'audio/webm'
        console.log('⚠️ Usando configuração automática do navegador')
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          console.log('📦 Chunk:', e.data.size, 'bytes (Total:', chunksRef.current.length, ')')
        }
      }

      mediaRecorder.onstop = () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        recordedDurationRef.current = duration
        
        console.log('⏹️ Gravação parada')
        console.log('📊 Total chunks:', chunksRef.current.length)
        console.log('⏱️ Duração calculada:', duration, 'segundos')
        
        const blob = new Blob(chunksRef.current, { type: mimeType })
        console.log('✅ Blob criado:', blob.size, 'bytes', blob.type)
        
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
        
        // IMPORTANTE: Passa duração correta
        console.log('📤 Chamando onRecordingComplete com duração:', duration)
        onRecordingComplete(blob, duration)
        
        stream.getTracks().forEach(track => track.stop())
        console.log('🔇 Stream encerrado')
      }

      mediaRecorder.onerror = (e) => {
        console.error('❌ Erro no MediaRecorder:', e)
      }

      // Captura a cada 1000ms (1 segundo) - mais estável
      mediaRecorder.start(1000)
      console.log('▶️ Gravação iniciada (captura a cada 1s)')
      
      setIsRecording(true)
      startTimeRef.current = Date.now()
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error)
      alert('❌ Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  const stopRecording = () => {
    console.log('🛑 Parando gravação...')
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const discardRecording = () => {
    console.log('🗑️ Descartando gravação')
    setAudioURL(null)
    setRecordingTime(0)
    setIsConfirmed(false)
    recordedDurationRef.current = 0
  }

  const confirmRecording = () => {
    console.log('✅ Gravação confirmada - Duração:', recordedDurationRef.current, 'segundos')
    setIsConfirmed(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {!audioURL ? (
        <>
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="w-full bg-red-600 text-white font-bold py-8 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-5xl">🎤</span>
              <div className="text-left">
                <div className="text-2xl">Começar Gravação</div>
                <div className="text-sm opacity-80">Alta qualidade</div>
              </div>
            </button>
          ) : (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-8 text-center space-y-4">
              <div className="text-7xl mb-4 animate-pulse">🎙️</div>
              
              <div className="text-5xl font-bold text-red-600 mb-2">
                {formatTime(recordingTime)}
              </div>
              
              <p className="text-lg text-red-700 mb-2">
                Gravando...
              </p>

              <button
                type="button"
                onClick={stopRecording}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-3"
              >
                <span className="text-2xl">⏹️</span>
                <span className="text-xl">Parar Gravação</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={`border-2 rounded-xl p-6 ${isConfirmed ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{isConfirmed ? '✅' : '🎵'}</span>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${isConfirmed ? 'text-green-900' : 'text-blue-900'}`}>
                {isConfirmed ? 'Áudio Confirmado!' : 'Preview da Gravação'}
              </h3>
              <p className={`text-sm ${isConfirmed ? 'text-green-700' : 'text-blue-700'}`}>
                Duração: {formatTime(recordedDurationRef.current)}
              </p>
            </div>
          </div>

          <audio
            src={audioURL}
            controls
            className="w-full mb-4"
          />

          {isConfirmed ? (
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
              <p className="text-green-800 font-semibold text-sm">
                ✅ Áudio pronto! Preencha os dados abaixo e publique
              </p>
              <button
                type="button"
                onClick={discardRecording}
                className="mt-3 text-sm text-green-700 hover:text-green-900 underline"
              >
                Gravar outro áudio
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={discardRecording}
                className="flex-1 bg-red-100 text-red-700 font-semibold py-3 rounded-lg hover:bg-red-200 transition-colors"
              >
                🗑️ Gravar Novamente
              </button>
              <button
                type="button"
                onClick={confirmRecording}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                ✅ Usar esta Gravação
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}