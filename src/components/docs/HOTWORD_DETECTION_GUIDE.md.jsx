# Hotword Detection Guide

Module: components/voice/hotword.js
- startHotword(): begins energy-threshold monitoring via WebAudio AnalyserNode.
- stopHotword(): stops capture and timers.
- onHotwordDetected(cb): subscribe to detections. Also triggers desktopBridge.startMic().

Reliability: false positive backoff, CPU guard via event loop lag heuristic.
Telemetry: `hotwordDetected`.