import sys
import os
import argparse
import base64
import io
import numpy as np
import soundfile as sf
# Import pipeline lazily to avoid heavy load on boot
def get_pipeline(lang):
    from kokoro import KPipeline
    return KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')

def main():
    parser = argparse.ArgumentParser(description="Kokoro TTS CLI for subprocess use")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--voice", default="af_heart", help="Voice ID")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed")
    parser.add_argument("--output", required=True, help="Output WAV file path")
    
    args = parser.parse_args()
    
    # Determine language from voice prefix
    lang = 'a'
    if args.voice.startswith('b'): lang = 'b'
    
    pipeline = get_pipeline(lang)
    
    generator = pipeline(args.text, voice=args.voice, speed=args.speed)
    
    full_audio = []
    for _, _, audio in generator:
        full_audio.append(audio)
    
    if full_audio:
        audio_data = np.concatenate(full_audio)
        sf.write(args.output, audio_data, 24000, format='WAV')
        print(f"SUCCESS: Synthesized to {args.output}")
    else:
        print("ERROR: No audio generated")
        sys.exit(1)

if __name__ == "__main__":
    main()
