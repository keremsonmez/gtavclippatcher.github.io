// English Translation

const en = {
    title: "🎬 Rockstar Editor Clip Patcher",
    subtitle: "Pattern Patcher for GTA V Clips created by WaydeTheKiwi, developed by Quadria",
    clipLocation: "You can access your clips from the following location:",
    clipPath: "YOURPC\\AppData\\Local\\Rockstar Games\\GTA V\\videos\\clip",
    fileLabel: "📁 Select Clip Files",
    fileText: "Choose .clip files or drag & drop",
    patternsLabel: "📝 Patterns (one per line)",
    patternsHelper: "Please list the names of the crashed resources here one after another",
    patternsPlaceholder: `Enter patterns to find and replace
Example:
qua_delperroproject_venny
dpemotes
asea`,
    optionsLabel: "⚙️ Options",
    modeLabel: "Mode:",
    modeNull: "Null Bytes",
    modePlaceholder: "Placeholder",
    caseInsensitive: "Case Insensitive",
    placeholderLabel: "Placeholder:",
    startButton: "🚀 Start Patching",
    logLabel: "📋 Log",

    // Messages
    filesSelected: "file(s) selected",
    noFilesError: "Please select at least one .clip file.",
    noPatternsError: "Please enter at least one pattern.",
    processing: "⏳ Processing...",
    found: "Found",
    clipFiles: "clip file(s)",
    patterns: "Patterns:",
    mode: "Mode:",
    done: "✅ Done! Files patched:",
    totalPatterns: "   Total patterns patched:",
    noMatches: "no matches",
    patternsPatched: "pattern(s) patched",
    ready: "✓ Ready to patch clips!",
    completionMessage: (patched, total, patterns) =>
        `Patching complete!\n\nFiles patched: ${patched}/${total}\nPatterns patched: ${patterns}\n\nModified files will be downloaded automatically.`,
    at: "at",
    offset: "offset"
};
