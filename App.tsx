import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

type SessionMessageType = 'status' | 'transcript' | 'translation' | 'summary' | 'error';

type SessionMessage = {
  type: SessionMessageType;
  payload: string;
  language?: string;
  timestamp: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';
const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://127.0.0.1:8000/ws/session/mobile-demo';
const VOICE_ID = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';

export default function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [translatedText, setTranslatedText] = useState('');
  const [simpleSummary, setSimpleSummary] = useState('');
  const [riskAlert, setRiskAlert] = useState('');
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as SessionMessage;
        pushMessage(msg);
      } catch {
        // Ignore malformed websocket message.
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  const englishTranscript = useMemo(
    () => messages.filter((m) => m.type === 'transcript').map((m) => m.payload).join(' '),
    [messages]
  );

  const pushMessage = (msg: SessionMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  const sendSampleSpeech = () => {
    socketRef.current?.send(
      JSON.stringify({
        type: 'text',
        text: 'Your hemoglobin levels are low due to iron deficiency anemia.'
      })
    );
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true
      });

      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recordingInstance.startAsync();
      recordingRef.current = recordingInstance;
      setRecording(true);
    } catch {
      Alert.alert('Recording Error', 'Unable to start microphone recording.');
      setRecording(false);
    }
  };

  const stopRecordingAndProcess = async () => {
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (!uri) throw new Error('Missing recording URI');

      const fileResponse = await fetch(uri);
      const fileBlob = await fileResponse.blob();
      const form = new FormData();
      form.append('audio_chunk', {
        // @ts-expect-error React Native file object format for FormData.
        uri,
        name: 'mobile-recording.m4a',
        type: fileBlob.type || 'audio/m4a'
      });
      form.append('language', 'en');

      const response = await fetch(`${API_BASE_URL}/process-audio`, {
        method: 'POST',
        body: form
      });
      const data = (await response.json()) as { transcript?: string; timestamp?: string };
      if (data.transcript?.trim()) {
        const msg: SessionMessage = {
          type: 'transcript',
          payload: data.transcript,
          timestamp: data.timestamp ?? new Date().toISOString()
        };
        pushMessage(msg);
        socketRef.current?.send(JSON.stringify({ type: 'text', text: data.transcript }));
      }
    } catch {
      Alert.alert('Processing Error', 'Unable to process recorded audio.');
    } finally {
      recordingRef.current = null;
      setRecording(false);
    }
  };

  const translateToSpanish = async () => {
    if (!englishTranscript.trim()) return;
    setLoadingTranslate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: englishTranscript, target_language: 'Spanish' })
      });
      const data = (await response.json()) as { translated_text?: string };
      setTranslatedText(data.translated_text ?? '');
    } catch {
      Alert.alert('Translation Error', 'Unable to translate text.');
    } finally {
      setLoadingTranslate(false);
    }
  };

  const generateSimpleSummary = async () => {
    if (!englishTranscript.trim()) return;
    setLoadingSummary(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate-visit-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishTranscript })
      });
      const data = (await response.json()) as { summary?: string };
      setSimpleSummary(data.summary ?? '');
    } catch {
      Alert.alert('Summary Error', 'Unable to generate summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const detectRisk = async () => {
    if (!englishTranscript.trim()) return;
    setLoadingRisk(true);
    try {
      const response = await fetch(`${API_BASE_URL}/detect-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: englishTranscript })
      });
      const data = (await response.json()) as { risk_level?: string; alert?: string };
      setRiskAlert(`${data.risk_level?.toUpperCase() ?? 'UNKNOWN'}: ${data.alert ?? ''}`.trim());
    } catch {
      Alert.alert('Risk Detection Error', 'Unable to analyze risk.');
    } finally {
      setLoadingRisk(false);
    }
  };

  const playTranslatedAudio = async () => {
    if (!translatedText.trim()) return;
    setPlayingAudio(true);

    try {
      const response = await fetch(`${API_BASE_URL}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translated_text: translatedText, voice_id: VOICE_ID })
      });

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const audioBase64 = await toBase64(await response.blob());
      const fileUri = `${FileSystem.cacheDirectory}bridgevoice-tts-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64
      });

      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setPlayingAudio(false);
          sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch {
      setPlayingAudio(false);
      Alert.alert('Audio Playback Error', 'Unable to play translated audio.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>BridgeVoice Mobile</Text>
          <Text style={styles.heroSub}>Live captions, translation, and patient-safe summaries</Text>
          <Text style={[styles.status, connected ? styles.ok : styles.bad]}>
            {connected ? 'Connected to live session' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.cardDark}>
          <Text style={styles.cardLabel}>Doctor Speech</Text>
          <Text style={styles.largeCaption}>{englishTranscript || 'English transcript'}</Text>
          <View style={[styles.row, { marginTop: 12 }]}>
            {recording ? (
              <ActionButton label="Stop & Process Audio" onPress={stopRecordingAndProcess} fullWidth />
            ) : (
              <ActionButton label="Record Audio Chunk" onPress={startRecording} fullWidth />
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Translated Speech</Text>
          <Text style={styles.smallLabel}>Spanish transcript</Text>
          <Text style={styles.paragraph}>{translatedText || 'Tap Translate to generate output.'}</Text>
          <View style={styles.row}>
            <ActionButton label="Send Sample" onPress={sendSampleSpeech} />
            <ActionButton label="Translate" onPress={translateToSpanish} loading={loadingTranslate} />
          </View>
          <View style={styles.row}>
            <ActionButton
              label="Play Audio"
              onPress={playTranslatedAudio}
              loading={playingAudio}
              fullWidth
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Simple Explanation</Text>
          <Text style={styles.paragraph}>{simpleSummary || 'Tap Generate Summary.'}</Text>
          <ActionButton label="Generate Summary" onPress={generateSimpleSummary} loading={loadingSummary} fullWidth />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Risk Detection</Text>
          <Text style={styles.paragraph}>{riskAlert || 'Tap Detect Risk.'}</Text>
          <ActionButton label="Detect Risk" onPress={detectRisk} loading={loadingRisk} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  loading,
  fullWidth
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.button, fullWidth && styles.buttonFull]} disabled={loading}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('blob conversion failed'));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('invalid blob result'));
        return;
      }
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0'
  },
  content: {
    padding: 16,
    gap: 14
  },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16
  },
  heroTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700'
  },
  heroSub: {
    color: '#cbd5e1',
    marginTop: 6,
    fontSize: 14
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600'
  },
  ok: {
    color: '#34d399'
  },
  bad: {
    color: '#fb7185'
  },
  cardDark: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  largeCaption: {
    marginTop: 10,
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 10
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a'
  },
  smallLabel: {
    fontSize: 12,
    color: '#64748b'
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 24,
    color: '#1e293b'
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center'
  },
  buttonFull: {
    width: '100%'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
