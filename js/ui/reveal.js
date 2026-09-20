import { escapeHtml } from './dom.js';
import { simpleHash } from '../secret.js';
import { getSessionSalt } from './setup.js';

export function revealAssignment(data) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const revealSection = document.getElementById('revealSection');
    revealSection.style.display = 'block';

    const hintPassword = simpleHash('pair-' + data.receiver + '-' + (data.salt || getSessionSalt())).padStart(6, '0').substring(0, 6);

    const safeGiver = escapeHtml(data.giver);
    const safeReceiver = escapeHtml(data.receiver);
    const safeSalt = escapeHtml(data.salt || getSessionSalt());

    // Store raw values for wishlist creation to ensure password consistency
    window.revealData = {
        giver: data.giver,
        salt: data.salt || getSessionSalt()
    };

    revealSection.innerHTML = `
        <div class="title-stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>
        <h1>Your Assignment</h1>
        <div class="reveal-box">
            <h2>Hello, ${safeGiver}</h2>
            <p style="font-size: 15px; margin: 16px 0 4px 0; color: var(--text-secondary);">You are giving a gift to</p>
            <div class="reveal-name">${safeReceiver}</div>
            <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 2px; margin-top: 20px; border: 1px solid var(--border);">
                <p style="color: var(--text-secondary); font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.05em;">Wishlist Password</p>
                <strong style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 1.3rem; color: var(--green-light); letter-spacing: 0.1em;">${hintPassword}</strong>
                <p style="font-size: 12px; color: var(--text-muted); margin: 10px 0 0 0;">
                    Save this—you'll need it to decode ${safeReceiver}'s wishlist if they share one.
                </p>
            </div>
        </div>
        <p style="color: var(--text-muted); margin-top: 20px; font-size: 13px; font-style: italic;">
            Keep this assignment to yourself.
        </p>
        <div class="hints-box">
            <h3>Create Your Wishlist</h3>
            <p style="font-size: 13px;">Share hints with your Secret Santa</p>
            <button class="create-hints-btn" onclick="showCreateHints(window.revealData.giver, window.revealData.salt)">
                Create Wishlist
            </button>
        </div>
        <button onclick="location.href=location.pathname" style="margin-top: 16px;">
            Start New Exchange
        </button>
    `;
}
