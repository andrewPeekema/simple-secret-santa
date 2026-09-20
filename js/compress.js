// ============================================
// COMPRESSION SUPPORT DETECTION
// ============================================

// Check if browser supports CompressionStream with deflate-raw
const supportsCompression = (async () => {
    try {
        if (typeof CompressionStream === 'undefined') return false;
        // Test that deflate-raw specifically works
        const testStream = new CompressionStream('deflate-raw');
        return true;
    } catch (e) {
        return false;
    }
})();

// Format header bytes
export const FORMAT_UNCOMPRESSED = 0x00;
export const FORMAT_DEFLATE_RAW = 0x01;

// ============================================
// COMPRESSION FUNCTIONS
// ============================================

export async function compressBytes(data) {
    const hasCompression = await supportsCompression;
    if (!hasCompression) {
        // Return uncompressed with header
        const result = new Uint8Array(data.length + 1);
        result[0] = FORMAT_UNCOMPRESSED;
        result.set(data, 1);
        return result;
    }

    try {
        const stream = new CompressionStream('deflate-raw');
        const writer = stream.writable.getWriter();
        // writer.write/close are deliberately un-awaited, carried over
        // verbatim from the pre-split code. A rejection here therefore
        // escapes this try/catch entirely — in Node it terminates the
        // process, in a browser it is only a console error — rather than
        // being caught below. The same pattern appears in decompressBytes
        // below; that is the one reachable from ordinary wrong-password use
        // (this function is only ever called with the owner's own correct
        // password, via encodeHints in js/format.js).
        writer.write(data);
        writer.close();

        const chunks = [];
        const reader = stream.readable.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // Calculate total length
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const compressed = new Uint8Array(totalLength + 1);
        compressed[0] = FORMAT_DEFLATE_RAW;

        let offset = 1;
        for (const chunk of chunks) {
            compressed.set(chunk, offset);
            offset += chunk.length;
        }

        // Only use compression if it actually saves space
        if (compressed.length < data.length + 1) {
            return compressed;
        } else {
            const result = new Uint8Array(data.length + 1);
            result[0] = FORMAT_UNCOMPRESSED;
            result.set(data, 1);
            return result;
        }
    } catch (e) {
        // Fallback to uncompressed
        const result = new Uint8Array(data.length + 1);
        result[0] = FORMAT_UNCOMPRESSED;
        result.set(data, 1);
        return result;
    }
}

export async function decompressBytes(data) {
    if (data.length === 0) return new Uint8Array(0);

    const format = data[0];
    const payload = data.slice(1);

    if (format === FORMAT_UNCOMPRESSED) {
        return payload;
    }

    if (format === FORMAT_DEFLATE_RAW) {
        try {
            const stream = new DecompressionStream('deflate-raw');
            const writer = stream.writable.getWriter();
            // writer.write/close are deliberately un-awaited (see the same
            // pattern in compressBytes above). Here it is reachable from
            // ordinary mistyped passwords, not just corrupt data: a wrong
            // guess whose first character happens to match still leaves the
            // format byte at 0x01, so garbage payload reaches
            // DecompressionStream. The function still correctly returns
            // null and the UI still shows "Invalid password", but the
            // un-awaited rejection surfaces separately — in Node it
            // terminates the process, in a browser it is a console error
            // only. The deliberate five-character retry in
            // js/ui/wishlist.js doubles the exposure. Anyone adding a
            // wrong-password test through the UI layer must fix the await
            // here first.
            writer.write(payload);
            writer.close();

            const chunks = [];
            const reader = stream.readable.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            return result;
        } catch (e) {
            console.error('Decompression failed:', e);
            return null;
        }
    }

    // Unknown format - try treating entire data as legacy uncompressed
    return data;
}
