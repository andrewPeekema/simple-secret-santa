// Text-context only: escapes via textContent/innerHTML (&, <, >) but does not
// escape quotes, so its output is not safe to interpolate into an
// HTML-attribute value unless the source text is known never to contain a
// quote character.
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


export async function copyToClipboard(text, button) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        const originalText = button.textContent;
        const originalBg = button.style.background;
        button.textContent = 'Copied!';
        button.style.background = '#38a169';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = originalBg || '#48bb78';
        }, 2000);
    } catch (err) {
        alert('Failed to copy. Please select and copy manually.');
    }
}

export function showError(message) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const revealSection = document.getElementById('revealSection');
    revealSection.style.display = 'block';

    revealSection.innerHTML = `
        <div class="title-stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>
        <h1>Invalid Link</h1>
        <div class="error">${escapeHtml(message)}</div>
        <button onclick="location.href=location.pathname" style="margin-top: 24px;">
            Start New Exchange
        </button>
    `;
}
