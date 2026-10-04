// Text-context only: escapes via textContent/innerHTML (&, <, >) but does not
// escape quotes, so its output is not safe to interpolate into an
// HTML-attribute value unless the source text is known never to contain a
// quote character.
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// The row of five stars at the top of every screen. index.html carries the
// same markup statically for the setup screen.
export const STARS_HTML = `
        <div class="stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>`;

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

        // A press while "✓ Copied" is already showing has copied again; leave
        // the pending restore alone so the button gets its own label back.
        if (button.classList.contains('is-copied')) return;

        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        button.classList.add('is-copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('is-copied');
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
        ${STARS_HTML}
        <h1>Invalid link</h1>
        <div class="tint tint--danger note mt-5">${escapeHtml(message)}</div>
        <p class="nav"><button class="link" onclick="location.href=location.pathname">Start a new exchange</button></p>
    `;
}
