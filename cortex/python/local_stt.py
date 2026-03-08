import os
# WORKAROUND: Prevent OpenMP library conflict crash on macOS
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import io
import time
import logging
import traceback
import subprocess
import numpy as np
from typing import Optional, Dict, Any

# Lazy imports for engines
WHISPER_AVAILABLE = False
SHERPA_AVAILABLE = False

def lazy_import_whisper():
    global WHISPER_AVAILABLE
    try:
        from faster_whisper import WhisperModel
        WHISPER_AVAILABLE = True
        return WhisperModel
    except ImportError:
        WHISPER_AVAILABLE = False
        return None

def lazy_import_sherpa():
    global SHERPA_AVAILABLE
    try:
        import sherpa_onnx
        SHERPA_AVAILABLE = True
        return sherpa_onnx
    except ImportError:
        SHERPA_AVAILABLE = False
        return None


class STTEngine:
    def load_model(self, model_path: str):
        raise NotImplementedError

    def transcribe(self, audio_np: np.ndarray) -> str:
        raise NotImplementedError


class WhisperEngine(STTEngine):
    def __init__(self):
        self.model = None
        self.current_model_path = None
        self.device = "cpu"
        self.compute_type = "int8"

    def load_model(self, model_path: str):
        WhisperModel = lazy_import_whisper()
        if not WhisperModel:
            return False
            
        model_path = os.path.abspath(model_path)
        if self.model and self.current_model_path == model_path:
            return True

        print(f"[WhisperEngine] Loading model from {model_path}...")
        try:
            start_time = time.time()
            self.model = WhisperModel(
                model_size_or_path=model_path,
                device=self.device,
                compute_type=self.compute_type,
                local_files_only=True
            )
            self.current_model_path = model_path
            print(f"[WhisperEngine] Loaded in {time.time() - start_time:.2f}s")
            return True
        except Exception as e:
            print(f"[WhisperEngine] Load failed: {e}")
            return False

    def transcribe(self, audio_np: np.ndarray) -> str:
        if not self.model: return ""
        
        segments, info = self.model.transcribe(
            audio_np,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        text_segments = [s.text for s in segments]
        return " ".join(text_segments).strip()


class SherpaOnnxEngine(STTEngine):
    def __init__(self):
        self.recognizer = None
        self.current_model_path = None

    def load_model(self, model_path: str):
        sherpa_onnx = lazy_import_sherpa()
        if not sherpa_onnx:
            return False

        model_path = os.path.abspath(model_path)
        if self.recognizer and self.current_model_path == model_path:
            return True

        print(f"[SherpaEngine] Loading model from {model_path}...")
        try:
            start_time = time.time()
            
            # Detect files in model_path
            def find_file(pattern):
                for f in os.listdir(model_path):
                    if pattern in f:
                        return os.path.join(model_path, f)
                return ""

            # Improved detection: Check directory name or specific files
            is_moonshine = "moonshine" in model_path.lower() or any("moonshine" in f for f in os.listdir(model_path))
            is_sensevoice = "sensevoice" in model_path.lower() or any("sense-voice" in f.lower() or "sensevoice" in f.lower() for f in os.listdir(model_path))

            if is_moonshine:
                # Moonshine Config
                feat_config = sherpa_onnx.FeatureConfig(sample_rate=16000, feature_dim=80)
                model_config = sherpa_onnx.OfflineModelConfig(
                    moonshine=sherpa_onnx.OfflineMoonshineModelConfig(
                        preprocessor=find_file("preprocessor"),
                        encoder=find_file("encoder"),
                        uncached_decoder=find_file("uncached-decoder")
                    ),
                    tokens=find_file("tokens.txt"),
                    num_threads=4,
                    debug=False,
                    provider="cpu"
                )
            elif is_sensevoice:
                # SenseVoice Config
                feat_config = sherpa_onnx.FeatureConfig(sample_rate=16000, feature_dim=80)
                model_config = sherpa_onnx.OfflineModelConfig(
                    sense_voice=sherpa_onnx.OfflineSenseVoiceModelConfig(
                        model=find_file("model"),
                        language=find_file("language") or "", 
                        use_itn=True
                    ),
                    tokens=find_file("tokens.txt"),
                    num_threads=4,
                    debug=False,
                    provider="cpu"
                )
            else:
                return False

            self.recognizer = sherpa_onnx.OfflineRecognizer(
                feat_config=feat_config,
                model_config=model_config
            )
            self.current_model_path = model_path
            print(f"[SherpaEngine] Loaded in {time.time() - start_time:.2f}s")
            return True
        except Exception as e:
            print(f"[SherpaEngine] Load failed: {e}")
            traceback.print_exc()
            return False

    def transcribe(self, audio_np: np.ndarray) -> str:
        if not self.recognizer: return ""
        
        stream = self.recognizer.create_stream()
        stream.accept_waveform(16000, audio_np)
        
        self.recognizer.decode_stream(stream)
        text = stream.result.text.strip()
        
        # SenseVoice returns tags like <|HAPPY|> or [HAPPY]
        # Let's normalize them to uppercase for easier UI handling
        if "<|" in text:
            import re
            text = re.sub(r'<\s*\|\s*(.*?)\s*\|\s*>', r'[\1]', text).upper()
            
        return text


class LocalSTT:
    def __init__(self):
        self.engines: Dict[str, STTEngine] = {
            "faster-whisper": WhisperEngine(),
            "sherpa-onnx": SherpaOnnxEngine()
        }

    def transcribe(self, audio_bytes: bytes, model_path: str, engine_type: str = "faster-whisper") -> str:
        engine = self.engines.get(engine_type)
        if not engine:
            print(f"[LocalSTT] Error: Unknown engine {engine_type}")
            return ""

        if not engine.load_model(model_path):
            return "[Error: STT Model Failed to Load]"

        try:
            # 1. Decode to PCM via FFmpeg
            audio_np = self._decode_audio(audio_bytes)
            if audio_np is None: return ""

            # 2. Transcribe via Engine
            print(f"[LocalSTT] Transcribing via {engine_type}...")
            return engine.transcribe(audio_np)

        except Exception as e:
            print(f"[LocalSTT] Transcription Error: {e}")
            traceback.print_exc()
            return ""

    def _decode_audio(self, audio_bytes: bytes) -> Optional[np.ndarray]:
        """Decode audio bytes to 16kHz Mono Float32 NP array"""
        try:
            print(f"[LocalSTT] Decoding audio: {len(audio_bytes)} bytes")
            
            # Try webm format first (browser sends audio/webm;codecs=opus)
            cmd = [
                'ffmpeg',
                '-f', 'webm',
                '-i', 'pipe:0',
                '-f', 's16le', '-ac', '1', '-ar', '16000',
                '-nostdin', '-hide_banner', '-loglevel', 'warning',
                'pipe:1'
            ]
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out, err = process.communicate(input=audio_bytes)
            
            if process.returncode != 0 or not out:
                print(f"[LocalSTT] WebM decode failed (code {process.returncode}): {err.decode()[:200] if err else 'no error'}")
                # Try matroska format
                cmd = [
                    'ffmpeg',
                    '-f', 'matroska',
                    '-i', 'pipe:0',
                    '-f', 's16le', '-ac', '1', '-ar', '16000',
                    '-nostdin', '-hide_banner', '-loglevel', 'warning',
                    'pipe:1'
                ]
                process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                out, err = process.communicate(input=audio_bytes)
                
            if process.returncode != 0 or not out:
                print(f"[LocalSTT] Matroska decode failed (code {process.returncode}): {err.decode()[:200] if err else 'no error'}")
                # Final fallback: auto-detect format
                cmd = ['ffmpeg', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', '16000', '-nostdin', '-hide_banner', '-loglevel', 'warning', 'pipe:1']
                process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                out, err = process.communicate(input=audio_bytes)

            if not out:
                print(f"[LocalSTT] All decode attempts failed. FFmpeg error: {err.decode()[:300] if err else 'no output'}")
                return None
            
            audio_np = np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0
            
            # Log audio stats for debugging
            max_val = np.abs(audio_np).max()
            duration_sec = len(audio_np) / 16000
            print(f"[LocalSTT] Decoded: {duration_sec:.2f}s, {len(audio_np)} samples, max amplitude: {max_val:.4f}")
            
            # Check for silence
            if max_val < 0.001:
                print(f"[LocalSTT] WARNING: Audio appears to be silence (max amplitude: {max_val:.4f})")
                return None
            
            # peak normalization
            audio_np = audio_np / max_val
                
            return audio_np
        except Exception as e:
            print(f"[LocalSTT] Decode error: {e}")
            traceback.print_exc()
            return None
