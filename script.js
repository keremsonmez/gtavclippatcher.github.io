// State
let selectedFiles = [];
let patchedFiles = []; // Store patched files for ZIP export

// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileText = document.getElementById('fileText');
const fileList = document.getElementById('fileList');
const patternsTextarea = document.getElementById('patterns');
const startBtn = document.getElementById('startBtn');
const progressBar = document.getElementById('progressBar');
const logElement = document.getElementById('log');
const placeholderInput = document.getElementById('placeholder');
const caseInsensitiveCheckbox = document.getElementById('caseInsensitive');

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
startBtn.addEventListener('click', startPatching);

// Drag and drop
document.querySelector('.file-label').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--accent-hover)';
});

document.querySelector('.file-label').addEventListener('dragleave', (e) => {
    e.currentTarget.style.borderColor = 'var(--accent-primary)';
});

document.querySelector('.file-label').addEventListener('drop', (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = 'var(--accent-primary)';
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.clip'));
    if (files.length > 0) {
        selectedFiles = files;
        updateFileList();
    }
});

// Functions
function handleFileSelect(event) {
    selectedFiles = Array.from(event.target.files);
    updateFileList();
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileText.textContent = 'Choose .clip files or drag & drop';
        fileList.innerHTML = '';
        return;
    }

    fileText.textContent = `${selectedFiles.length} file(s) selected`;
    fileList.innerHTML = selectedFiles.map(file =>
        `<div class="file-item">${file.name} (${formatFileSize(file.size)})</div>`
    ).join('');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
}

function setProgress(percent) {
    progressBar.style.width = percent + '%';
}

async function startPatching() {
    // Validation
    if (selectedFiles.length === 0) {
        alert('Please select at least one .clip file.');
        return;
    }

    const patterns = patternsTextarea.value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

    if (patterns.length === 0) {
        alert('Please enter at least one pattern.');
        return;
    }

    // Get options
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const placeholder = placeholderInput.value || 'REMOVED';
    const caseInsensitive = caseInsensitiveCheckbox.checked;

    // Disable button
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Processing...';
    setProgress(0);

    // Clear log and patched files
    logElement.innerHTML = '';
    patchedFiles = [];
    log(`Found ${selectedFiles.length} clip file(s)`, 'info');
    log(`Patterns: ${patterns.join(', ')}`, 'info');
    log(`Mode: ${mode}`, 'info');
    log('─'.repeat(40), 'info');

    let totalFilesPatched = 0;
    let totalPatternsPatched = 0;

    // Process files
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = ((i + 1) / selectedFiles.length) * 100;
        setProgress(progress);

        try {
            const result = await processFile(file, patterns, mode, placeholder, caseInsensitive);

            if (result.patchCount > 0) {
                totalFilesPatched++;
                totalPatternsPatched += result.patchCount;
                log(`✓ ${file.name}: ${result.patchCount} pattern(s) patched`, 'success');
                result.matches.forEach(match => {
                    log(`  → '${match.text}' at offset ${match.offset}`, 'info');
                });
            } else {
                log(`○ ${file.name}: no matches`, 'info');
            }
        } catch (error) {
            log(`❌ ${file.name}: ${error.message}`, 'error');
        }
    }

    // Summary
    log('─'.repeat(40), 'info');
    log(`✅ Done! Files patched: ${totalFilesPatched}/${selectedFiles.length}`, 'success');
    log(`   Total patterns patched: ${totalPatternsPatched}`, 'success');

    // Download files
    if (patchedFiles.length > 0) {
        if (patchedFiles.length === 1) {
            // Single file - download directly
            log('Downloading patched file...', 'info');
            const { blob, filename } = patchedFiles[0];
            downloadFile(blob, filename);
        } else {
            // Multiple files - create ZIP
            log('Creating ZIP archive...', 'info');
            await createAndDownloadZip(patchedFiles);
            log('✓ ZIP archive downloaded!', 'success');
        }
    }

    // Reset button
    startBtn.disabled = false;
    startBtn.textContent = '🚀 Start Patching';
    setProgress(100);

    // Show completion message
    const downloadMsg = patchedFiles.length > 1
        ? '\n\nPatched files have been downloaded as a ZIP archive.'
        : patchedFiles.length === 1
            ? '\n\nPatched file has been downloaded.'
            : '';
    alert(`Patching complete!\n\nFiles patched: ${totalFilesPatched}/${selectedFiles.length}\nPatterns patched: ${totalPatternsPatched}${downloadMsg}`);
}

