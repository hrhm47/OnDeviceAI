import AVFoundation
import ExpoModulesCore
import Speech
import UIKit

struct NativeASRTranscriptPreparationRecord: Record {
  @Field var enabled: Bool = true
  @Field var normalizeForScoring: Bool = true
  @Field var correctionRulesEnabled: Bool = false
}

struct NativeASRPhase3ConfigRecord: Record {
  @Field var configId: String = "native_ios_phase3_default_v1"
  @Field var locale: String = "en-US"
  @Field var language: String = "en"
  @Field var shouldReportPartialResults: Bool = true
  @Field var taskHint: String = "dictation"
  @Field var onDevicePolicy: String = "prefer"
  @Field var contextualStringsEnabled: Bool = false
  @Field var contextualStrings: [String] = []
  @Field var addsPunctuation: Bool = false
  @Field var transcriptPreparation: NativeASRTranscriptPreparationRecord? = nil
}

public class NativeIOSASRModule: Module {
  private var recognizer: SFSpeechRecognizer?
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var currentConfig: NativeASRPhase3ConfigRecord?
  private var lastMetrics: [String: Any?] = [:]
  private var partialTranscriptsCount = 0
  private var hasFinalResult = false
  private var isStopping = false
  private var committedTranscript = ""
  private var activePartialTranscript = ""

  public func definition() -> ModuleDefinition {
    Name("NativeIOSASR")

    Events(
      "NativeIOSASR.onState",
      "NativeIOSASR.onPartialResult",
      "NativeIOSASR.onFinalResult",
      "NativeIOSASR.onError",
      "NativeIOSASR.onMetrics"
    )

    OnDestroy {
      DispatchQueue.main.async {
        self.cancelRecognitionInternal(emitState: false)
      }
    }

    AsyncFunction("requestPermissions") { (promise: Promise) in
      self.requestPermissions(promise: promise)
    }

    AsyncFunction("getCapabilities") { (locale: String) -> [String: Any?] in
      return Self.capabilities(locale: locale)
    }

    AsyncFunction("startRecognition") { (config: NativeASRPhase3ConfigRecord, promise: Promise) in
      DispatchQueue.main.async {
        do {
          try self.startRecognitionInternal(config: config)
          promise.resolve(nil)
        } catch {
          let message = Self.errorMessage(error)
          self.emitError(code: "start_failed", message: message)
          promise.reject("NativeIOSASRStartFailed", message)
        }
      }
    }

    AsyncFunction("stopRecognition") { (promise: Promise) in
      DispatchQueue.main.async {
        self.stopRecognitionInternal()
        promise.resolve(nil)
      }
    }

    AsyncFunction("cancelRecognition") { (promise: Promise) in
      DispatchQueue.main.async {
        self.cancelRecognitionInternal(emitState: true)
        promise.resolve(nil)
      }
    }
  }

  private func requestPermissions(promise: Promise) {
    sendState("requesting_permissions")

    let group = DispatchGroup()

    group.enter()
    SFSpeechRecognizer.requestAuthorization { _ in
      group.leave()
    }

    group.enter()
    AVAudioSession.sharedInstance().requestRecordPermission { _ in
      group.leave()
    }

    group.notify(queue: .main) {
      let status = Self.permissionStatus()
      self.sendState(status["canStartRecognition"] as? Bool == true ? "ready" : "idle")
      promise.resolve(status)
    }
  }

  private static func permissionStatus() -> [String: Any] {
    let microphonePermission: String
    switch AVAudioSession.sharedInstance().recordPermission {
    case .granted:
      microphonePermission = "granted"
    case .denied:
      microphonePermission = "denied"
    case .undetermined:
      microphonePermission = "undetermined"
    @unknown default:
      microphonePermission = "unknown"
    }

    let speechRecognitionPermission: String
    switch SFSpeechRecognizer.authorizationStatus() {
    case .authorized:
      speechRecognitionPermission = "granted"
    case .denied:
      speechRecognitionPermission = "denied"
    case .restricted:
      speechRecognitionPermission = "restricted"
    case .notDetermined:
      speechRecognitionPermission = "notDetermined"
    @unknown default:
      speechRecognitionPermission = "unknown"
    }

    return [
      "microphonePermission": microphonePermission,
      "speechRecognitionPermission": speechRecognitionPermission,
      "canStartRecognition": microphonePermission == "granted" && speechRecognitionPermission == "granted"
    ]
  }

