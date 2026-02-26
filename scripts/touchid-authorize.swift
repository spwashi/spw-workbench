#!/usr/bin/env swift
//
// touchid-authorize.swift
// Prompts for Touch ID (or device passcode fallback) and exits 0 on success, 1 on failure.
// Used by the pre-commit hook to require biometric sign-off on every commit.
//

import Foundation
import LocalAuthentication

let context = LAContext()
var error: NSError?

let reason = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "Authorize git commit"

guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
    fputs("⚠  Touch ID / biometric auth not available: \(error?.localizedDescription ?? "unknown")\n", stderr)
    // Fallback: if biometrics aren't available, exit 0 so the hook doesn't permanently block
    // on machines without Touch ID (e.g. desktops, CI). The hook itself can add extra logic.
    exit(2)
}

let semaphore = DispatchSemaphore(value: 0)
var authResult: Bool = false

context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
    if success {
        authResult = true
    } else {
        fputs("✗ Authorization failed: \(authError?.localizedDescription ?? "cancelled")\n", stderr)
    }
    semaphore.signal()
}

semaphore.wait()
exit(authResult ? 0 : 1)