async function processFile(file, patterns, mode, placeholder, caseInsensitive) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Find all matches
    const allMatches = [];
    for (const pattern of patterns) {
        const matches = findMatches(data, pattern, caseInsensitive);
        allMatches.push(...matches.map(m => ({ ...m, pattern })));
    }

    // Sort matches by position (descending) to patch from end to start
    allMatches.sort((a, b) => b.offset - a.offset);

    if (allMatches.length === 0) {
        return { patchCount: 0, matches: [] };
    }

    // Apply patches
    const modifiedData = new Uint8Array(data);
    for (const match of allMatches) {
        let replacement;
        if (mode === 'null') {
            replacement = new Uint8Array(match.length).fill(0);
        } else {
            // Placeholder mode
            const placeholderBytes = new TextEncoder().encode(placeholder);
            replacement = new Uint8Array(match.length);
            for (let i = 0; i < match.length; i++) {
                replacement[i] = placeholderBytes[i % placeholderBytes.length] || 0;
            }
        }

        modifiedData.set(replacement, match.offset);
    }

    // Store patched file for later download
    const blob = new Blob([modifiedData], { type: 'application/octet-stream' });
    patchedFiles.push({
        blob: blob,
        filename: `patched_${file.name}`
    });

    return {
        patchCount: allMatches.length,
        matches: allMatches.map(m => ({ text: m.text, offset: m.offset }))
    };
}

function findMatches(data, pattern, caseInsensitive) {
    const matches = [];

    // Check if pattern contains wildcards
    const hasWildcards = pattern.includes('*') || pattern.includes('?');

    if (hasWildcards) {
        // Wildcard matching
        const regex = wildcardToRegex(pattern, caseInsensitive);
        const asciiStrings = extractAsciiStrings(data);

        for (const { offset, text } of asciiStrings) {
            if (regex.test(text)) {
                matches.push({
                    offset,
                    text,
                    length: text.length
                });
            }
        }
    } else {
        // Exact matching
        const searchBytes = new TextEncoder().encode(pattern);
        const searchLower = caseInsensitive ? new TextEncoder().encode(pattern.toLowerCase()) : null;
        const searchUpper = caseInsensitive ? new TextEncoder().encode(pattern.toUpperCase()) : null;

        const candidates = [searchBytes];
        if (caseInsensitive) {
            if (searchLower) candidates.push(searchLower);
            if (searchUpper) candidates.push(searchUpper);
        }

        for (const candidate of candidates) {
            let pos = 0;
            while (pos < data.length) {
                const index = findBytes(data, candidate, pos);
                if (index === -1) break;

                const matchedText = new TextDecoder().decode(data.slice(index, index + candidate.length));
                matches.push({
                    offset: index,
                    text: matchedText,
                    length: candidate.length
                });
                pos = index + 1;
            }
        }
    }

    return matches;
}

function extractAsciiStrings(data) {
    const strings = [];
    let currentString = '';
    let currentStart = 0;

    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        // ASCII printable characters (32-126)
        if (byte >= 32 && byte <= 126) {
            if (currentString === '') {
                currentStart = i;
            }
            currentString += String.fromCharCode(byte);
        } else {
            if (currentString.length > 0) {
                strings.push({ offset: currentStart, text: currentString });
                currentString = '';
            }
        }
    }

    if (currentString.length > 0) {
        strings.push({ offset: currentStart, text: currentString });
    }

    return strings;
}

function wildcardToRegex(pattern, caseInsensitive) {
    // Escape special regex characters except * and ?
    let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    // Convert wildcards to regex
    regexPattern = regexPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    // Add anchors
    regexPattern = '^' + regexPattern + '$';

    const flags = caseInsensitive ? 'i' : '';
    return new RegExp(regexPattern, flags);
}

function findBytes(haystack, needle, startPos = 0) {
    for (let i = startPos; i <= haystack.length - needle.length; i++) {
        let found = true;
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function createAndDownloadZip(files) {
    // Load JSZip from CDN if not already loaded
    if (typeof JSZip === 'undefined') {
        await loadJSZip();
    }

    const zip = new JSZip();

    // Add all files to the ZIP
    for (const { blob, filename } of files) {
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(filename, arrayBuffer);
    }

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Download ZIP
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadFile(zipBlob, `patched_clips_${timestamp}.zip`);
}

function loadJSZip() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Initial log message
log('✓ Ready to patch clips!', 'success');