  private static func capabilities(locale: String) -> [String: Any?] {
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale))
    let audioSession = AVAudioSession.sharedInstance()

    return [
      "platform": "ios",
      "requestedLocale": locale,
      "recognizerAvailable": recognizer?.isAvailable ?? false,
      "supportsOnDeviceRecognition": recognizer?.supportsOnDeviceRecognition ?? false,
      "osVersion": UIDevice.current.systemVersion,
      "deviceModel": UIDevice.current.model,
      "currentAudioSessionCategory": audioSession.category.rawValue,
      "currentAudioSessionMode": audioSession.mode.rawValue,
      "sampleRate": audioSession.sampleRate,
      "supportsPartialResultsByConfig": true
    ]
  }

  private func startRecognitionInternal(config: NativeASRPhase3ConfigRecord) throws {
    cancelRecognitionInternal(emitState: false)
    sendState("requesting_permissions")

    let permissions = Self.permissionStatus()
    guard permissions["microphonePermission"] as? String == "granted" else {
      throw NSError(domain: "NativeIOSASR", code: 1, userInfo: [NSLocalizedDescriptionKey: "Microphone permission denied."])
    }
    guard permissions["speechRecognitionPermission"] as? String == "granted" else {
      throw NSError(domain: "NativeIOSASR", code: 2, userInfo: [NSLocalizedDescriptionKey: "Speech recognition permission denied."])
    }

    let locale = Locale(identifier: config.locale)
    guard let recognizer = SFSpeechRecognizer(locale: locale) else {
      throw NSError(domain: "NativeIOSASR", code: 3, userInfo: [NSLocalizedDescriptionKey: "Locale \(config.locale) is not supported by the speech recognizer."])
    }
    guard recognizer.isAvailable else {
      throw NSError(domain: "NativeIOSASR", code: 4, userInfo: [NSLocalizedDescriptionKey: "Speech recognizer is unavailable for \(config.locale)."])
    }

    self.recognizer = recognizer
    self.currentConfig = config
    self.partialTranscriptsCount = 0
    self.hasFinalResult = false
    self.isStopping = false
    self.committedTranscript = ""
    self.activePartialTranscript = ""

    let supportsOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
    let policy = applyOnDevicePolicy(config.onDevicePolicy, supportsOnDeviceRecognition: supportsOnDeviceRecognition)
    if policy.failedRequired {
      lastMetrics = buildMetrics(
        config: config,
        supportsOnDeviceRecognition: supportsOnDeviceRecognition,
        requestedRequiresOnDeviceRecognition: false,
        recognitionPrivacyMode: "unsupported_required_failed",
        addsPunctuationApplied: false
      )
      sendMetrics()
      throw NSError(
        domain: "NativeIOSASR",
        code: 5,
        userInfo: [NSLocalizedDescriptionKey: "On-device recognition is required but not supported for this locale/device."]
      )
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    request.taskHint = .dictation
    request.requiresOnDeviceRecognition = policy.requiresOnDevice

    if config.contextualStringsEnabled && !config.contextualStrings.isEmpty {
      request.contextualStrings = config.contextualStrings
    }

    var addsPunctuationApplied = false
    if #available(iOS 16.0, *) {
      request.addsPunctuation = config.addsPunctuation
      addsPunctuationApplied = config.addsPunctuation
    }

    self.recognitionRequest = request

    try setupAudioSession()

    let engine = AVAudioEngine()
    let inputNode = engine.inputNode
    let format = inputNode.outputFormat(forBus: 0)
    guard format.sampleRate > 0 && format.channelCount > 0 else {
      throw NSError(domain: "NativeIOSASR", code: 6, userInfo: [NSLocalizedDescriptionKey: "Audio input is unavailable or busy."])
    }

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
    }

    engine.prepare()
    self.audioEngine = engine

    lastMetrics = buildMetrics(
      config: config,
      supportsOnDeviceRecognition: supportsOnDeviceRecognition,
      requestedRequiresOnDeviceRecognition: policy.requiresOnDevice,
      recognitionPrivacyMode: policy.privacyMode,
      addsPunctuationApplied: addsPunctuationApplied
    )
    sendMetrics()

    recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
      DispatchQueue.main.async {
        self?.handleRecognitionCallback(result: result, error: error)
      }
    }

    do {
      try engine.start()
    } catch {
      cleanupAudioEngine()
      throw NSError(domain: "NativeIOSASR", code: 7, userInfo: [NSLocalizedDescriptionKey: "Audio engine failed to start: \(Self.errorMessage(error))"])
    }

    sendState("recording")
    sendState("recognizing")
  }

  private func applyOnDevicePolicy(_ policy: String, supportsOnDeviceRecognition: Bool) -> (requiresOnDevice: Bool, privacyMode: String, failedRequired: Bool) {
    switch policy {
    case "require":
      if supportsOnDeviceRecognition {
        return (true, "on_device_required", false)
      }
      return (false, "unsupported_required_failed", true)
    case "allowNetwork":
      return (false, "network_allowed", false)
    case "prefer":
      fallthrough
    default:
      if supportsOnDeviceRecognition {
        return (true, "on_device_preferred", false)
      }
      return (false, "network_allowed_fallback", false)
    }
  }

  private func setupAudioSession() throws {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .default, options: [])
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
  }

  private func handleRecognitionCallback(result: SFSpeechRecognitionResult?, error: Error?) {
    if let result {
      let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
      if !text.isEmpty {
        let accumulatedText = accumulateTranscript(text)
        let event: [String: Any] = [
          "text": accumulatedText,
          "timestampMs": Self.nowMs(),
          "isFinal": result.isFinal
        ]

        if result.isFinal {
          hasFinalResult = true
          sendEvent("NativeIOSASR.onFinalResult", event)
          sendState("completed")
          cleanupRecognition(cancelTask: false)
        } else {
          partialTranscriptsCount += 1
          sendEvent("NativeIOSASR.onPartialResult", event)
        }
      }
    }

    if let error {
      if isStopping && hasFinalResult {
        return
      }

      let message = Self.errorMessage(error)
      if !message.lowercased().contains("cancel") {
        emitError(code: "recognition_failed", message: message)
        sendState("error")
      }
      cleanupRecognition(cancelTask: false)
    }
  }

  private func stopRecognitionInternal() {
    guard recognitionRequest != nil || recognitionTask != nil || audioEngine != nil else {
      sendState("idle")
      return
    }

    isStopping = true
    sendState("stopping")
    recognitionRequest?.endAudio()
    cleanupAudioEngine()
    recognitionTask?.finish()
  }

  private func cancelRecognitionInternal(emitState: Bool) {
    recognitionRequest?.endAudio()
    cleanupRecognition(cancelTask: true)
    if emitState {
      sendState("cancelled")
    }
  }

  private func cleanupRecognition(cancelTask: Bool) {
    cleanupAudioEngine()
    if cancelTask {
      recognitionTask?.cancel()
    }
    recognitionRequest = nil
    recognitionTask = nil
    currentConfig = nil
    isStopping = false
    committedTranscript = ""
    activePartialTranscript = ""
  }

  private func cleanupAudioEngine() {
    if audioEngine?.isRunning == true {
      audioEngine?.stop()
    }
    audioEngine?.inputNode.removeTap(onBus: 0)
    audioEngine?.inputNode.reset()
    audioEngine?.reset()
    audioEngine = nil
  }

  private func buildMetrics(
    config: NativeASRPhase3ConfigRecord,
    supportsOnDeviceRecognition: Bool,
    requestedRequiresOnDeviceRecognition: Bool,
    recognitionPrivacyMode: String,
    addsPunctuationApplied: Bool
  ) -> [String: Any?] {
    let audioSession = AVAudioSession.sharedInstance()
    return [
      "configId": config.configId,
      "locale": config.locale,
      "language": config.language,
      "onDevicePolicy": config.onDevicePolicy,
      "supportsOnDeviceRecognition": supportsOnDeviceRecognition,
      "requestedRequiresOnDeviceRecognition": requestedRequiresOnDeviceRecognition,
      "recognitionPrivacyMode": recognitionPrivacyMode,
      "contextualStringsEnabled": config.contextualStringsEnabled,
      "contextualStringsCount": config.contextualStringsEnabled ? config.contextualStrings.count : 0,
      "addsPunctuation": config.addsPunctuation,
      "addsPunctuationApplied": addsPunctuationApplied,
      "recognizerAvailable": recognizer?.isAvailable ?? false,
      "audioSessionCategory": audioSession.category.rawValue,
      "audioSessionMode": audioSession.mode.rawValue,
      "sampleRate": audioSession.sampleRate
    ]
  }

  private func sendMetrics() {
    sendEvent("NativeIOSASR.onMetrics", lastMetrics.compactMapValues { $0 })
  }

  private func sendState(_ state: String) {
    sendEvent("NativeIOSASR.onState", ["state": state])
  }

  private func emitError(code: String?, message: String) {
    sendEvent("NativeIOSASR.onError", [
      "errorCode": code as Any,
      "errorMessage": message
    ])
  }

  private static func nowMs() -> Double {
    return Date().timeIntervalSince1970 * 1000
  }

  private func accumulateTranscript(_ nextText: String) -> String {
    let text = Self.cleanTranscriptText(nextText)
    if text.isEmpty {
      return currentTranscript()
    }

    if isCompleteSessionTranscript(text) {
      committedTranscript = ""
      activePartialTranscript = text
      return currentTranscript()
    }

    if activePartialTranscript.isEmpty {
      activePartialTranscript = text
      return currentTranscript()
    }

    if Self.isLikelyPartialRevision(previous: activePartialTranscript, next: text) {
      activePartialTranscript = text
      return currentTranscript()
    }

    committedTranscript = Self.joinTranscriptParts(committedTranscript, activePartialTranscript)
    activePartialTranscript = text
    return currentTranscript()
  }

  private func currentTranscript() -> String {
    return Self.joinTranscriptParts(committedTranscript, activePartialTranscript)
  }

  private func isCompleteSessionTranscript(_ text: String) -> Bool {
    let normalizedText = Self.normalizeForComparison(text)
    let normalizedCommitted = Self.normalizeForComparison(committedTranscript)
    let normalizedCurrent = Self.normalizeForComparison(currentTranscript())

    return (
      (!normalizedCommitted.isEmpty && Self.startsWithTranscript(normalizedText, prefix: normalizedCommitted)) ||
      (!normalizedCurrent.isEmpty && Self.startsWithTranscript(normalizedText, prefix: normalizedCurrent))
    )
  }

  private static func isLikelyPartialRevision(previous: String, next: String) -> Bool {
    let normalizedPrevious = normalizeForComparison(previous)
    let normalizedNext = normalizeForComparison(next)

    if normalizedPrevious.isEmpty || normalizedNext.isEmpty {
      return false
    }

    if startsWithTranscript(normalizedNext, prefix: normalizedPrevious) ||
      startsWithTranscript(normalizedPrevious, prefix: normalizedNext) {
      return true
    }

    let previousTokens = Set(normalizedPrevious.split(separator: " ").map(String.init))
    let nextTokens = Set(normalizedNext.split(separator: " ").map(String.init))
    let sharedCount = previousTokens.intersection(nextTokens).count
    let smallerTokenCount = min(previousTokens.count, nextTokens.count)

    if smallerTokenCount == 0 {
      return false
    }

    let overlapRatio = Double(sharedCount) / Double(smallerTokenCount)
    let requiredOverlap = smallerTokenCount >= 4 ? 0.5 : 0.75
    return overlapRatio >= requiredOverlap
  }

  private static func startsWithTranscript(_ text: String, prefix: String) -> Bool {
    return text == prefix || text.hasPrefix("\(prefix) ")
  }

  private static func normalizeForComparison(_ text: String) -> String {
    let punctuation = CharacterSet(charactersIn: ".,!?;:()[]{}\"'`")
    return cleanTranscriptText(text)
      .lowercased()
      .components(separatedBy: punctuation)
      .joined()
      .components(separatedBy: .whitespacesAndNewlines)
      .filter { !$0.isEmpty }
      .joined(separator: " ")
  }

  private static func cleanTranscriptText(_ text: String) -> String {
    return text
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .components(separatedBy: .whitespacesAndNewlines)
      .filter { !$0.isEmpty }
      .joined(separator: " ")
  }

  private static func joinTranscriptParts(_ first: String, _ second: String) -> String {
    let left = cleanTranscriptText(first)
    let right = cleanTranscriptText(second)

    if left.isEmpty {
      return right
    }
    if right.isEmpty {
      return left
    }
    return "\(left) \(right)"
  }

  private static func errorMessage(_ error: Error) -> String {
    let nsError = error as NSError
    if let description = nsError.userInfo[NSLocalizedDescriptionKey] as? String, !description.isEmpty {
      return description
    }
    return error.localizedDescription
  }
}
